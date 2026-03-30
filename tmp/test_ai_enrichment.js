const path = require('path');
const root = 'f:/Agentic Ai/crackit';
const { generateCodeMetadata } = require(path.join(root, 'server/agents/codeGeneratorAgent'));

async function test() {
  const title = "Lucky Numbers in a Matrix";
  const description = "Given an m x n matrix of distinct numbers, return all lucky numbers in the matrix in any order. A lucky number is the element which is the minimum in its row and the maximum in its column.";
  const examples = [
    "Input: matrix = [[3,7,8],[9,11,13],[15,16,17]]\nOutput: [15]\nExplanation: 15 is the only lucky number since it is the minimum in its row and the maximum in its column."
  ];

  console.log("Calling AI enrichment...");
  const result = await generateCodeMetadata(title, description, examples, "C++");
  console.log("AI Result:", JSON.stringify(result, null, 2));
}

test().catch(console.error);
