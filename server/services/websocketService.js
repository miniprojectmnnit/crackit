const WebSocket = require("ws");
const InterviewSession = require("../models/InterviewSession");
const ResumeProfile = require("../models/ResumeProfile");
const { generateInterviewPlan } = require("../agents/interviewPlanAgent");
const { generateFinalReport } = require("../agents/reportAgent");
const { correctTranscription } = require("../agents/sttCorrectionAgent");
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

async function evaluateAnswer(question, answer, transcriptContext, allowFollowup) {
  const systemInstructions = allowFollowup 
    ? `You are a senior technical interviewer in a live conversation.
Keep feedback brief and spoken-aloud style — 1-2 sentences.
If the candidate's answer is incomplete or vague, you MAY ask a follow-up question to probe deeper.
However, NEVER ask more than ONE follow-up per main question. If you have already asked a follow-up, provide concluding feedback and set needs_followup to false.`
    : `You are a senior technical interviewer in a live conversation.
Keep feedback brief and spoken-aloud style — 1-2 sentences.
CRITICAL INSTRUCTION: You have ALREADY asked a follow-up for this topic. You are STRICTLY FORBIDDEN from asking any more questions.
Provide ONLY a concluding statement or final feedback, and set needs_followup to false. Do NOT ask for elaboration or clarification.`;

  const evalPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemInstructions],
    ["user", `CONVERSATION SO FAR:\n{context}\n\nCURRENT QUESTION: {question}\nCANDIDATE'S ANSWER: {answer}\n\nEvaluate this answer.`]
  ]);
  const llm = getLLM({ temperature: 0.3 });
  const chain = evalPrompt.pipe(llm.withStructuredOutput(evalSchema));
  return chain.invoke({ context: transcriptContext || "First question.", question, answer });
}

// ─── Session Initialization ───────────────────────────────────────────────────

