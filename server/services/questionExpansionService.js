//it uses langgraph that take a simple, raw interview question and expand it into a professional, LeetCode-style technical challenge.

const { questionExpansionApp } = require("../graphs/questionExpansionGraph");
const log = require("../utils/logger");

async function expandCodingQuestion(questionText) {
  log.info("EXPAND", `🔧 Starting LangGraph expansion pipeline for: "${questionText.substring(0, 80)}..."`);

  try {
    const resultState = await questionExpansionApp.invoke({ questionText });

    const problemDetails = resultState.problemDetails;
    const examples = resultState.examples;
    const test_cases = resultState.testCases;
    const solutionDetails = resultState.solutionDetails;

    const exampleCount = examples && Array.isArray(examples) ? examples.length : 0;
    const testCaseCount = test_cases && Array.isArray(test_cases) ? test_cases.length : 0;
    const hasSolution = !!(solutionDetails && solutionDetails.solution);

    log.success("EXPAND", `✅ LangGraph Expansion complete — ${exampleCount} examples, ${testCaseCount} test cases, solution: ${hasSolution ? 'yes' : 'no'}`);

    return {
      title: problemDetails.title,
      description: problemDetails.description,
      constraints: problemDetails.constraints,
      difficulty: problemDetails.difficulty,
      tags: problemDetails.tags,
      method_name: problemDetails.method_name,
      parameters: problemDetails.parameters,
      return_type: problemDetails.return_type,
      examples: examples && Array.isArray(examples) ? examples : [],
      test_cases: test_cases && Array.isArray(test_cases) ? test_cases : [],
      solution: solutionDetails ? solutionDetails.solution : ""
    };
  } catch (error) {
    log.error("EXPAND", `LangGraph expansion failed: ${error.message}`);
    return null;
  }
}

module.exports = { expandCodingQuestion };
