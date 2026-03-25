const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const evaluationSchema = z.object({
  correctness: z.number().int().describe("Score 0-100 for correctness"),
  clarity: z.number().int().describe("Score 0-100 for explanation clarity"),
  problem_solving: z.number().int().describe("Score 0-100 for problem solving skills"),
  feedback: z.string().describe("Constructive 2-3 sentence feedback as if spoken by the interviewer"),
  follow_up_question: z.string().nullable().describe("A follow-up question if reasoning is weak or answer is incomplete, else null")
});

const evalPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior technical interviewer conducting a structured programming interview.
Your job is to evaluate a candidate's answer to a technical question and provide an objective assessment.
You must behave like a real interviewer:
• Fair but critical
• Focus on reasoning, not just final answer
• Encourage improvement through feedback`],
  ["user", `================ INTERVIEW CONTEXT =================
Question Category: {question_type}

Interview Question:
"{question_text}"

Optimal Solution (Reference for evaluation only):
"{optimal_solution}"

Candidate's Answer:
"{answer}"

================ EVALUATION RUBRIC =================
Evaluate the candidate on the following dimensions:
1. Correctness (0–100): Does the answer solve the problem? Are key concepts accurate?
2. Clarity (0–100): Is the explanation understandable? Would another engineer easily follow it?
3. Problem Solving (0–100): Did the candidate reason about constraints, tradeoffs, or optimizations?

Scoring Guide:
90–100 → Excellent
70–89 → Good with minor issues
50–69 → Partial understanding
30–49 → Weak reasoning
0–29 → Incorrect or irrelevant answer

================ FOLLOW-UP QUESTION RULES =================
Generate a follow-up question ONLY if:
• the answer is incomplete or the reasoning is weak
• optimization is missing
If the answer is already strong and complete, return null.

================ FEEDBACK STYLE =================
Write feedback as if you are the interviewer speaking to the candidate.
• 2–3 sentences maximum
• constructive and actionable
• highlight one strength and one improvement area`]
]);

async function evaluateAnswer(question, answer, optimalSolution = "") {
  log.info("EVAL_AGENT", `🤖 Starting evaluation — type: ${question.type}, question: "${(question.question_text || "").substring(0, 60)}..."`);
  log.info("EVAL_AGENT", `📝 Answer preview: "${String(answer).substring(0, 100)}..."`);

  try {
    const llm = getLLM({ temperature: 0 });
    const structuredLlm = llm.withStructuredOutput(evaluationSchema);
    
    const chain = evalPrompt.pipe(structuredLlm);
    
    log.info("EVAL_AGENT", `📨 Calling LangChain to evaluate answer...`);
    const result = await chain.invoke({
      question_type: question.type,
      question_text: question.question_text,
      optimal_solution: optimalSolution || "No optimal solution provided",
      answer: answer
    });

    log.success("EVAL_AGENT", `✅ Evaluation parsed — correctness: ${result.correctness}, clarity: ${result.clarity}, problem_solving: ${result.problem_solving}`);
    if (result.follow_up_question) {
      log.info("EVAL_AGENT", `🔄 Follow-up generated: "${result.follow_up_question.substring(0, 80)}..."`);
    } else {
      log.info("EVAL_AGENT", `🔄 No follow-up question needed`);
    }

    return result;

  } catch (error) {
    log.error("EVAL_AGENT", `Evaluation failed: ${error.message}`);
    log.error("EVAL_AGENT", error.stack);
    
    return {
      correctness: 0,
      clarity: 0,
      problem_solving: 0,
      feedback: "Failed to evaluate answer due to internal error.",
      follow_up_question: null
    };
  }
}

module.exports = { evaluateAnswer };