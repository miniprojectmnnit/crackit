const { getLLM } = require("../utils/llmClient");
const { z } = require("zod");
const log = require("../utils/logger");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");

const dsaEvalSchema = z.object({
  ai_response: z.string().describe("Your spoken conversational response to the candidate. Keep it concise, 1-3 sentences. Do not use markdown like bolding or code blocks since it is spoken aloud."),
  sub_phase_transition: z.enum(["intuition", "coding", "evaluating"]).describe("The next logical phase for the current problem. 'intuition' if still discussing logic, 'coding' if the candidate should start/continue coding, 'evaluating' if they just submitted final code."),
  move_to_next: z.boolean().describe("true ONLY IF the candidate has fully solved the problem and you have provided FINAL feedback. Otherwise false.")
});

async function evaluateDsaTurn(questionTextOrObj, userMessage, code, history = [], qIndex, totalQs, currentSubPhase) {
  const questionString = typeof questionTextOrObj === "string" 
      ? questionTextOrObj 
      : `${questionTextOrObj.title || "Coding Question"}:\n${questionTextOrObj.description || questionTextOrObj.question_text}`;

  const currentCode = (code && code.trim() !== "" && !code.includes("Write your solution here...")) 
    ? code 
    : "No code written yet.";

  const systemInstructions = `You are an expert AI technical interviewer conducting a Data Structures and Algorithms (DSA) interview round.
Round Progress: Question ${qIndex + 1} of ${totalQs}.
Current Phase: ${currentSubPhase}

CURRENT PROBLEM TO ASK/DISCUSS:
${questionString}

Candidate's Current Code Editor content:
\`\`\`
${currentCode}
\`\`\`

YOUR GOAL AND BEHAVIOR:
1. Always act like a real, conversational human interviewer. Do NOT output large paragraphs. Talk in 1 to 3 short sentences.
2. The user can only speak to you, and you will speak back.
3. If this is the FIRST message of the question, explain the problem and concisely summarize the examples.
4. If the user asks clarifying questions, answer them based on the problem description.
5. PHASE: INTUITION
   - DO NOT ask the user to code right away. Wait for the user to understand the problem and propose a logical approach first.
   - Provide feedback on their thinking. If they are in the right direction, encourage them. If not, give subtle hints.
   - Once they propose an optimal/correct approach, explicitly tell them to start implementation. Set sub_phase_transition to 'coding'.
6. PHASE: CODING
   - As the user codes, you will receive their live code snippet. Review it, comment on their logic if they ask or if they are making a major mistake, and guide them.
   - Set sub_phase_transition to 'coding' unless they explicitly submit.
7. PHASE: EVALUATING (Final Submission)
   - When the user submits their code, review BOTH the previously discussed intuition and the final code.
   - Provide a final summary of their performance on this question.
   - Congratulate them and set 'move_to_next' to true so the system can move to the next question.
`;

  const messages = [
    new SystemMessage(systemInstructions),
    ...history.map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)),
    new HumanMessage(userMessage)
  ];

  const llm = getLLM({ temperature: 0.2 });
  const chain = llm.withStructuredOutput(dsaEvalSchema);
  
  try {
    const result = await chain.invoke(messages);
    return result;
  } catch (e) {
    log.error("DSA_AGENT", `DSA Turn Evaluation Failed: ${e.message}`);
    // fallback
    return {
      ai_response: "I'm having a little trouble following that. Could you repeat or clarify your approach?",
      sub_phase_transition: currentSubPhase,
      move_to_next: false
    };
  }
}

module.exports = { evaluateDsaTurn };
