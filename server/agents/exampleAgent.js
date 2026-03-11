const { ai } = require("../utils/geminiClient");

async function generateExamples(questionText, description) {

  const prompt = `
================ ROLE =================
You are a senior algorithm problem designer and competitive programming educator.

Your task is to generate clear, educational examples for a coding interview problem.

The examples should help candidates understand:
• how inputs are structured
• how outputs are derived
• what the algorithm should compute

================ PROBLEM CONTEXT =================

Problem Title / Question:
"${questionText}"

Problem Description:
"${description}"

================ EXAMPLE GENERATION RULES =================

Generate 2–3 examples that illustrate the problem clearly.

The examples should follow these guidelines:

1. The first example should be a **simple, easy-to-understand case**.

2. The second example should show a **more interesting case**
   that demonstrates the main logic of the problem.

3. If possible, the third example should show an **edge case**
   (empty input, duplicate values, minimal size, boundary case, etc.).

Each example must include:
• input
• output
• explanation

Explanation requirements:
• 1–3 sentences
• explain WHY the output is correct
• avoid unnecessary verbosity

================ INPUT/OUTPUT FORMAT RULES =================

Represent inputs exactly as they would appear in coding platforms
like programming interviews or competitive programming.

Examples of good formats:

Array input:
"[1,2,3]"

Multiple arguments:
"nums = [1,2,3], target = 4"

Matrix input:
"[[1,2],[3,4]]"

Output must be the exact expected result.

================ OUTPUT FORMAT (STRICT) =================

Return ONLY a JSON array.

Each element must follow this schema:

{
  "input": string,
  "output": string,
  "explanation": string
}

Important rules:
• DO NOT include markdown
• DO NOT include explanations outside JSON
• DO NOT include text before or after JSON
• Output must be valid JSON

Return the JSON array now.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });

    let output = response.text || "";
    output = output.replace(/```json/g, "").replace(/```/g, "").trim();

    const jsonStart = output.indexOf("[");
    const jsonEnd = output.lastIndexOf("]");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(output.substring(jsonStart, jsonEnd + 1));
    }

    return [];

  } catch (error) {
    console.error("ExampleGeneratorAgent Error:", error.message);
    return [];
  }
}

module.exports = { generateExamples };