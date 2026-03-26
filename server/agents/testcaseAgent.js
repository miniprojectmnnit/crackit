const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const testcaseSchema = z.object({
  testcases: z.array(z.object({
    input: z.string().describe("The exact parameters passed to the function (e.g. `[1,2,3]` or `nums=[1,2], target=3`)"),
    expected_output: z.string().describe("The exact output that the correct algorithm should return")
  })).length(5).describe("Exactly 5 test cases")
});

const testcasePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior software tester responsible for designing test cases for coding interview problems.
Your goal is to generate test cases that thoroughly validate a candidate's solution.

TEST CASE STRATEGY:
Generate EXACTLY 5 test cases including:
1. Basic Case
2. Typical Case 1
3. Typical Case 2
4. Edge Case (e.g. empty, duplicate, negative)
5. Tricky Case

CRITICAL CONSTRAINT: You are an AI model, and you cannot reliably calculate complex algorithms (like Dynamic Programming or Graph traversals) in your head on large inputs. 
THEREFORE: ALL test case arrays or inputs MUST be VERY SMALL (maximum 5 items). Do NOT generate "large" or "performance" test cases. Keep inputs extremely simple so you can algebraically calculate the 100% mathematically accurate expected output. Generate answers manually with extreme care.`],
  ["user", `================ PROBLEM =================
Question:
"{question_text}"

Description:
"{description}"`]
]);

async function generateTestCases(questionText, description) {
  try {
    const llm = getLLM({ temperature: 0.2 });
    const structuredLlm = llm.withStructuredOutput(testcaseSchema);
    const chain = testcasePrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      question_text: questionText,
      description: description
    });
    
    return result.testcases;

  } catch (error) {
    console.error("TestCaseAgent Error:", error.message);
    return [];
  }
}

module.exports = { generateTestCases };