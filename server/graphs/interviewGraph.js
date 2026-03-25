const { Annotation, StateGraph, START, END } = require("@langchain/langgraph");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { generateInterviewPlan } = require("../agents/interviewPlanAgent");
const { generateFinalReport } = require("../agents/reportAgent");
const InterviewSession = require("../models/InterviewSession");
const ResumeProfile = require("../models/ResumeProfile");
const log = require("../utils/logger");

// ─── State Schema ───────────────────────────────────────────────────────────

const InterviewState = Annotation.Root({
  session_id: Annotation(),
  resume_id: Annotation(),
  resume_profile: Annotation(),
  questions: Annotation(),          // string[]
  current_q_index: Annotation(),    // number
  follow_up_count: Annotation(),    // number, max 2
  transcript: Annotation({         // {role, text, question_index}[]
    reducer: (a, b) => [...(a || []), ...(Array.isArray(b) ? b : [b])]
  }),
  current_answer: Annotation(),     // latest user answer string
  evaluation: Annotation(),        // { score, feedback, needs_followup }
  phase: Annotation(),             // current node name
  output_message: Annotation(),    // text for the AI to speak
  final_report: Annotation(),
  error: Annotation()
});

// ─── Helper: Save state to DB ────────────────────────────────────────────────

async function persistState(state) {
  try {
    await InterviewSession.findByIdAndUpdate(state.session_id, {
      questions: state.questions,
      phase: state.phase,
      current_q_index: state.current_q_index,
      follow_up_count: state.follow_up_count,
      transcript: state.transcript,
      final_report: state.final_report
    });
  } catch (e) {
    log.error("GRAPH", `Failed to persist state: ${e.message}`);
  }
}

// ─── Node: greetNode ─────────────────────────────────────────────────────────

async function greetNode(state) {
  log.info("GRAPH", "📢 greetNode — generating greeting and interview questions...");

  const resumeProfile = state.resume_profile;
  const candidateName = resumeProfile?.candidate_info?.name || "there";

  // Generate questions based on resume
  let questions;
  try {
    questions = await generateInterviewPlan(resumeProfile, 10);
    log.success("GRAPH", `✅ Generated ${questions.length} questions`);
  } catch (e) {
    log.error("GRAPH", `Question generation failed: ${e.message}`);
    questions = [
      "Tell me about yourself and your background.",
      "What are your strongest technical skills?",
      "Describe a challenging project you worked on.",
      "How do you approach debugging a complex problem?",
      "What's your experience with system design?",
      "How do you handle tight deadlines?",
      "What's your favorite data structure and why?",
      "Describe a time you had a disagreement with a teammate.",
      "What are you most proud of in your career?",
      "Where do you see yourself in 5 years?"
    ];
  }

  const greeting = `Hello ${candidateName}! Welcome to your CrackIt technical interview. I'm your AI interviewer today. We'll go through ${questions.length} questions covering your technical skills and experience. Take your time with each answer — I'll be listening carefully. Let's begin with the first question!`;

  const update = {
    questions,
    current_q_index: 0,
    follow_up_count: 0,
    phase: "greeting",
    output_message: greeting,
    transcript: [{ role: "interviewer", text: greeting, question_index: -1 }]
  };

  await InterviewSession.findByIdAndUpdate(state.session_id, {
    questions,
    phase: "greeting",
    current_q_index: 0
  });

  return update;
}

// ─── Node: questionNode ──────────────────────────────────────────────────────

async function questionNode(state) {
  const idx = state.current_q_index;
  const question = state.questions[idx];
  const total = state.questions.length;

  log.info("GRAPH", `❓ questionNode — asking Q${idx + 1}/${total}: "${question.substring(0, 60)}..."`);

  const prefix = idx === 0
    ? "Alright, let's start! "
    : `Great. Moving on to question ${idx + 1} of ${total}. `;

  const fullQuestion = prefix + question;

  return {
    phase: "questioning",
    output_message: fullQuestion,
    current_answer: null,
    evaluation: null,
    transcript: [{ role: "interviewer", text: fullQuestion, question_index: idx }]
  };
}

// ─── Node: evaluateNode ──────────────────────────────────────────────────────

const evalSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().describe("1-2 sentence spoken feedback that feels natural in a conversation"),
  needs_followup: z.boolean().describe("true if the answer was incomplete, vague, or missing key concepts"),
  followup_question: z.string().nullable().describe("A natural follow-up question if needs_followup is true, else null")
});

