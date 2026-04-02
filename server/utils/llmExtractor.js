require("dotenv").config();
const { z } = require("zod");
const log = require("./logger");
const { getLLM } = require("./llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const extractSchema = z.object({
  questions: z.array(z.object({
    question_text: z.string().describe("The text of the question extracted"),
    type: z.enum(["Coding", "Behavioral", "System Design", "General"]).describe("The category of the question")
  })).describe("An array of extracted interview questions")
});

const extractorPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior technical interview analyst.
Your job is to extract every interview question that appeared during an interview experience article.

WHAT TO EXTRACT:
- coding questions
- algorithm problems
- system design questions
- behavioral questions
- conceptual technical questions

WHAT TO IGNORE:
- article headers, navigation elements, company intros, solutions, commentary

CLASSIFICATION RULES:
- Coding: Algorithm problems, data structures, or code-related questions. If it asks to solve a problem with a function, it is CODING.
- Behavioral: Teamwork, challenges, leadership, and experience.
- System Design: Large systems, architectures, scalability, and design.
- General: Knowledge-based questions (OS, Networking, DBMS) that DON'T require coding a solution.
`],
  ["user", `================ ARTICLE =================
{article_text}`]
]);

async function extractQuestionsWithLLM(text) {
  if (!text || text.trim().length === 0) {
    log.warn("LLM", "Empty text received — skipping extraction");
    return [];
  }

  // Gemini token safety
  const trimmedText = text.slice(0, 48000);
  const wasTrimmed = text.length > 48000;

  log.info("LLM", `🤖 Calling LangChain for question extraction (text: ${trimmedText.length} chars${wasTrimmed ? ', TRIMMED from ' + text.length : ''})`);

  try {
    const llm = getLLM({ temperature: 0.2 });
    const structuredLlm = llm.withStructuredOutput(extractSchema);
    const chain = extractorPrompt.pipe(structuredLlm);

    const result = await chain.invoke({ article_text: trimmedText });
    
    const cleaned = (result.questions || [])
      .filter(q => q.question_text)
      .map(q => ({
        question_text: q.question_text.trim(),
        type: q.type || "General"
      }));

    log.success("LLM", `✅ Extracted ${cleaned.length} questions (${cleaned.filter(q => q.type === 'Coding').length} Coding, ${cleaned.filter(q => q.type === 'Behavioral').length} Behavioral, ${cleaned.filter(q => q.type === 'System Design').length} System Design, ${cleaned.filter(q => q.type === 'General').length} General)`);

    return cleaned;

  } catch (err) {
    log.error("LLM", `LangChain extraction failed: ${err.message}`);
    return [];
  }
}

module.exports = { extractQuestionsWithLLM };