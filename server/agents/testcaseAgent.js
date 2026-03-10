const { ai } = require("../utils/geminiClient");

async function generateTestCases(questionText, description) {
  const prompt = `
You are an expert software tester for algorithmic problems.
Given the coding problem below, generate 5 comprehensive test cases, including typical cases and edge cases.

Question: "${questionText}"
Description: "${description}"

Return ONLY a valid JSON array of objects with these keys:
- input: string
- expected_output: string

Ensure the inputs and outputs are formatted consistently as strings representing exactly what a program would receive and return.
Do NOT include any markdown block wrappers (like \`\`\`json). Just the JSON array.
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
    console.error("TestCaseAgent Error:", error.message);
    return [];
  }
}

module.exports = { generateTestCases };
