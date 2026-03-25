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
2. Typical Case
3. Edge Case (e.g. empty, duplicate, negative)
4. Large Case (performance)
5. Tricky Case

Ensure all testcases are different, outputs are logically correct, and inputs are realistic.`],
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