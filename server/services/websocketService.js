const WebSocket = require("ws");
const { clerkClient } = require("@clerk/express");
const { verifyToken } = require("@clerk/backend");
const InterviewSession = require("../models/InterviewSession");
const ResumeProfile = require("../models/ResumeProfile");
const { generateInterviewPlan } = require("../agents/interviewPlanAgent");
const { generateDsaQuestions } = require("../agents/dsaAgent");
const { generateSystemDesignQuestions } = require("../agents/systemDesignAgent");
const { generateHrQuestions } = require("../agents/hrAgent");
const { generateFinalReport } = require("../agents/reportAgent");
const { correctTranscription } = require("../agents/sttCorrectionAgent");
const { evaluateDsaTurn } = require("../agents/dsaInterviewAgent");
const { evaluateHrTurn } = require("../agents/hrInterviewAgent");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const log = require("../utils/logger");

// Map session_id -> { ws, state, pendingNext }
// pendingNext: what to do after speech_done arrives ("ask_question" | "generate_report" | null)
const activeSessions = new Map();

function sendToClient(ws, payload) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (e) {
    log.error("WS", `Failed to send: ${e.message}`);
  }
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

const evalSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().describe("1-2 sentence spoken feedback, natural and conversational"),
  needs_followup: z.boolean(),
  followup_question: z.string().nullable()
});

async function evaluateAnswer(questionTextOrObj, answer, transcriptContext, allowFollowup) {
  const systemInstructions = allowFollowup 
    ? `You are a senior technical interviewer in a live conversation.
Keep feedback brief and spoken-aloud style — 1-2 sentences.
If the candidate's answer is incomplete or vague, you MAY ask a follow-up question to probe deeper.
However, NEVER ask more than ONE follow-up per main question. If you have already asked a follow-up, provide concluding feedback and set needs_followup to false.`
    : `You are a senior technical interviewer in a live conversation.
Keep feedback brief and spoken-aloud style — 1-2 sentences.
CRITICAL INSTRUCTION: You have ALREADY asked a follow-up for this topic. You are STRICTLY FORBIDDEN from asking any more questions.
Provide ONLY a concluding statement or final feedback, and set needs_followup to false. Do NOT ask for elaboration or clarification.`;

  const questionString = typeof questionTextOrObj === "string" 
      ? questionTextOrObj 
      : `${questionTextOrObj.title || "Question"}:\n${questionTextOrObj.description || questionTextOrObj.question_text}`;

  const evalPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemInstructions],
    ["user", `CONVERSATION SO FAR:\n{context}\n\nCURRENT QUESTION: {question}\nCANDIDATE'S ANSWER: {answer}\n\nEvaluate this answer.`]
  ]);
  const llm = getLLM({ temperature: 0.3 });
  const chain = evalPrompt.pipe(llm.withStructuredOutput(evalSchema));
  return chain.invoke({ context: transcriptContext || "First question.", question: questionString, answer });
}

// ─── Session Initialization ───────────────────────────────────────────────────

