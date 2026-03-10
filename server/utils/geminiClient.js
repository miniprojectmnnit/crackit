require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

module.exports = { ai };
