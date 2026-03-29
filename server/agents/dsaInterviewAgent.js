const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const log = require("../utils/logger");

const dsaEvalSchema = z.object({
  ai_response: z.string().describe("Your spoken conversational response to the candidate. Keep it concise, 1-3 sentences. Do not use markdown like bolding or code blocks since it is spoken aloud."),
  move_to_next: z.boolean().describe("true ONLY IF the candidate has fully solved the problem and you have congratulated them. Otherwise false.")
});

async function evaluateDsaTurn(questionTextOrObj, userMessage, code, transcriptContext, qIndex, totalQs) {
  const questionString = typeof questionTextOrObj === "string" 
      ? questionTextOrObj 
      : `${questionTextOrObj.title || "Coding Question"}:\n${questionTextOrObj.description || questionTextOrObj.question_text}`;

  const currentCode = (code && code.trim() !== "" && !code.includes("Write your solution here...")) 
    ? code 
    : "No code written yet.";

  const systemInstructions = `You are an expert AI technical interviewer conducting a Data Structures and Algorithms (DSA) interview round.
Round Progress: Question ${qIndex + 1} of ${totalQs}.

CURRENT PROBLEM TO ASK/DISCUSS:
${questionString}

YOUR GOAL AND BEHAVIOR:
1. Always act like a real, conversational human interviewer. Do NOT output large paragraphs. Talk in 1 to 3 short sentences.
2. The user can only speak to you, and you will speak back.
3. When introducing the problem for the FIRST time, explain the problem and concisely summarize the examples.
4. If the user asks clarifying questions, answer them based on the problem description.
5. DO NOT ask the user to code right away. Wait for the user to understand the problem and propose a logical approach first.
6. Once the user explains a correct or optimal approach, explicitly tell them to start coding.
7. As the user codes, you will receive their live code snippet. Review it, comment on their logic if they ask or if they are making a major mistake, and guide them. 
8. Keep your feedback conversational. Never read code formatting out loud.
9. IF the user has fully solved the problem correctly (all edge cases and optimal complexity), congratulate them and set 'move_to_next' to true so the system can move to the next question.

Candidate's Current Code Editor content:
\`\`\`
${currentCode}
\`\`\`
`;

  const evalPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemInstructions],
    ["user", `CONVERSATION SO FAR:\n{context}\n\nCANDIDATE JUST SAID: {answer}\n\nRespond appropriately based on the instructions.`]
  ]);

  const llm = getLLM({ temperature: 0.2 });
  const chain = evalPrompt.pipe(llm.withStructuredOutput(dsaEvalSchema));
  
  try {
    const result = await chain.invoke({
      context: transcriptContext || "No prior conversation for this question.",
      answer: userMessage
    });
    return result;
  } catch (e) {
    log.error("DSA_AGENT", `DSA Turn Evaluation Failed: ${e.message}`);
    // fallback
    return {
      ai_response: "I'm having a little trouble following that. Could you repeat or clarify your approach?",
      move_to_next: false
    };
  }
}

module.exports = { evaluateDsaTurn };