async function initSession(ws, sessionId, authUserId) {
  try {
    const session = await InterviewSession.findById(sessionId);
    if (!session) return sendToClient(ws, { type: "error", message: "Session not found." });

    if (session.userId !== authUserId) {
      log.warn("WS", `Access denied: user ${authUserId} tried to access session ${sessionId} owned by ${session.userId}`);
      return sendToClient(ws, { type: "error", message: "Access denied." });
    }

    let resumeProfileObj = null;
    if (session.resume_id) {
      const resumeProfile = await ResumeProfile.findById(session.resume_id);
      if (resumeProfile) resumeProfileObj = resumeProfile.toObject();
    }

    const isResuming = session.transcript && session.transcript.length > 0;

    // Build initial in-memory state
    const state = {
      session_id: sessionId,
      resume_profile: resumeProfileObj,
      questions: [],
      current_q_index: session.current_q_index || 0,
      follow_up_count: session.follow_up_count || 0,
      transcript: session.transcript || [],
      phase: session.phase || "greeting",
      round_type: session.round_type || "resume"
    };

    activeSessions.set(sessionId, { ws, state, pendingNext: null });

    log.success("WS", `✅ Session ${sessionId} initialized. Resuming: ${isResuming}`);
    sendToClient(ws, { type: "session_ready", session_id: sessionId });

    // ── Route question generation by round_type ───────────────────────────────
    const roundType = session.round_type || "resume";
    const context = session.context || {};
    log.info("WS", `🎯 Round type: ${roundType.toUpperCase()}`);

    let questions = [];
    let roundLabel;

    // --- Extension Question Persistence ---
    // If questions were already extracted/assigned to this session (e.g. via extension), use them.
    if (session.questions && session.questions.length > 0) {
      log.info("WS", `💾 Session ${sessionId} already has ${session.questions.length} questions. Bypassing generation.`);
      const populated = await InterviewSession.findById(sessionId).populate("questions.question_id");
      questions = populated.questions.map(q => q.question_id || q.text);
      roundLabel = roundType === "dsa" ? "DSA Round" : "Technical Round";
    } else {
      try {
        switch (roundType) {
          case "dsa":
            roundLabel = "DSA Round";
            questions = await generateDsaQuestions(resumeProfileObj || {}, context);
            break;

          case "system_design":
            roundLabel = "System Design Round";
            questions = await generateSystemDesignQuestions(resumeProfileObj || {}, context, 10);
            break;

          case "hr":
            roundLabel = "HR Round";
            questions = await generateHrQuestions(resumeProfileObj || {}, context, 10);
            break;

          case "resume":
          default:
            roundLabel = "Resume-Based Round";
            questions = await generateInterviewPlan(resumeProfileObj || {}, 10, context);
            break;
        }
      } catch (e) {
        log.error("WS", `Failed to generate questions: ${e.message}`);
        questions = [
          "Tell me about yourself and your technical background.",
          "What are your strongest technical skills and why?",
          "Describe a challenging project you worked on recently.",
          "How do you approach debugging a complex problem?",
          "What's your understanding of RESTful API design principles?"
        ];
      }
    }

    state.questions = questions;

    // ── Resume or Fresh Start ───────────────────────────────────────────────
    if (isResuming) {
       log.info("WS", `🔄 Resuming session at Q${state.current_q_index + 1}/${questions.length}`);
       const currentQObj = questions[state.current_q_index];
       
       sendToClient(ws, {
         type: "session_restored",
         transcript: state.transcript,
         phase: state.phase,
         session_id: sessionId,
         progress: { current: state.current_q_index + 1, total: questions.length },
         question: currentQObj
       });

       const welcomeBackMsg = "Welcome back! Let's continue from where we left off. Please go ahead.";
       sendToClient(ws, {
         type: "ai_message",
         text: welcomeBackMsg,
         phase: state.phase,
         session_id: sessionId,
         progress: { current: state.current_q_index + 1, total: questions.length },
         question: currentQObj
       });
    } else {
       const questionsToSave = questions.map(q => {
         if (q && q._id) return { question_id: q._id };
         return { text: q };
       });
       await InterviewSession.findByIdAndUpdate(sessionId, { questions: questionsToSave, phase: "questioning" });

       const candidateName = resumeProfileObj?.candidate_info?.name || "there";
       const firstQuestionObj = questions[0];
       const firstQuestionText = firstQuestionObj 
         ? (firstQuestionObj.title || firstQuestionObj.question_text || (typeof firstQuestionObj === 'string' ? firstQuestionObj : "the first problem"))
         : "your first question";

       const greetingByRound = {
         dsa: `Hello ${candidateName}! Welcome to the DSA round of your CrackIt interview. I'll ask you 3 coding problems — one easy, one medium, and one hard. Think out loud as you work through them. Let's begin! Here's your first problem: ${firstQuestionText}. Please tell me your approach before you code.`,
         system_design: `Hello ${candidateName}! Welcome to your System Design interview. I'll ask you ${questions.length} design questions to assess how you think about large-scale systems. Take your time and walk me through your reasoning. Let's start! Here's your first question: ${firstQuestionText}`,
         hr: `Hello ${candidateName}! Welcome to your HR and Behavioral interview. Before we dive into the specific questions, I'd love to start by getting to know you a bit better. Could you tell me a little about yourself and your background?`,
         resume: `Hello ${candidateName}! Welcome to your CrackIt technical interview. I'm your AI interviewer today. We'll go through ${questions.length} questions covering your technical background and projects. Take your time with each answer. Let's begin! Here's your first question: ${firstQuestionText}`
       };

       const combinedOpening = greetingByRound[roundType] || greetingByRound.resume;

       state.transcript.push({ role: "interviewer", text: combinedOpening, question_index: 0 });
       state.phase = "questioning";
       state.current_q_index = 0;

       await InterviewSession.findByIdAndUpdate(sessionId, {
         phase: "questioning",
         current_q_index: 0,
         $push: { transcript: { role: "interviewer", text: combinedOpening, question_index: 0 } }
       });

       sendToClient(ws, {
         type: "ai_message",
         text: combinedOpening,
         phase: "questioning",
         session_id: sessionId,
         progress: { current: 1, total: questions.length },
         question: firstQuestionObj
       });
    }

  } catch (e) {
    log.error("WS", `Session init failed: ${e.message}`);
    log.error("WS", e.stack);
    sendToClient(ws, { type: "error", message: "Failed to initialize session." });
  }
}

