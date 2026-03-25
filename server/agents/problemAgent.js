const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const problemSchema = z.object({
  title: z.string().describe("Short and descriptive title"),
  description: z.string().describe("Clearly explain the problem statement in clean Markdown format"),
  constraints: z.string().describe("Provide realistic constraints as Markdown bullet points"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  tags: z.array(z.string()).min(2).max(5).describe("Relevant algorithmic tags (e.g. Arrays, HashMap, Two Pointers)")
});

const problemPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior algorithm problem designer who writes coding interview questions for competitive programming platforms.
Your job is to transform a short interview question into a complete, well-structured coding problem similar to those seen on technical interview platforms.

PROBLEM DESIGN GUIDELINES:
1. Title: Short and descriptive
2. Description: Define input, output, and the task clearly in Markdown.
3. Constraints: Provide realistic algorithmic constraints as Markdown bullets.
4. Difficulty Classification:
   - Easy: Simple logic, O(n) or O(n log n).
   - Medium: Algorithmic thinking (hash maps, two pointers).
   - Hard: Advanced (DP, graphs, optimizations).
5. Tags: 2-5 relevant tags.`],
  ["user", `================ INPUT QUESTION =================
"{question_text}"`]
]);

async function expandProblem(questionText) {
  try {
    const llm = getLLM({ temperature: 0.2 });
    const structuredLlm = llm.withStructuredOutput(problemSchema);
    const chain = problemPrompt.pipe(structuredLlm);

    const result = await chain.invoke({ question_text: questionText });
    return result;

  } catch (error) {
    console.error("ProblemExpansionAgent Error:", error.message);
    return null;
  }
}

module.exports = { expandProblem };