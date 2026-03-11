require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const log = require("./logger");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function extractQuestionsWithLLM(text) {

  if (!text || text.trim().length === 0) {
    log.warn("LLM", "Empty text received — skipping extraction");
    return [];
  }

  // Gemini token safety
  const trimmedText = text.slice(0, 48000);
  const wasTrimmed = text.length > 48000;

  log.info("LLM", `🤖 Calling Gemini for question extraction (text: ${trimmedText.length} chars${wasTrimmed ? ', TRIMMED from ' + text.length : ''})`);

  const prompt = `
================ ROLE =================

You are a senior technical interview analyst.

Your job is to extract every interview question that appeared
during an interview experience article.

================ TASK =================

Read the article carefully and extract ALL interview questions.

A question can appear in many forms such as:

• Direct question asked by interviewer
• Coding challenge described in text
• Multiple questions mentioned in a sentence
• A prompt describing a task the candidate had to solve

Example:

"I was asked to reverse a linked list and also find the middle element."

Should produce TWO questions:
- Reverse a linked list
- Find the middle element of a linked list

================ WHAT TO EXTRACT =================

Extract ONLY:

• coding questions
• algorithm problems
• system design questions
• behavioral questions
• conceptual technical questions

================ WHAT TO IGNORE =================

Ignore the following content:

• article headers
• navigation elements
• company introductions
• candidate commentary
• explanations of solutions
• preparation advice
• unrelated storytelling

================ CLASSIFICATION RULES =================

Each question must be classified into ONE category:

Coding
Algorithm or data structure problems.

Behavioral
Questions about teamwork, challenges, leadership, etc.

System Design
Questions about designing large systems, architectures, scalability.

General
Conceptual technical questions (OS, networking, DB, etc).

================ EXTRACTION RULES =================

Ensure that:

• Each question is extracted separately.
• Questions are written clearly and concisely.
• Do NOT include answer explanations.
• Do NOT merge multiple questions into one.

If the article explicitly lists questions, extract ALL of them.

================ OUTPUT FORMAT =================

Return ONLY a valid JSON array.

Each element must follow this schema:

{
  "question_text": string,
  "type": "Coding" | "Behavioral" | "System Design" | "General"
}

Important rules:

• DO NOT include markdown
• DO NOT include explanations
• DO NOT include text outside JSON
• Output must be valid JSON

================ ARTICLE =================

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

    log.info("LLM", `📨 Received LLM response (${output.length} chars)`);

    output = output
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonStart = output.indexOf("[");
    const jsonEnd = output.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      log.warn("LLM", "LLM returned invalid JSON — no array brackets found");
      return [];
    }

    const jsonString = output.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed)) {
      log.warn("LLM", "Parsed output is not an array");
      return [];
    }

    const cleaned = parsed
      .filter(q => q.question_text)
      .map(q => ({
        question_text: q.question_text.trim(),
        type: q.type || "General"
      }));

    log.success("LLM", `✅ Extracted ${cleaned.length} questions (${cleaned.filter(q => q.type === 'Coding').length} Coding, ${cleaned.filter(q => q.type === 'Behavioral').length} Behavioral, ${cleaned.filter(q => q.type === 'System Design').length} System Design, ${cleaned.filter(q => q.type === 'General').length} General)`);

    return cleaned;

  } catch (err) {

    log.error("LLM", `Gemini extraction failed: ${err.message}`);

    return [];
  }
}

module.exports = { extractQuestionsWithLLM };