// ─── Ask Next Question ────────────────────────────────────────────────────────

function askQuestion(ws, sessionId, feedbackToPrefix) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const { state } = session;
  const idx = state.current_q_index;
  const questionObj = state.questions[idx];
  const total = state.questions.length;

  if (!questionObj) return;

  const questionText = questionObj.title || questionObj.question_text || questionObj;
  const logText = typeof questionObj === "string" ? questionObj : (questionObj.title || questionObj.question_text || "Coding Question");

  log.info("WS", `❓ Q${idx + 1}/${total}: "${logText.substring(0, 60)}..."`);

  // If there's feedback to prefix (from evaluation), combine into one message
  // This avoids the multi-turn Gemini silence bug
  let fullText;
  if (feedbackToPrefix) {
    fullText = `${feedbackToPrefix} Moving on to question ${idx + 1} of ${total}: ${questionText}`;
  } else {
    fullText = `Question ${idx + 1} of ${total}: ${questionText}`;
  }

  state.transcript.push({ role: "interviewer", text: fullText, question_index: idx });
  state.phase = "questioning";

  InterviewSession.findByIdAndUpdate(sessionId, {
    phase: "questioning",
    current_q_index: idx,
    $push: { transcript: { role: "interviewer", text: fullText, question_index: idx } }
  }).catch(() => {});

  sendToClient(ws, {
    type: "ai_message",
    text: fullText,
    phase: "questioning",
    session_id: sessionId,
    progress: { current: idx + 1, total },
    question: questionObj
  });
}

// ─── Helper: Set pendingNext with safety fallback ────────────────────────────
// If client's speech_done never arrives (e.g. Gemini TTS fails),
// this executes the pending action after 10 seconds.
function setPendingNextWithFallback(sessionId, pendingValue, ws) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  sess.pendingNext = pendingValue;

  setTimeout(async () => {
    const s = activeSessions.get(sessionId);
    if (!s || s.pendingNext !== pendingValue) return; // Already handled normally
    log.warn("WS", `⏱️  Fallback fired for pendingNext (speech_done never arrived)`);
    s.pendingNext = null;
    if (pendingValue === "ask_question") {
      askQuestion(ws, sessionId);
    } else if (pendingValue === "generate_report") {
      await generateReport(ws, sessionId);
    } else if (typeof pendingValue === "object" && pendingValue.type === "send_message") {
      sendToClient(ws, pendingValue.payload);
    }
  }, 10000); // 10 second safety window
}

