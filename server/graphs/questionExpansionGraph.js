const { StateGraph, START, END, Annotation } = require("@langchain/langgraph");
const { expandProblem } = require("../agents/problemAgent");
const { generateExamples } = require("../agents/exampleAgent");
const { generateTestCases } = require("../agents/testcaseAgent");
const { generateSolution } = require("../agents/solutionAgent");
const log = require("../utils/logger");

// Define the state schema
const StateAnnotation = Annotation.Root({
  questionText: Annotation(), // Input
  problemDetails: Annotation(),
  examples: Annotation(),
  testCases: Annotation(),
  solutionDetails: Annotation()
});

async function expandProblemNode(state) {
  log.info("GRAPH", `Running expandProblem node for: "${state.questionText.substring(0, 40)}..."`);
  const result = await expandProblem(state.questionText);
  if (!result) {
    throw new Error("Problem expansion returned null");
  }
  return { problemDetails: result };
}

async function generateParallelNode(state) {
  log.info("GRAPH", `Running parallel generators node...`);
  const desc = state.problemDetails.description;
  const qText = state.questionText;
  
  const [examples, testCases, solution] = await Promise.all([
    generateExamples(qText, desc),
    generateTestCases(qText, desc),
    generateSolution(qText, desc)
  ]);
  
  return { examples, testCases, solutionDetails: solution };
}

const workflow = new StateGraph(StateAnnotation)
  .addNode("expandProblem", expandProblemNode)
  .addNode("generateParallel", generateParallelNode)
  .addEdge(START, "expandProblem")
  .addEdge("expandProblem", "generateParallel")
  .addEdge("generateParallel", END);

const questionExpansionApp = workflow.compile();

module.exports = { questionExpansionApp };
