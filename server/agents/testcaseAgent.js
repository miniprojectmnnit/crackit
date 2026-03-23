const { callGeminiWithFallback } = require("../utils/llmClient");

async function generateTestCases(questionText, description) {

  const prompt = `
================ ROLE =================
You are a senior software tester responsible for designing test cases
for coding interview problems.

Your goal is to generate test cases that thoroughly validate a candidate's solution.

================ PROBLEM =================

Question:
"${questionText}"

Description:
"${description}"

================ TEST CASE STRATEGY =================

Generate EXACTLY 5 test cases.

The test cases must include:

1. Basic Case
   - A simple example demonstrating the core functionality.

2. Typical Case
   - A realistic input showing normal usage.

3. Edge Case
   - Boundary conditions such as:
     • empty input
     • smallest possible input
     • duplicate values
     • negative numbers
     • single element

4. Large Case
   - A bigger input to simulate performance constraints.

5. Tricky Case
   - A scenario that might break incorrect implementations.

================ INPUT / OUTPUT FORMAT =================

Each test case must contain:

input:
A string representing the exact parameters passed to the function.

Examples:
"[1,2,3]"
"nums=[1,2,3], target=4"
"[[1,2],[3,4]]"

expected_output:
The exact output that the correct algorithm should return.

Both input and expected_output must be strings.

================ VALIDATION RULES =================

Ensure that:

• All test cases are different.
• The expected output is logically correct.
• Inputs are realistic and consistent with the problem description.

================ OUTPUT FORMAT (STRICT) =================

Return ONLY a JSON array with EXACTLY 5 objects.

Each object must follow this schema:

{
  "input": string,
  "expected_output": string
}

Important rules:

• DO NOT include markdown
• DO NOT include explanations
• DO NOT include extra text
• Output must be valid JSON

Return the JSON array now.
`;

  try {
    const output = await callGeminiWithFallback(prompt, { temperature: 0.2 });
    output = output.replace(/```json/g, "").replace(/```/g, "").trim();

    const jsonStart = output.indexOf("[");
    const jsonEnd = output.lastIndexOf("]");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(output.substring(jsonStart, jsonEnd + 1));
    }

    return [];

  } catch (error) {
    console.error("TestCaseAgent Error:", error.message);
    return [];
  }
}

module.exports = { generateTestCases };