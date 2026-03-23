require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const log = require("./logger");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Calls Gemini LLM with automatic fallback to alternative models on rate limits.
 * @param {string} prompt - The prompt to send to the LLM
 * @param {Object} options - Options for the call (temperature, etc.)
 * @returns {string} The raw text response from the LLM
 * @throws {Error} If all models fail or encounter non-rate-limit errors
 */
async function callGeminiWithFallback(prompt, options = {}) {
  const { temperature = 0.2 } = options;

  // Fallback models in order of preference
  const models = [ "gemini-2.5-flash-lite","gemini-2.5-flash" ];

  for (const model of models) {
    try {
      log.info("LLM", `Trying model: ${model}`);

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          temperature: temperature
        }
      });

      const output = response.text || "";
      log.info("LLM", `📨 Received LLM response from ${model} (${output.length} chars)`);

      return output;

    } catch (err) {
      // Check if it's a rate limit error (429) or model not found error (404)
      if (err.status === 429 || err.status === 404 || 
          err.message.includes('429') || err.message.includes('404') || 
          err.message.includes('rate limit') || err.message.includes('quota') ||
          err.message.includes('not found') || err.message.includes('NOT_FOUND')) {
        log.warn("LLM", `Error with ${model} (${err.status || 'unknown status'}), trying next model...`);
        continue; // Try next model
      } else {
        log.error("LLM", `Error with ${model}: ${err.message}`);
        throw err; // For other errors, throw immediately
      }
    }
  }

  // If all models failed
  const errorMsg = "All Gemini models failed or hit rate limits";
  log.error("LLM", errorMsg);
  throw new Error(errorMsg);
}

module.exports = { callGeminiWithFallback };