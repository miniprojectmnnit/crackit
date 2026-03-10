require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Extract interview questions from article text using Gemini.
 */
async function extractQuestionsWithLLM(text) {

  if (!text || text.trim().length === 0) return [];

  // Increase token usage limit significantly
  const trimmedText = text.slice(0, 48000);

  const prompt = `
You are an expert interview question extractor.

TASK:
Extract EVERY SINGLE interview question, prompt, or technical concept asked during the interview from the article text. Do not miss any question. If the user mentions "I was asked X and Y", extract both X and Y as separate questions.

IGNORE:
- navigation text
- advertisements
- headers
- explanations
- company descriptions

CLASSIFY each question as ONE of:
Coding
Behavioral
System Design
General

OUTPUT FORMAT:
Return ONLY a JSON array.

Example:
[
  {"question_text":"Reverse a linked list.","type":"Coding"},
  {"question_text":"Tell me about a challenge you faced.","type":"Behavioral"}
]

Article:
${trimmedText}
`;

  try {

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2
      }
    });

    let output = response.text || "";

    // Remove markdown if LLM adds it
    output = output
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON safely
    const jsonStart = output.indexOf("[");
    const jsonEnd = output.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      console.warn("LLM returned invalid JSON");
      return [];
    }

    const jsonString = output.substring(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed)) return [];

    // Validate objects
    const cleaned = parsed
      .filter(q => q.question_text)
      .map(q => ({
        question_text: q.question_text.trim(),
        type: q.type || "General"
      }));

    return cleaned;

  } catch (err) {

    console.error("Gemini extraction failed:", err.message);

    return []; // fail gracefully
  }
}

module.exports = { extractQuestionsWithLLM };