const { ai } = require("../utils/geminiClient");

async function generateExamples(questionText, description) {
  const prompt = `
You are an expert algorithm problem writer.
Given the following coding problem, generate 2 to 3 concrete examples that illustrate the problem, including input, output, and an explanation.

Question: "${questionText}"
Description: "${description}"

Return ONLY a valid JSON array of objects with these keys:
- input: string
- output: string
- explanation: string (optional, can be empty string)

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
    console.error("ExampleGeneratorAgent Error:", error.message);
    return [];
  }
}

module.exports = { generateExamples };