// ─── Handle User Answer ───────────────────────────────────────────────────────

// Detect if the user is making a meta-request (repeat/clarify) rather than answering the question
function isMetaRequest(text) {
  const lower = text.toLowerCase().trim();
  const metaPatterns = [
    /^(can you |please |could you )?(repeat|say again|repeat that|say that again)/,
    /^(i didn't (hear|understand)|didn't catch that)/,
    /^(what (did you say|was the question)|can you (clarify|explain the question))/,
    /^(hello|hi|hey)[\s,!.]*$/,
    /^(what|huh|sorry|pardon)[\s?!.]*$/
  ];
  // Avoid catching short words like "next" or "skip" as meta-requests
  const isShortWord = lower.length < 4; 
  return metaPatterns.some(p => p.test(lower)) || isShortWord;
}

// Detect if the user explicitly wants to skip or move to the next question
function isSkipRequest(text) {
  const lower = text.toLowerCase().trim();
  const skipPatterns = [
    /^(can we |please |could we )?(move on|next question|skip|skip this|move to (the )?next)/,
    /^next[\s,!.]*$/,
    /^skip[\s,!.]*$/
  ];
  return skipPatterns.some(p => p.test(lower));
}

async function handleUserAnswer(ws, sessionId, answerText, codeContent = null, isFinalSubmission = false, language = null) {
  const session = activeSessions.get(sessionId);
  if (!session) return sendToClient(ws, { type: "error", message: "Session not active." });

  const { state } = session;
  const idx = state.current_q_index;
  const question = state.questions[idx];

  log.info("WS", `🎤 Answer for Q${idx + 1} (raw): "${answerText.substring(0, 80)}..."`);

  // ── Detect meta-requests (repeat/clarify) ──────────────────────────────────
  if (isMetaRequest(answerText)) {
    log.info("WS", `↩️  Meta-request detected: "${answerText}" — repeating question`);
    const repeatMsgText = typeof question === "string" ? question : (question.title || question.question_text || "the coding problem");
    const repeatMsg = `Of course! Here's the question again: ${repeatMsgText}`;

    state.transcript.push({ role: "interviewer", text: repeatMsg, question_index: idx });
    await InterviewSession.findByIdAndUpdate(sessionId, {
      $push: { transcript: { role: "interviewer", text: repeatMsg, question_index: idx } }
    });

    sendToClient(ws, {
      type: "ai_message",
      text: repeatMsg,
      phase: "questioning",
      session_id: sessionId,
      progress: { current: idx + 1, total: state.questions.length },
      question
    });
    return; // Don't evaluate, don't advance — stay on same question
  }

  state.phase = "evaluating";

  // Step 1: Correct STT transcription errors
  let correctedAnswer = answerText;
  try {
    correctedAnswer = await correctTranscription(answerText);
    if (correctedAnswer !== answerText) {
      sendToClient(ws, { type: "answer_corrected", original: answerText, corrected: correctedAnswer });
    }
  } catch (e) {
    log.warn("WS", `STT correction skipped: ${e.message}`);
  }

  // Add to transcript
  const answerEntry = { 
    role: "candidate", 
    text: correctedAnswer, 
    code: codeContent,
    language: language,
    question_index: idx 
  };
  state.transcript.push(answerEntry);

  await InterviewSession.findByIdAndUpdate(sessionId, {
    $push: { transcript: answerEntry }
  });

  // Evaluate using the corrected answer
  try {
    const currentQuestionHistory = state.transcript
      .filter(t => t.question_index === idx)
      .slice(0, -1) // Exclude the current answer we just pushed
      .map(t => ({ role: t.role === "candidate" ? "user" : "assistant", content: t.text }));

    const transcriptContext = currentQuestionHistory.map(t => `${t.role.toUpperCase()}: ${t.content}`).join("\n");

    const isDsaRound = state.round_type === "dsa";

    // Get current sub-phase for DSA
    let currentSubPhase = "intuition";
    if (isDsaRound) {
       const dbSession = await InterviewSession.findById(sessionId);
       currentSubPhase = dbSession.dsa_sub_phase || "intuition";
       
       // Force to evaluating if it's a final submission from the code editor
       if (isFinalSubmission) {
         currentSubPhase = "evaluating";
       }
    }

    if (isDsaRound) {
       // --- DSA Specialized Evaluation Loop ---
        const evaluation = await evaluateDsaTurn(question, correctedAnswer, codeContent, currentQuestionHistory, idx, state.questions.length, currentSubPhase);
        log.success("WS", `✅ [DSA] sub_phase: ${evaluation.sub_phase_transition}, move_to_next: ${evaluation.move_to_next}`);
        
        const nextActionEntry = { role: "interviewer", text: evaluation.ai_response, question_index: idx };
        state.transcript.push(nextActionEntry);

        // Update DB with evaluation and new sub-phase
        await InterviewSession.findByIdAndUpdate(sessionId, {
          $push: { transcript: nextActionEntry, evaluations: { question_index: idx, question: (question.title || "Coding"), answer: correctedAnswer, score: evaluation.move_to_next ? 100 : null, feedback: evaluation.ai_response } },
          dsa_sub_phase: evaluation.sub_phase_transition
        });

        if (evaluation.move_to_next && idx < state.questions.length - 1) {
           state.current_q_index++;
           await InterviewSession.findByIdAndUpdate(sessionId, { current_q_index: state.current_q_index, dsa_sub_phase: "intuition" });
           askQuestion(ws, sessionId, evaluation.ai_response);
        } else if (evaluation.move_to_next && idx >= state.questions.length - 1) {
           const wrapUpMsg = `${evaluation.ai_response} That was the last problem! You've done great. Let me now generate your performance report.`;
           sendToClient(ws, {
             type: "ai_message",
             text: wrapUpMsg,
             phase: "report",
             session_id: sessionId,
             progress: { current: state.questions.length, total: state.questions.length }
           });
           generateReport(ws, sessionId).catch(e => log.error("WS", `Report failed: ${e.message}`));
        } else {
           // Send response back and remain on the same question
           state.phase = "questioning"; 
           sendToClient(ws, {
             type: "ai_message",
             text: evaluation.ai_response,
             phase: "questioning",
             session_id: sessionId,
             progress: { current: idx + 1, total: state.questions.length },
             question
           });
        }

    } else if (state.round_type === "hr") {
       // --- HR Specialized Conversational Flow ---
       const nextQObj = state.questions[idx + 1] || null;
       const targetQuestionTxt = typeof question === "string" ? question : (question.title || question.question_text || "HR Question");
       const nextQuestionTxt = nextQObj 
          ? (typeof nextQObj === "string" ? nextQObj : (nextQObj.title || nextQObj.question_text || "Next Question"))
          : null;
       
       const evaluation = await evaluateHrTurn(targetQuestionTxt, nextQuestionTxt, correctedAnswer, currentQuestionHistory, idx, state.questions.length, state.resume_profile);
       log.success("WS", `✅ [HR] move_to_next: ${evaluation.move_to_next}`);

       const nextActionEntry = { role: "interviewer", text: evaluation.ai_response, question_index: idx };
       state.transcript.push(nextActionEntry);

       const pushQuery = { transcript: nextActionEntry };
       if (evaluation.move_to_next) {
         pushQuery.evaluations = { question_index: idx, question: targetQuestionTxt, answer: correctedAnswer, score: 90, feedback: evaluation.ai_response };
       }
       await InterviewSession.findByIdAndUpdate(sessionId, { $push: pushQuery });

       if (evaluation.move_to_next && idx < state.questions.length - 1) {
          state.current_q_index++;
          await InterviewSession.findByIdAndUpdate(sessionId, { current_q_index: state.current_q_index });
          
          sendToClient(ws, {
            type: "ai_message",
            text: evaluation.ai_response,
            phase: "questioning",
            session_id: sessionId,
            progress: { current: state.current_q_index + 1, total: state.questions.length },
            question: state.questions[state.current_q_index]
          });
       } else if (evaluation.move_to_next && idx >= state.questions.length - 1) {
          const wrapUpMsg = `${evaluation.ai_response} That completes our interview. You did a fantastic job! Give me just a moment to put together your feedback report.`;
          sendToClient(ws, {
            type: "ai_message",
            text: wrapUpMsg,
            phase: "report",
            session_id: sessionId,
            progress: { current: state.questions.length, total: state.questions.length }
          });
          generateReport(ws, sessionId).catch(e => log.error("WS", `Report failed: ${e.message}`));
       } else {
          // Staying on the same question
          state.phase = "questioning"; 
          sendToClient(ws, {
             type: "ai_message",
             text: evaluation.ai_response,
             phase: "questioning",
             session_id: sessionId,
             progress: { current: idx + 1, total: state.questions.length },
             question
          });
       }
    } else {
       // --- Standard Feedback Flow ---
       const allowFollowup = state.follow_up_count < 1;
       const evaluation = await evaluateAnswer(question, correctedAnswer, transcriptContext, allowFollowup);
       log.success("WS", `✅ Score: ${evaluation.score}, follow-up: ${evaluation.needs_followup}`);

       // Save evaluation
       const questionTextStore = typeof question === "string" ? question : (question.title || question.question_text || "Coding Question");
       await InterviewSession.findByIdAndUpdate(sessionId, {
         $push: {
           evaluations: {
             question_index: idx,
             question: questionTextStore,
             answer: correctedAnswer,
             score: evaluation.score,
             feedback: evaluation.feedback
           }
         }
       });

       // ── Routing decision ─────────────────────────────────────────────────────
       if (evaluation.needs_followup && state.follow_up_count < 1 && evaluation.followup_question) {
         state.follow_up_count++;
         const combinedMsg = `${evaluation.feedback} Let me ask you a follow-up: ${evaluation.followup_question}`;
         const followUpEntry = { role: "interviewer", text: combinedMsg, question_index: idx };
         state.transcript.push(followUpEntry);
         state.phase = "followup";

         await InterviewSession.findByIdAndUpdate(sessionId, {
           $push: { transcript: followUpEntry },
           follow_up_count: state.follow_up_count
         });

         sendToClient(ws, {
           type: "ai_message",
           text: combinedMsg,
           phase: "followup",
           session_id: sessionId,
           progress: { current: idx + 1, total: state.questions.length },
           question
         });

       } else if (idx < state.questions.length - 1) {
         state.current_q_index++;
         state.follow_up_count = 0;
         await InterviewSession.findByIdAndUpdate(sessionId, {
           current_q_index: state.current_q_index,
           follow_up_count: 0
         });
         askQuestion(ws, sessionId, evaluation.feedback);

       } else {
         const wrapUpMsg = `${evaluation.feedback} That was the last question! You've done great. Let me now generate your performance report.`;
         sendToClient(ws, {
           type: "ai_message",
           text: wrapUpMsg,
           phase: "report",
           session_id: sessionId,
           progress: { current: state.questions.length, total: state.questions.length }
         });
         generateReport(ws, sessionId).catch(e => log.error("WS", `Report failed: ${e.message}`));
       }
    }

  } catch (e) {
    log.error("WS", `Evaluation error: ${e.message}`);
    // On error: send a brief bridge and move to next question anyway
    const nextIdx = state.current_q_index + 1;
    if (nextIdx < state.questions.length) {
      state.current_q_index = nextIdx;
      state.follow_up_count = 0;
      askQuestion(ws, sessionId, "Let's continue.");
    } else {
      await generateReport(ws, sessionId);
    }
  }
}

