const { expandProblem } = require("../agents/problemAgent");
const { generateExamples } = require("../agents/exampleAgent");
const { generateTestCases } = require("../agents/testcaseAgent");
const { generateSolution } = require("../agents/solutionAgent");

async function expandCodingQuestion(questionText) {
  // 1. Run problem expansion first to get title and description
  const problemDetails = await expandProblem(questionText);
  if (!problemDetails) return null;

  // 2. Run the rest in parallel using the generated description
  const [examples, test_cases, solutionDetails] = await Promise.all([
    generateExamples(questionText, problemDetails.description),
    generateTestCases(questionText, problemDetails.description),
    generateSolution(questionText, problemDetails.description)
  ]);

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
