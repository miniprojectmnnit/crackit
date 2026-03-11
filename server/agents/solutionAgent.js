const { ai } = require("../utils/geminiClient");

async function generateSolution(questionText, description) {

  const prompt = `
================ ROLE =================
You are a senior software engineer and algorithm expert who writes optimal
solutions for technical interview coding problems.

Your goal is to provide a correct and efficient JavaScript solution
that could pass coding platform test cases.

================ PROBLEM =================

Question:
"${questionText}"

Description:
"${description}"

================ SOLUTION REQUIREMENTS =================

Generate the BEST algorithmic solution for this problem.

Your solution must:

• be written in JavaScript (Node.js compatible)
• implement a function named **solve**
• handle edge cases
• follow clean coding practices
• include helpful comments explaining the logic

Example structure:

function solve(...) {
   // explanation comment
}

================ ALGORITHM GUIDELINES =================

Before producing the solution, internally reason about:

• the core algorithm needed
• edge cases
• optimal time complexity
• memory efficiency

Prefer optimal solutions such as:

• Hash maps
• Two pointers
• Binary search
• Sliding window
• Dynamic programming
• Graph algorithms

Avoid brute force unless the problem is clearly Easy.

================ COMPLEXITY ANALYSIS =================

Provide:

time_complexity:
Explain the Big-O complexity.

space_complexity:
Explain memory usage.

Example:
"O(n)"
"O(n log n)"
"O(1)"

================ OUTPUT FORMAT (STRICT) =================

Return ONLY a valid JSON object with this schema:

{
  "solution": string,
  "time_complexity": string,
  "space_complexity": string
}

Rules:

• solution must contain the full JavaScript implementation
• solution must define function solve()
• solution must contain comments
• DO NOT include markdown
• DO NOT include extra explanations outside JSON
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
    console.error("SolutionAgent Error:", error.message);
    return null;
  }
}

module.exports = { generateSolution };