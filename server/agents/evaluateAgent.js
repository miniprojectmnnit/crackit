const { ai } = require("../utils/geminiClient");

async function evaluateAnswer(question, answer, optimalSolution = "") {
  const prompt = `
You are an expert technical interviewer evaluating a candidate's answer.
Given the interview question, the candidate's response, and (optionally) an optimal solution, evaluate the candidate's performance.

Question Focus: ${question.type}
Question: "${question.question_text}"
Optimal Solution (if any): "${optimalSolution}"
Candidate Answer: "${answer}"

Provide an evaluation strictly returning a JSON object with the following schema:
{
  "correctness": number (0 to 100),
  "clarity": number (0 to 100),
  "problem_solving": number (0 to 100),
  "feedback": string (Speak directly to the candidate as the interviewer. Give detailed, constructive feedback in 2-3 sentences max. Example: "Great job mapping out the constraints, but your nested loop makes this O(N^2). Can you think of a way to do this in one pass?"),
  "follow_up_question": string | null (If the candidate missed something crucial or the answer is too short, provide a follow up question here for them to try again. If they answered perfectly or sufficiently, return null so they can move to the next question)
}

Do NOT include any markdown block wrappers (like \`\`\`json). Return exactly the JSON object.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });

    let output = response.text || "";
    output = output.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Attempt parsing
    const jsonStart = output.indexOf("{");
    const jsonEnd = output.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(output.substring(jsonStart, jsonEnd + 1));
    }
    return null;
  } catch (error) {
    console.error("EvaluateAgent Error:", error.message);
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
