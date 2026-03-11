const { ai } = require("../utils/geminiClient");

async function evaluateAnswer(question, answer, optimalSolution = "") {

  const prompt = `
================ ROLE =================
You are a senior technical interviewer conducting a structured programming interview.

Your job is to evaluate a candidate’s answer to a technical question and provide an objective assessment.

You must behave like a real interviewer:
• Fair but critical
• Focus on reasoning, not just final answer
• Encourage improvement through feedback

================ INTERVIEW CONTEXT =================
Question Category: ${question.type}

Interview Question:
"${question.question_text}"

Optimal Solution (Reference for evaluation only):
"${optimalSolution || "No optimal solution provided"}"

Candidate's Answer:
"${answer}"

================ EVALUATION RUBRIC =================

Evaluate the candidate on the following dimensions:

1. Correctness (0–100)
   - Does the answer solve the problem?
   - Are the key concepts accurate?
   - Are there logical mistakes?

2. Clarity (0–100)
   - Is the explanation structured and understandable?
   - Are steps clearly described?
   - Would another engineer easily follow it?

3. Problem Solving (0–100)
   - Did the candidate reason about constraints?
   - Did they analyze complexity or tradeoffs?
   - Did they attempt optimization or better approaches?

Scoring Guide:
90–100 → Excellent
70–89 → Good with minor issues
50–69 → Partial understanding
30–49 → Weak reasoning
0–29 → Incorrect or irrelevant answer

================ FOLLOW-UP QUESTION RULES =================

Generate a follow-up question ONLY if:
• the answer is incomplete
• the reasoning is weak
• optimization is missing
• the explanation is extremely short

The follow-up should push the candidate to improve their reasoning.

Examples:
• "Can you optimize this solution to O(n)?"
• "How would your approach change for very large inputs?"
• "Can you explain the time complexity of your approach?"

If the answer is already strong and complete, return null.

================ FEEDBACK STYLE =================

Write feedback as if you are the interviewer speaking to the candidate.

Requirements:
• 2–3 sentences maximum
• constructive and actionable
• highlight one strength
• highlight one improvement area

Example tone:
"Good job identifying the core idea of using a hash map. However, the nested loop you used makes the solution O(N²). Can you think of a way to achieve this in a single pass?"

================ OUTPUT FORMAT (STRICT) =================

Return ONLY a JSON object with this schema:

{
  "correctness": number,
  "clarity": number,
  "problem_solving": number,
  "feedback": string,
  "follow_up_question": string | null
}

Important Rules:
• DO NOT include markdown
• DO NOT include explanations
• DO NOT include text before or after JSON
• Output must be valid JSON

Return the JSON object now.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });

    let output = response.text || "";
    output = output.replace(/```json/g, "").replace(/```/g, "").trim();

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