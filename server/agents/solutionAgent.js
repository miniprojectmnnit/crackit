const { ai } = require("../utils/geminiClient");

async function generateSolution(questionText, description) {
  const prompt = `
You are an expert software engineer.
Given the coding problem below, provide an optimal algorithmic solution in JavaScript/Node.js, and describe its time and space complexity.

Question: "${questionText}"
Description: "${description}"

Return ONLY a valid JSON object with these keys:
- solution: string (The JavaScript code solution, well commented)
- time_complexity: string
- space_complexity: string

Do NOT include any markdown block wrappers (like \`\`\`json). Just the JSON object.
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
