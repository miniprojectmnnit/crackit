require("dotenv").config();
const { ChatGroq } = require("@langchain/groq");
const log = require("./logger");
const requestContext = require("./requestContext");

/**
 * Returns a configured LangChain Chat model instance (Groq).
 * Automatically handles retries and fallback models.
 */
function getLLM(options = {}) {
  const { temperature = 0.2, model = "llama-3.3-70b-versatile", apiKey: manualKey } = options;
  const ctx = requestContext.getStore() || {};
  
  // Use manual key, then context keys, then process.env
  let keysToUse = [];
  if (manualKey) {
    keysToUse = [manualKey];
  } else if (ctx.apiKeys && ctx.apiKeys.length > 0) {
    keysToUse = ctx.apiKeys.map(k => typeof k === 'object' ? k.value : k);
  } else {
    keysToUse = [process.env.GROQ_API_KEY].filter(Boolean);
  }
  
  if (keysToUse.length === 0) {
    log.error("LLM", `❌ No keys available for model ${model}. Dynamic keys count: ${ctx.apiKeys?.length || 0}, Env key present: ${!!process.env.GROQ_API_KEY}`);
    return new ChatGroq({
      model: model,
      temperature: temperature,
      apiKey: "dummy",
      maxRetries: 1,
    });
  } else {
    log.info("LLM", `🔗 Using ${keysToUse.length} key(s) for ${model} (${(ctx.apiKeys && ctx.apiKeys.length > 0) ? 'from USER WALLET' : 'from SERVER ENV'})`);
  }

  // Create an array of models, one for each key
  const models = keysToUse.map(key => new ChatGroq({
    model: model,
    temperature: temperature,
    apiKey: key,
    maxRetries: 1, // Let fallback handle exhaustion
  }));

  const primaryModel = models[0];

  // If there are multiple keys, setup Langchain fallbacks
  if (models.length > 1) {
    const fallbackRunnable = primaryModel.withFallbacks({ 
      fallbacks: models.slice(1) 
    });

    // Patch withStructuredOutput to apply the schema to all underlying models
    // before wrapping them back in a fallback runnable. This prevents breaking
    // the .withStructuredOutput() calls used across all agent files.
    fallbackRunnable.withStructuredOutput = function(schema, config) {
      const primaryStructured = primaryModel.withStructuredOutput(schema, config);
      const fallbackStructured = models.slice(1).map(m => m.withStructuredOutput(schema, config));
      return primaryStructured.withFallbacks({ fallbacks: fallbackStructured });
    };

    return fallbackRunnable;
  }

  return primaryModel;
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