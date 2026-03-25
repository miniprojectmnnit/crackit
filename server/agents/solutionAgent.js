const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const solutionSchema = z.object({
  solution: z.string().describe("The best algorithmic JavaScript snippet implementing function solve(...)"),
  time_complexity: z.string().describe("Explain the Big-O time complexity (e.g. O(n))"),
  space_complexity: z.string().describe("Explain memory usage (e.g. O(1))")
});

const solutionPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior software engineer and algorithm expert who writes optimal solutions for technical interview coding problems.
Your goal is to provide a correct and efficient JavaScript solution that could pass coding platform test cases.

SOLUTION REQUIREMENTS:
- be written in JavaScript (Node.js compatible)
- implement a function named **solve**
- handle edge cases
- follow clean coding practices
- include helpful comments explaining the logic

ALGORITHM GUIDELINES:
Prefer optimal solutions (Hash maps, Two pointers, Binary search, sliding window). Avoid brute force unless problem is Easy.`],
  ["user", `================ PROBLEM =================
Question:
"{question_text}"

Description:
"{description}"`]
]);

async function generateSolution(questionText, description) {
  try {
    const llm = getLLM({ temperature: 0.2 });
    const structuredLlm = llm.withStructuredOutput(solutionSchema);
    const chain = solutionPrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      question_text: questionText,
      description: description
    });
    return result;

  } catch (error) {
    console.error("SolutionAgent Error:", error.message);
    return null;
  }
}

module.exports = { generateSolution };