const { StateGraph, START, END, Annotation } = require("@langchain/langgraph");
const { expandProblem } = require("../agents/problemAgent");
const { generateExamples } = require("../agents/exampleAgent");
const { generateTestCases } = require("../agents/testcaseAgent");
const { generateSolution } = require("../agents/solutionAgent");
const log = require("../utils/logger");

// Define the state schema
//The State Schema (The Clipboard)
//In LangGraph, the State is a shared object that travels through the graph. Every "Node" (agent) reads from this clipboard and writes its findings back onto it. This ensures that the generateTestCases agent knows exactly what the expandProblem agent decided the problem was about.
const StateAnnotation = Annotation.Root({
  questionText: Annotation(), // Input
  problemDetails: Annotation(),
  examples: Annotation(),
  testCases: Annotation(),
  solutionDetails: Annotation()
});

//This is the first stop. It takes the raw user input and turns it into a formal problem description, title, and constraints. Everything else in the graph depends on this output.
async function expandProblemNode(state) {
  log.info("GRAPH", `Running expandProblem node for: "${state.questionText.substring(0, 40)}..."`);
  const result = await expandProblem(state.questionText);
  if (!result) {
    throw new Error("Problem expansion returned null");
  }
  return { problemDetails: result };
}

//optimization hence using promise.all
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
//This is where you draw the map of how data flows:
const workflow = new StateGraph(StateAnnotation)
  .addNode("expandProblem", expandProblemNode)
  .addNode("generateParallel", generateParallelNode)
  .addEdge(START, "expandProblem")
  .addEdge("expandProblem", "generateParallel")
  .addEdge("generateParallel", END);

const questionExpansionApp = workflow.compile();

module.exports = { questionExpansionApp };
