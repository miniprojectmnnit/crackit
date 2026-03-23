const { callGeminiWithFallback } = require("../utils/llmClient");

async function expandProblem(questionText) {

  const prompt = `
================ ROLE =================
You are a senior algorithm problem designer who writes coding interview questions
for competitive programming platforms.

Your job is to transform a short interview question into a complete,
well-structured coding problem similar to those seen on technical interview platforms.

================ INPUT QUESTION =================

"${questionText}"

================ PROBLEM DESIGN GUIDELINES =================

Convert the question into a full coding problem with these components:

1. Title
   - Short and descriptive
   - Similar to titles used in coding interview platforms

2. Description
   - Clearly explain the problem statement
   - Define what input represents
   - Define what output should be
   - Explain the task the programmer must solve
   - Write in clean Markdown format

3. Constraints
   - Provide realistic constraints for the problem
   - Example constraints include:
     - array size limits
     - integer ranges
     - time complexity expectations
   - Format constraints as Markdown bullet points

4. Difficulty Classification

Use these rules:

Easy:
- Simple logic or brute-force acceptable
- Time complexity typically O(n) or O(n log n)

Medium:
- Requires algorithmic thinking
- May involve hash maps, two pointers, stacks, recursion, etc.

Hard:
- Requires advanced algorithms or tricky optimizations
- May involve dynamic programming, graph algorithms, or complex data structures

5. Tags
Provide 2–5 relevant algorithmic tags such as:
- Arrays
- HashMap
- Two Pointers
- Binary Search
- Dynamic Programming
- Graph
- Greedy
- Stack
- Sliding Window

================ OUTPUT FORMAT (STRICT) =================

Return ONLY a JSON object with the following schema:

{
  "title": string,
  "description": string,
  "constraints": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "tags": string[]
}

Formatting rules:

• Description must be Markdown formatted.
• Constraints must be Markdown bullet points.
• Tags must contain between 2 and 5 items.
• Output must be valid JSON.

Important rules:

• DO NOT include markdown code blocks
• DO NOT include explanations outside JSON
• DO NOT include text before or after JSON

Return the JSON object now.
`;

  try {
    const output = await callGeminiWithFallback(prompt, { temperature: 0.2 });
    output = output.replace(/```json/g, "").replace(/```/g, "").trim();

    const jsonStart = output.indexOf("{");
    const jsonEnd = output.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(output.substring(jsonStart, jsonEnd + 1));
    }

    return null;

  } catch (error) {
    console.error("ProblemExpansionAgent Error:", error.message);
    return null;
  }
}

module.exports = { expandProblem };