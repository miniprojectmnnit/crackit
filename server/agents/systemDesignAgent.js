/**
 * System Design Agent — generates targeted system design interview questions.
 *
 * Tailors questions based on:
 *  - Candidate's role (frontend, backend, fullstack, etc.)
 *  - Years of experience (entry, mid, senior)
 *  - Company target (e.g. fintech → payment systems)
 */

const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const log = require("../utils/logger");

const schema = z.object({
  questions: z.array(z.string()).describe("List of system design interview questions")
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior engineering manager conducting a system design interview.
Generate {count} system design questions tailored to the candidate's profile.

DIFFICULTY GUIDE:
- 0-1 years: High-level design, single-service (e.g., "Design a URL shortener")
- 2-4 years: Multi-service, scalability (e.g., "Design a notification service for 10M users")
- 5+ years: Large-scale distributed systems, trade-offs (e.g., "Design Twitter's newsfeed at scale")

GUIDELINES:
- Match the complexity to the candidate's seniority
- If a target company is provided, include a question relevant to their domain
- Questions should sound natural when spoken aloud in a voice interview
- Mix: 1-2 conceptual (CAP theorem, caching), rest are design problems`],
  ["user", `Candidate Profile:
Role: {role}
Years of Experience: {experience}
Target Company: {company}
Technical Skills: {skills}

Generate {count} system design interview questions now.`]
]);

/**
 * Generate system design questions for the candidate.
 *
 * @param {object} resumeProfile - Parsed resume
 * @param {object} context - { role, experience, company, focusArea }
 * @param {number} count - Number of questions (default 10)
 * @returns {Promise<string[]>}
 */
async function generateSystemDesignQuestions(resumeProfile, context = {}, count = 10) {
  const skills = resumeProfile?.technical_skills?.join(", ") || "General Software";
  const role = context.role || "Software Engineer";
  const experience = context.experience ? `${context.experience} years` : "Entry Level";
  const company = context.company || "a tech company";

  log.info("SD_AGENT", `🏗️  Generating ${count} System Design questions for ${role} (${experience}) targeting ${company}`);

  try {
    const llm = getLLM({ temperature: 0.7 });
    const chain = prompt.pipe(llm.withStructuredOutput(schema));
    const result = await chain.invoke({ role, experience, company, skills, count });
    log.success("SD_AGENT", `✅ Generated ${result.questions.length} system design questions`);
    return result.questions;
  } catch (err) {
    log.error("SD_AGENT", `Failed: ${err.message}`);
    // Sensible fallback questions
    return [
      "How would you design a URL shortening service like bit.ly?",
      "Can you walk me through the design of a rate limiting system?",
      "How would you design a distributed cache?",
      "Explain the architecture you would use for a real-time chat application.",
      "How would you design a scalable notification system?",
      "What are the trade-offs between SQL and NoSQL for a social media platform?",
      "How would you handle data consistency in a distributed system?",
      "Design a file storage service like Google Drive.",
      "How would you implement a search autocomplete feature?",
      "Explain how you would design a ride-sharing service's backend."
    ].slice(0, count);
  }
}

module.exports = { generateSystemDesignQuestions };
