const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const exampleSchema = z.object({
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().describe("1-3 sentences explaining why the output is correct")
  })).min(2).max(3).describe("2 or 3 clear educational examples")
});

const examplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior algorithm problem designer and competitive programming educator.
Your task is to generate clear, educational examples for a coding interview problem.

EXAMPLE GENERATION RULES:
1. The first example should be a simple, easy-to-understand case.
2. The second example should show a more interesting case that demonstrates the main logic.
3. If possible, the third example should show an edge case.`],
  ["user", `================ PROBLEM CONTEXT =================
Problem Title / Question:
"{question_text}"

Problem Description:
"{description}"`]
]);

async function generateExamples(questionText, description) {
  try {
    const llm = getLLM({ temperature: 0.2 });
    const structuredLlm = llm.withStructuredOutput(exampleSchema);
    const chain = examplePrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      question_text: questionText,
      description: description
    });
    
    return result.examples;

  } catch (error) {
    console.error("ExampleGeneratorAgent Error:", error.message);
    return [];
  }
}

module.exports = { generateExamples };