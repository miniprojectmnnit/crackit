//It links together every individual service we've discussed: it takes the raw user code, prepares it, sends it to the cloud to be executed, and then grades the results.
const log = require("../utils/logger");
const { getLanguageId, submitToJudge0 } = require("./judge0Service");
const { injectCode } = require("../utils/codeInjector");
const { runComparisonEngine } = require("./comparisonService");

/**
 * Main Execution Pipeline for grading user code.
 */
async function executeCodePipeline(userCode, language, questionDetails, testCases) {
  log.info("EXECUTION_ENGINE", `Starting execution pipeline for language: ${language}`);

  if (!userCode || !language || !questionDetails) {
    throw new Error("Missing required arguments for execution pipeline (userCode, language, questionDetails)");
  }

  const languageId = getLanguageId(language);
  if (!languageId) {
    throw new Error(`Unsupported language or no Judge0 mapping found for: ${language}`);
  }

  try {
    // 1. Inject Code into Driver Template
    const runnableCode = injectCode(userCode, language, questionDetails, testCases);
    log.debug("EXECUTION_ENGINE", `Code injected successfully. Length: ${runnableCode.length}`);

    // 2. Submit to Judge0
    const judge0Result = await submitToJudge0(runnableCode, languageId);

    // Check if there was a compilation or execution error stopping the script entirely
    if (judge0Result.compile_output || judge0Result.stderr) {
      log.warn("EXECUTION_ENGINE", `Judge0 Compilation/Execution Error: ${judge0Result.compile_output || judge0Result.stderr}`);
      return {
        passed: 0,
        failed: testCases.length,
        error: judge0Result.compile_output || judge0Result.stderr,
        results: []
      };
    }

    if (!judge0Result.stdout) {
      log.warn("EXECUTION_ENGINE", "Judge0 returned empty stdout. Possible timeout or early exit.");
      return {
        passed: 0,
        failed: testCases.length,
        error: "Execution returned no output. Check for infinite loops or syntax errors.",
        results: []
      };
    }

    // 3. Run Deep Comparison Engine
    const finalResult = runComparisonEngine(testCases, judge0Result.stdout);

    // Attach resource usage
    finalResult.time = judge0Result.time;
    finalResult.memory = judge0Result.memory;

    log.success("EXECUTION_ENGINE", `Pipeline finished. Passed: ${finalResult.passed}/${testCases.length}`);
    return finalResult;

  } catch (error) {
    log.error("EXECUTION_ENGINE", `Pipeline error: ${error.message}`);
    return {
      passed: 0,
      failed: testCases.length,
      error: error.message,
      results: []
    };
  }
}

module.exports = { executeCodePipeline };