// ─── Generate Final Report ────────────────────────────────────────────────────

async function generateReport(ws, sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const { state } = session;
  log.info("WS", `📋 Generating final report for session ${sessionId}...`);
  state.phase = "report";

  const wrapUp = "That wraps up our interview! You handled those questions really well. I'm now generating your comprehensive performance report — just give me a moment.";
  sendToClient(ws, {
    type: "ai_message",
    text: wrapUp,
    phase: "report",
    session_id: sessionId,
    progress: { current: state.questions.length, total: state.questions.length }
  });

  try {
    const finalReport = await generateFinalReport(state.transcript);

    // Calculate average score
    const dbSession = await InterviewSession.findById(sessionId);
    const evals = dbSession?.evaluations || [];
    const totalScore = evals.length > 0
      ? Math.round(evals.reduce((acc, e) => acc + (e.score || 0), 0) / evals.length)
      : (finalReport.overall_score || 0);

    await InterviewSession.findByIdAndUpdate(sessionId, {
      phase: "done",
      final_report: finalReport,
      total_score: totalScore
    });

    log.success("WS", `✅ Report generated — Score: ${totalScore}, Recommendation: ${finalReport.recommendation}`);

    sendToClient(ws, {
      type: "interview_complete",
      session_id: sessionId,
      final_report: finalReport
    });

  } catch (e) {
    log.error("WS", `Report generation failed: ${e.message}`);
    await InterviewSession.findByIdAndUpdate(sessionId, { phase: "done" });
    sendToClient(ws, { type: "interview_complete", session_id: sessionId });
  }
}

