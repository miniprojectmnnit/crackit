require("dotenv").config();
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const log = require("./logger");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}

/**
 * Returns a configured LangChain Chat model instance.
 * Automatically handles retries and fallback models.
 */
function getLLM(options = {}) {
  const { temperature = 0.2, model = "gemini-2.5-flash" } = options;
  return new ChatGoogleGenerativeAI({
    model: model,
    temperature: temperature,
    apiKey: GEMINI_API_KEY,
    maxRetries: 3,
  });
}

/**
 * Legacy wrapper for backward compatibility during migration.
 * Deprecated: Migrate to using `getLLM()` instead.
 */
async function callGeminiWithFallback(prompt, options = {}) {
  log.warn("LLM", "Using deprecated callGeminiWithFallback. Please migrate to getLLM.");
  const llm = getLLM(options);
  try {
    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    log.error("LLM", `Error calling legacy Gemini wrapper: ${error.message}`);
    throw error;
  }
}

module.exports = { getLLM, callGeminiWithFallback };