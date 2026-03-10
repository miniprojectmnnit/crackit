const { ai } = require("../utils/geminiClient");

async function expandProblem(questionText) {
  const prompt = `
You are an expert algorithm problem writer.
Expand the following extracted interview question into a full coding problem description.

Question: "${questionText}"

Return ONLY a valid JSON object with these keys:
- title: string
- description: string (Markdown formatted problem description)
- constraints: string (Markdown formatted constraints)
- difficulty: string (One of: "Easy", "Medium", "Hard")
- tags: array of strings

Do NOT include any markdown block wrappers (like \`\`\`json). Just the JSON.
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
    console.error("ProblemExpansionAgent Error:", error.message);
    return null;
  }
}

module.exports = { expandProblem };