// ─── Attach WebSocket Server ──────────────────────────────────────────────────

function attachWebSocket(httpServer) {
  const wss = new WebSocket.Server({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const match = url.pathname.match(/^\/ws\/interview\/(.+)$/);
    if (!match) { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, match[1]);
    });
  });

  wss.on("connection", async (ws, request, sessionId) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get("token");
    let authUserId = null;

    if (!token) {
      log.warn("WS", `❌ Connection rejected: No token provided for session ${sessionId}`);
      ws.close(4001, "No authentication token provided");
      return;
    }

    try {
      const decoded = await verifyToken(token, { 
        secretKey: process.env.CLERK_SECRET_KEY 
      });
      authUserId = decoded.sub;
      log.info("WS", `🔌 Authenticated — user: ${authUserId}, session: ${sessionId}`);
    } catch (e) {
      log.error("WS", `❌ Token verification failed: ${e.message}`);
      ws.close(4002, "Invalid authentication token");
      return;
    }

    initSession(ws, sessionId, authUserId);

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw);

        if (data.type === "user_answer" && data.text?.trim()) {
          await handleUserAnswer(ws, sessionId, data.text.trim(), data.code, !!data.isFinalSubmission, data.language);

        } else if (data.type === "speech_done") {
          // Client signals that AI speech just finished — execute pending action
          const sess = activeSessions.get(sessionId);
          if (!sess || !sess.pendingNext) return;

          const pending = sess.pendingNext;
          sess.pendingNext = null;

          if (pending === "ask_question") {
            askQuestion(ws, sessionId);
          } else if (pending === "generate_report") {
            await generateReport(ws, sessionId);
          } else if (typeof pending === "object" && pending.type === "send_message") {
            sendToClient(ws, pending.payload);
          }
        }
      } catch (e) {
        log.error("WS", `Message error: ${e.message}`);
      }
    });

    ws.on("close", () => {
      log.info("WS", `🔌 Disconnected — session: ${sessionId}`);
      activeSessions.delete(sessionId);
    });

    ws.on("error", (err) => log.error("WS", err.message));
  });

  log.success("WS", "✅ WebSocket server attached at /ws/interview/:sessionId");
  return wss;
}

module.exports = { attachWebSocket };