async function initSession(ws, sessionId) {
  try {
    const session = await InterviewSession.findById(sessionId);
    if (!session) return sendToClient(ws, { type: "error", message: "Session not found." });

    const resumeProfile = await ResumeProfile.findById(session.resume_id);
    if (!resumeProfile) return sendToClient(ws, { type: "error", message: "Resume not found." });

    // Build initial in-memory state
    const state = {
      session_id: sessionId,
      resume_profile: resumeProfile.toObject(),
      questions: [],
      current_q_index: 0,
      follow_up_count: 0,
      transcript: [],
      phase: "greeting"
    };

    activeSessions.set(sessionId, { ws, state, pendingNext: null });

    log.success("WS", `✅ Session ${sessionId} initialized`);
    sendToClient(ws, { type: "session_ready", session_id: sessionId });

    // Generate questions
    log.info("WS", "🤖 Generating interview questions...");
    let questions;
    try {
      questions = await generateInterviewPlan(resumeProfile.toObject(), 10);
    } catch (e) {
      log.error("WS", `Failed to generate questions: ${e.message}`);
      questions = [
        "Tell me about yourself and your technical background.",
        "What are your strongest technical skills and why?",
        "Describe a challenging project you worked on recently.",
        "How do you approach debugging a complex problem?",
        "What's your understanding of RESTful API design principles?",
        "Can you explain how you would design a scalable system?",
        "What's your favorite data structure and when would you use it?",
        "Describe a situation where you had to learn a new technology quickly.",
        "How do you ensure code quality in your projects?",
        "Where do you see yourself growing technically in the next year?"
      ];
    }

    state.questions = questions;
    const questionsForDb = questions.map(q => ({ text: q }));
    await InterviewSession.findByIdAndUpdate(sessionId, { questions: questionsForDb, phase: "questioning" });

    // Combine greeting + first question into ONE message
    // This avoids the Gemini Live multi-turn silence bug
    const candidateName = resumeProfile.candidate_info?.name || "there";
    const firstQuestion = questions[0];
    const combinedOpening = `Hello ${candidateName}! Welcome to your CrackIt technical interview. I'm your AI interviewer today. We'll go through ${questions.length} questions covering your technical background. Take your time with each answer. Let's begin! Here's your first question: ${firstQuestion}`;

    state.transcript.push({ role: "interviewer", text: combinedOpening, question_index: 0 });
    state.phase = "questioning";
    state.current_q_index = 0;

    await InterviewSession.findByIdAndUpdate(sessionId, {
      phase: "questioning",
      current_q_index: 0,
      $push: { transcript: { role: "interviewer", text: combinedOpening, question_index: 0 } }
    });

    // Single message — client speaks it, then opens mic when done
    sendToClient(ws, {
      type: "ai_message",
      text: combinedOpening,
      phase: "questioning",
      session_id: sessionId,
      progress: { current: 1, total: questions.length }
    });

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
  const question = state.questions[idx];
  const total = state.questions.length;

  if (!question) return;

  log.info("WS", `❓ Q${idx + 1}/${total}: "${question.substring(0, 60)}..."`);

  // If there's feedback to prefix (from evaluation), combine into one message
  // This avoids the multi-turn Gemini silence bug
  let fullText;
  if (feedbackToPrefix) {
    fullText = `${feedbackToPrefix} Moving on to question ${idx + 1} of ${total}: ${question}`;
  } else {
    fullText = `Question ${idx + 1} of ${total}: ${question}`;
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
    progress: { current: idx + 1, total }
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

// Detect if the user is making a meta-request rather than answering the question
function isMetaRequest(text) {
  const lower = text.toLowerCase().trim();
  const metaPatterns = [
    /^(can you |please |could you )?(repeat|say again|repeat that|say that again)/,
    /^(i didn't (hear|understand)|didn't catch that)/,
    /^(what (did you say|was the question)|can you (clarify|explain the question))/,
    /^(hello|hi|hey)[\s,!.]*$/,
    /^(what|huh|sorry|pardon)[\s?!.]*$/
  ];
  return metaPatterns.some(p => p.test(lower)) || lower.length < 6;
}

async function handleUserAnswer(ws, sessionId, answerText) {
  const session = activeSessions.get(sessionId);
  if (!session) return sendToClient(ws, { type: "error", message: "Session not active." });

  const { state } = session;
  const idx = state.current_q_index;
  const question = state.questions[idx];

  log.info("WS", `🎤 Answer for Q${idx + 1} (raw): "${answerText.substring(0, 80)}..."`);

  // ── Detect meta-requests (repeat/clarify) ──────────────────────────────────
  if (isMetaRequest(answerText)) {
    log.info("WS", `↩️  Meta-request detected: "${answerText}" — repeating question`);
    const repeatMsg = `Of course! Here's the question again: ${question}`;

    state.transcript.push({ role: "interviewer", text: repeatMsg, question_index: idx });
    await InterviewSession.findByIdAndUpdate(sessionId, {
      $push: { transcript: { role: "interviewer", text: repeatMsg, question_index: idx } }
    });

    sendToClient(ws, {
      type: "ai_message",
      text: repeatMsg,
      phase: "questioning",
      session_id: sessionId,
      progress: { current: idx + 1, total: state.questions.length }
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
  const answerEntry = { role: "candidate", text: correctedAnswer, question_index: idx };
  state.transcript.push(answerEntry);

  await InterviewSession.findByIdAndUpdate(sessionId, {
    $push: { transcript: answerEntry }
  });

  // Evaluate using the corrected answer
  try {
    const transcriptContext = state.transcript
      .slice(0, -1)
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join("\n\n");

    const allowFollowup = state.follow_up_count < 1;
    const evaluation = await evaluateAnswer(question, correctedAnswer, transcriptContext, allowFollowup);
    log.success("WS", `✅ Score: ${evaluation.score}, follow-up: ${evaluation.needs_followup}`);

    // Save evaluation
    await InterviewSession.findByIdAndUpdate(sessionId, {
      $push: {
        evaluations: {
          question_index: idx,
          question,
          answer: correctedAnswer,
          score: evaluation.score,
          feedback: evaluation.feedback
        }
      }
    });

    // ── Routing decision ─────────────────────────────────────────────────────
    // KEY: We combine feedback + next action into ONE message to avoid
    // the Gemini Live multi-turn silence bug. Each AI turn = one sendText call.

    if (evaluation.needs_followup && state.follow_up_count < 1 && evaluation.followup_question) {
      // Combine feedback + follow-up into one message
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
        progress: { current: idx + 1, total: state.questions.length }
      });

    } else if (idx < state.questions.length - 1) {
      // Advance index, combine feedback + next question
      state.current_q_index++;
      state.follow_up_count = 0;
      await InterviewSession.findByIdAndUpdate(sessionId, {
        current_q_index: state.current_q_index,
        follow_up_count: 0
      });
      // Pass feedback as prefix — askQuestion will combine them
      askQuestion(ws, sessionId, evaluation.feedback);

    } else {
      // All done — combine feedback + wrap-up
      const wrapUpMsg = `${evaluation.feedback} That was the last question! You've done great. Let me now generate your performance report.`;
      sendToClient(ws, {
        type: "ai_message",
        text: wrapUpMsg,
        phase: "report",
        session_id: sessionId,
        progress: { current: state.questions.length, total: state.questions.length }
      });
      // Generate report in background
      generateReport(ws, sessionId).catch(e => log.error("WS", `Report failed: ${e.message}`));
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

  wss.on("connection", (ws, request, sessionId) => {
    log.info("WS", `🔌 Connected — session: ${sessionId}`);
    initSession(ws, sessionId);

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw);

        if (data.type === "user_answer" && data.text?.trim()) {
          await handleUserAnswer(ws, sessionId, data.text.trim());

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
