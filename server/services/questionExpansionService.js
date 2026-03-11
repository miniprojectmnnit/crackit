const { expandProblem } = require("../agents/problemAgent");
const { generateExamples } = require("../agents/exampleAgent");
const { generateTestCases } = require("../agents/testcaseAgent");
const { generateSolution } = require("../agents/solutionAgent");
const log = require("../utils/logger");

async function expandCodingQuestion(questionText) {
  log.info("EXPAND", `🔧 Starting expansion pipeline for: "${questionText.substring(0, 80)}..."`);

  // 1. Run problem expansion first to get title and description
  log.info("EXPAND", `📝 Step 1/2: Expanding problem details...`);
  const problemDetails = await expandProblem(questionText);
  if (!problemDetails) {
    log.warn("EXPAND", `Problem expansion returned null — aborting pipeline`);
    return null;
  }
  log.success("EXPAND", `✅ Problem expanded — title: "${problemDetails.title}", difficulty: ${problemDetails.difficulty}`);

  // 2. Run the rest in parallel using the generated description
  log.info("EXPAND", `⚡ Step 2/2: Running parallel agents (examples, test cases, solution)...`);
  const [examples, test_cases, solutionDetails] = await Promise.all([
    generateExamples(questionText, problemDetails.description),
    generateTestCases(questionText, problemDetails.description),
    generateSolution(questionText, problemDetails.description)
  ]);

  const exampleCount = examples && Array.isArray(examples) ? examples.length : 0;
  const testCaseCount = test_cases && Array.isArray(test_cases) ? test_cases.length : 0;
  const hasSolution = !!(solutionDetails && solutionDetails.solution);

  log.success("EXPAND", `✅ Expansion complete — ${exampleCount} examples, ${testCaseCount} test cases, solution: ${hasSolution ? 'yes' : 'no'}`);

  return {
    title: problemDetails.title,
    description: problemDetails.description,
    constraints: problemDetails.constraints,
    difficulty: problemDetails.difficulty,
    tags: problemDetails.tags,
    examples: examples && Array.isArray(examples) ? examples : [],
    test_cases: test_cases && Array.isArray(test_cases) ? test_cases : [],
    solution: solutionDetails ? solutionDetails.solution : ""
  };
}

module.exports = { expandCodingQuestion };
