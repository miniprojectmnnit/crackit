const { inferType, parseExamplesToTestCases } = require('./server/agents/dsaAgent');

// Mock data for Climbing Stairs
const examples = [
  "Input: n = 2\nOutput: 2\nExplanation: ...",
  "Input: n = 3\nOutput: 3\nExplanation: ..."
];

const result = parseExamplesToTestCases(examples);
console.log("Parsed result:", JSON.stringify(result, null, 2));

const { generateCodeTemplate } = require('./client/src/pages/InterviewSimulation/utils/codeTemplate');
const question = {
  title: "Climbing Stairs",
  method_name: "climbingStairs",
  parameters: result.parameters,
  return_type: result.return_type,
  description: "It takes n steps to reach the top."
};

console.log("\nGenerated Template (C++):");
const template = generateCodeTemplate(question, "C++");
console.log(template);
