/**
 * HR Agent — generates behavioral/HR interview questions.
 *
 * Strategy (in priority order):
 * 1. Scrape GFG for HR/Behavioral questions specific to the target company.
 * 2. If enough questions found (≥ 5), return them + supplement with LLM if needed.
 * 3. If GFG has nothing, fall back to LLM-generated general HR questions.
 */

const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const { scrapeInterviewExperiences } = require("../tools/scrapers/index");
const log = require("../utils/logger");

const MIN_SCRAPED = 4; // Minimum scraped questions before using them

const schema = z.object({
  questions: z.array(z.string()).describe("List of HR/behavioral interview questions")
});

const hrPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior HR interviewer conducting a behavioral interview.
Generate {count} HR/behavioral questions tailored to the candidate.

GUIDELINES:
- Use the STAR method context (Situation, Task, Action, Result)
- Mix question types: self-reflection, teamwork, conflict resolution, leadership, motivation
- Tailor questions to the candidate's experience level and role
- If a company is provided, include 1-2 company-specific culture/values questions
- Sound natural in a voice interview — conversational, not robotic
- Avoid generic questions like "Tell me your strengths" — make them specific and probing`],
  ["user", `Candidate:
Role: {role}
Experience: {experience}
Target Company: {company}
Background skills: {skills}

{scraped_context}

Generate {count} behavioral/HR interview questions now.`]
]);

/**
 * Generate HR interview questions.
 *
 * @param {object} resumeProfile - Parsed resume
 * @param {object} context - { role, experience, company }
 * @param {number} count - Total questions to return (default 10)
 * @returns {Promise<string[]>}
 */
async function generateHrQuestions(resumeProfile, context = {}, count = 10) {
  const role = context.role || "Software Engineer";
  const experience = context.experience ? `${context.experience} years` : "Entry Level";
  const company = context.company || "";
  const skills = resumeProfile?.technical_skills?.join(", ") || "General Software";

  log.info("HR_AGENT", `🤝 Generating ${count} HR questions for ${company || "general"}`);

  // ── Step 1: Try GFG scraper for company-specific HR questions ───────────────
  let scraped = [];
  if (company) {
    try {
      log.info("HR_AGENT", `🔍 Scraping GFG for "${company}" HR questions...`);
      const all = await scrapeInterviewExperiences(company, {
        platform: "gfg",
        questionType: "HR/Behavioral",
        maxArticles: 10
      });
      scraped = all.map((r) => r.question).filter((q) => q && q.length > 10);
      log.info("HR_AGENT", `📦  GFG returned ${scraped.length} HR questions for ${company}`);
    } catch (err) {
      log.warn("HR_AGENT", `GFG scrape failed: ${err.message} — will use LLM fallback`);
    }
  }

  // ── Step 2: Determine how many LLM questions we need ───────────────────────
  const useScraped = scraped.length >= MIN_SCRAPED;
  const llmCount = useScraped ? Math.max(0, count - scraped.length) : count;

  let llmQuestions = [];
  if (llmCount > 0) {
    const scrapedCtx = useScraped
      ? `\nHere are some actual interview questions reported by past candidates at ${company}:\n${scraped.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nGenerate ${llmCount} additional complementary questions.`
      : "Generate general behavioral/HR interview questions appropriate for this candidate.";

    try {
      const llm = getLLM({ temperature: 0.7 });
      const chain = hrPrompt.pipe(llm.withStructuredOutput(schema));
      const result = await chain.invoke({
        role, experience, company: company || "a tech company", skills,
        count: llmCount,
        scraped_context: scrapedCtx
      });
      llmQuestions = result.questions || [];
      log.success("HR_AGENT", `✅ LLM generated ${llmQuestions.length} HR questions`);
    } catch (err) {
      log.error("HR_AGENT", `LLM fallback failed: ${err.message}`);
      llmQuestions = defaultHrQuestions(count);
    }
  }

  // ── Step 3: Combine and return ──────────────────────────────────────────────
  const combined = useScraped
    ? [...scraped.slice(0, count - llmQuestions.length), ...llmQuestions]
    : llmQuestions;

  return combined.slice(0, count);
}

function defaultHrQuestions(count) {
  const fallback = [
    "Tell me about yourself and what led you to pursue software engineering.",
    "Describe a challenging project you worked on. What made it difficult and how did you overcome it?",
    "Tell me about a time you had a conflict with a team member. How did you resolve it?",
    "How do you prioritize tasks when you have multiple deadlines?",
    "Describe a situation where you had to learn a new technology quickly. How did you approach it?",
    "Tell me about a time you made a mistake at work. What did you learn from it?",
    "How do you handle feedback from code reviews or performance reviews?",
    "Describe your experience working in a team. What role do you typically take?",
    "Where do you see yourself in 3-5 years, and how does this role fit into that path?",
    "Why are you interested in joining us, and what do you know about our company?"
  ];
  return fallback.slice(0, count);
}

module.exports = { generateHrQuestions };