async function evaluateNode(state) {
  const idx = state.current_q_index;
  const question = state.questions[idx];
  const answer = state.current_answer;

  log.info("GRAPH", `📊 evaluateNode — scoring answer for Q${idx + 1}...`);

  const transcriptContext = state.transcript
    .slice(0, -1) // Exclude the very last entry (which is the current answer)
    .map(t => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n\n");

  const evalPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a senior technical interviewer having a live conversation. 
Keep your feedback conversational and brief — you are speaking aloud, not writing a report.
Evaluate the candidate's answer and decide if a follow-up would be valuable.`],
    ["user", `CONVERSATION SO FAR:
{context}

CURRENT QUESTION: {question}
CANDIDATE'S ANSWER: {answer}

Evaluate this answer.`]
  ]);

  try {
    const llm = getLLM({ temperature: 0.3 });
    const chain = evalPrompt.pipe(llm.withStructuredOutput(evalSchema));
    const result = await chain.invoke({
      context: transcriptContext || "This is the first question.",
      question,
      answer
    });

    log.success("GRAPH", `✅ Evaluation — score: ${result.score}, needs_followup: ${result.needs_followup}`);

    // Save evaluation to session
    await InterviewSession.findByIdAndUpdate(state.session_id, {
      $push: {
        evaluations: {
          question_index: idx,
          question,
          answer,
          score: result.score,
          feedback: result.feedback
        }
      }
    });

    return {
      evaluation: result,
      phase: "evaluating",
      output_message: result.feedback
    };
  } catch (e) {
    log.error("GRAPH", `Evaluation failed: ${e.message}`);
    return {
      evaluation: { score: 50, feedback: "I see — let's continue.", needs_followup: false, followup_question: null },
      phase: "evaluating",
      output_message: "I see — let's continue."
    };
  }
}

// ─── Node: followUpNode ──────────────────────────────────────────────────────

async function followUpNode(state) {
  const followUpQuestion = state.evaluation?.followup_question;
  log.info("GRAPH", `🔄 followUpNode — asking follow-up: "${(followUpQuestion || "").substring(0, 60)}..."`);

  return {
    phase: "followup",
    follow_up_count: (state.follow_up_count || 0) + 1,
    output_message: followUpQuestion,
    transcript: [{ role: "interviewer", text: followUpQuestion, question_index: state.current_q_index }]
  };
}

// ─── Node: moveNextNode ──────────────────────────────────────────────────────

async function moveNextNode(state) {
  const nextIdx = state.current_q_index + 1;
  log.info("GRAPH", `➡️ moveNextNode — advancing to Q${nextIdx + 1}/${state.questions.length}`);

  await InterviewSession.findByIdAndUpdate(state.session_id, {
    current_q_index: nextIdx,
    follow_up_count: 0
  });

  return {
    current_q_index: nextIdx,
    follow_up_count: 0,
    current_answer: null,
    evaluation: null,
    phase: "questioning"
  };
}

// ─── Node: reportNode ────────────────────────────────────────────────────────

async function reportNode(state) {
  log.info("GRAPH", "📋 reportNode — generating final report...");

  const wrapUp = "That concludes our interview! You've done a great job. I'm now generating your comprehensive performance report. This will just take a moment...";

  let finalReport;
  try {
    finalReport = await generateFinalReport(state.transcript);
  } catch (e) {
    log.error("GRAPH", `Report generation failed: ${e.message}`);
    finalReport = { summary: "Report unavailable.", strengths: [], areas_for_improvement: [], overall_score: 0, recommendation: "Maybe" };
  }

  // Calculate total score from evaluations
  const session = await InterviewSession.findById(state.session_id);
  const evals = session?.evaluations || [];
  const totalScore = evals.length > 0
    ? Math.round(evals.reduce((acc, e) => acc + (e.score || 0), 0) / evals.length)
    : finalReport.overall_score;

  await InterviewSession.findByIdAndUpdate(state.session_id, {
    phase: "done",
    final_report: finalReport,
    total_score: totalScore,
    transcript: state.transcript
  });

  return {
    phase: "report",
    final_report: finalReport,
    output_message: wrapUp
  };
}

// ─── Routing Logic ───────────────────────────────────────────────────────────

function routeAfterEval(state) {
  const { evaluation, follow_up_count, current_q_index, questions } = state;

  // If the evaluation says follow-up is needed and we haven't done 2 already
  if (evaluation?.needs_followup && follow_up_count < 2) {
    return "followUpNode";
  }

  // If there are more questions
  if (current_q_index < questions.length - 1) {
    return "moveNextNode";
  }

  // All done
  return "reportNode";
}

function routeAfterGreet() {
  return "questionNode";
}

function routeAfterFollowUp() {
  return "waitForAnswer"; // Always wait for answer after follow-up
}

function routeAfterMove() {
  return "questionNode";
}

// ─── Build Graph ─────────────────────────────────────────────────────────────

const interviewGraph = new StateGraph(InterviewState)
  .addNode("greetNode", greetNode)
  .addNode("questionNode", questionNode)
  .addNode("evaluateNode", evaluateNode)
  .addNode("followUpNode", followUpNode)
  .addNode("moveNextNode", moveNextNode)
  .addNode("reportNode", reportNode)
  .addEdge(START, "greetNode")
  .addConditionalEdges("greetNode", routeAfterGreet, {
    questionNode: "questionNode"
  })
  .addEdge("questionNode", END)          // Pause — wait for user answer
  .addConditionalEdges("evaluateNode", routeAfterEval, {
    followUpNode: "followUpNode",
    moveNextNode: "moveNextNode",
    reportNode: "reportNode"
  })
  .addEdge("followUpNode", END)          // Pause — wait for user answer to follow-up
  .addEdge("moveNextNode", "questionNode")
  .addEdge("reportNode", END)
  .compile();

module.exports = { interviewGraph, InterviewState };
