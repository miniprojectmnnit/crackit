require("dotenv").config();
const { ChatGroq } = require("@langchain/groq");
const log = require("./logger");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  log.error("LLM", "GROQ_API_KEY not found in environment variables. Code will fail until it is added.");
}

/**
 * Returns a configured LangChain Chat model instance (Groq).
 * Automatically handles retries and fallback models.
 */
function getLLM(options = {}) {
  const { temperature = 0.2, model = "llama-3.3-70b-versatile" } = options;
  return new ChatGroq({
    model: model,
    temperature: temperature,
    apiKey: GROQ_API_KEY,
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
    log.error("LLM", `Error calling legacy wrapper: ${error.message}`);
    throw error;
  }
}

module.exports = { getLLM, callGeminiWithFallback };