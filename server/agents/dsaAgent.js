/**
 * DSA Agent — selects 3 questions for the DSA interview round.
 *
 * Strategy (in priority order):
 * 1. If a company is selected, fetch questions from company_questions.json
 *    (1 Easy + 1 Medium + 1 Hard). Picks randomly from each difficulty pool.
 * 2. If the company is not found or no company is provided, fall back to
 *    the generic question bank (example.json).
 *
 * Always returns exactly: 1 Easy + 1 Medium + 1 Hard question.
 */

const path = require("path");
const fs = require("fs");
const log = require("../utils/logger");
const Question = require("../models/Question");

// ── Data sources ──────────────────────────────────────────────────────────────
const GENERIC_BANK = require(path.join(__dirname, "../data/example.json"));

const COMPANY_QUESTIONS_PATH = path.join(__dirname, "../data/company_questions.json");
let COMPANY_QUESTIONS = null;

// Lazy-load company_questions.json (it's ~1.2 MB — load once and cache)
function loadCompanyQuestions() {
  if (COMPANY_QUESTIONS) return COMPANY_QUESTIONS;
  try {
    const raw = fs.readFileSync(COMPANY_QUESTIONS_PATH, "utf-8");
    COMPANY_QUESTIONS = JSON.parse(raw);
    log.success("DSA_AGENT", `📂 Loaded company_questions.json (${Object.keys(COMPANY_QUESTIONS).length} companies)`);
    return COMPANY_QUESTIONS;
  } catch (err) {
    log.error("DSA_AGENT", `Failed to load company_questions.json: ${err.message}`);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Score relevance of a question to a list of skills (for generic bank).
 */
function relevanceScore(q, skills) {
  if (!skills?.length) return 0;
  const combined = `${q.title} ${q.topic} ${q.description}`.toLowerCase();
  return skills.filter((s) => combined.includes(s.toLowerCase())).length;
}

/**
 * Pick the most relevant question from a generic pool, or random if no match.
 */
function pickMostRelevant(pool, skills) {
  const scored = pool.map((q) => ({ q, score: relevanceScore(q, skills) }));
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return scored[0].q;
}

/**
 * Pick a random question from a company-specific difficulty pool.
 */
function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Try to find the company in company_questions.json (case-insensitive match).
 */
function findCompanyData(companyName) {
  const data = loadCompanyQuestions();
  if (!data || !companyName) return null;

  // Exact match first
  if (data[companyName]) return { key: companyName, data: data[companyName] };

  // Case-insensitive search
  const lowerTarget = companyName.toLowerCase();
  for (const key of Object.keys(data)) {
    if (key.toLowerCase() === lowerTarget) {
      return { key, data: data[key] };
    }
  }

  return null;
}

/**
 * Parse string-based examples from company_questions.json into structured objects.
 * Format expected: "Input: num = 5\nOutput: 10\nExplanation: ..."
 */
function parseExamplesToTestCases(examplesArray) {
  if (!examplesArray || !Array.isArray(examplesArray)) return { examples: [], test_cases: [] };

  const parsedExamples = [];
  const testCases = [];

  examplesArray.forEach(exStr => {
    if (typeof exStr !== 'string') return;

    // Matches "Input: ... " until newline or "Output:"
    const inputMatch = exStr.match(/Input:\s*(.*?)(?=\n|Output:|$)/si);
    // Matches "Output: ... " until newline or "Explanation:"
    const outputMatch = exStr.match(/Output:\s*(.*?)(?=\n|Explanation:|$)/si);
    const explanationMatch = exStr.match(/Explanation:\s*(.*)/si);

    if (inputMatch && outputMatch) {
      const input = inputMatch[1].trim();
      const output = outputMatch[1].trim();
      const explanation = explanationMatch ? explanationMatch[1].trim() : "";

      parsedExamples.push({ input, output, explanation });
      testCases.push({ input, expected_output: output });
    }
  });

  return { examples: parsedExamples, test_cases: testCases };
}

// ── Database Helper ───────────────────────────────────────────────────────────

async function createOrUpdateDsaQuestion(qData, difficulty) {
  let description = qData.desc || qData.description || "";

  if (qData.examples && Array.isArray(qData.examples) && qData.examples.length > 0) {
    description += "\n\nExamples:\n" + qData.examples.map((ex, i) => `Example ${i + 1}:\n${ex}`).join("\n\n");
  }

  if (qData.constraints && Array.isArray(qData.constraints) && qData.constraints.length > 0) {
    description += "\n\nConstraints:\n- " + qData.constraints.join("\n- ");
  }

  if (description) {
    if (qData.link) {
      description += `\n\nProblem Link: ${qData.link}`;
    }
  } else if (qData.link) {
    description = `Please solve the following problem: ${qData.link}`;
  }

  const normalizedText = (qData.title + " " + (qData.link || "")).substring(0, 100).toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now().toString();

  const { examples, test_cases } = parseExamplesToTestCases(qData.examples);

  let questionDoc = await Question.findOne({ normalized_text: normalizedText });
  if (!questionDoc) {
     questionDoc = new Question({
       question_text: `${qData.title} — Please read the description and think out loud.`,
       normalized_text: normalizedText,
       type: "Coding",
       difficulty: difficulty,
       title: qData.title,
       description: description,
       examples,
       test_cases,
       source_site: qData.link ? (qData.link.includes("leetcode.com") ? "leetcode" : "external") : "internal"
     });
     await questionDoc.save();
  } else {
     // Ensure description and test cases are updated if we got better info
     let updated = false;
     if (!questionDoc.description || questionDoc.description.startsWith("Please solve")) {
        questionDoc.description = description;
        updated = true;
     }

     if ((!questionDoc.test_cases || questionDoc.test_cases.length === 0) && test_cases.length > 0) {
        questionDoc.test_cases = test_cases;
        questionDoc.examples = examples;
        updated = true;
     }

     if (updated) {
        await questionDoc.save();
     }
  }
  return questionDoc;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Generate 3 DSA questions (easy, medium, hard) for the candidate.
 *
 * @param {object} resumeProfile - Candidate's parsed resume
 * @param {object} context - { company, role, experience, focusArea }
 * @returns {Promise<object[]>} Array of 3 Question documents to ask in the interview
 */
async function generateDsaQuestions(resumeProfile, context = {}) {
  const skills = resumeProfile?.technical_skills || [];
  const company = context.company || "";

  log.info("DSA_AGENT", `🧩 Generating 3 DSA questions${company ? ` for company: "${company}"` : " (no company specified)"}`);

  let easy, medium, hard;

  // ── Strategy 1: Try company-specific questions from company_questions.json ──
  if (company) {
    const match = findCompanyData(company);

    if (match) {
      const { key, data: companyData } = match;
      const easyPool = companyData.Easy || [];
      const mediumPool = companyData.Medium || [];
      const hardPool = companyData.Hard || [];

      log.info("DSA_AGENT", `📂 [SOURCE: company_questions.json] Found "${key}" — Easy: ${easyPool.length}, Medium: ${mediumPool.length}, Hard: ${hardPool.length}`);

      if (easyPool.length > 0 && mediumPool.length > 0 && hardPool.length > 0) {
        easy = pickRandom(easyPool);
        medium = pickRandom(mediumPool);
        hard = pickRandom(hardPool);
        
        log.success("DSA_AGENT", `✅ [SOURCE: company_questions.json] Selected for "${key}": ${easy.title}(E) | ${medium.title}(M) | ${hard.title}(H)`);
      } else {
        log.warn("DSA_AGENT", `⚠️ Company "${key}" has incomplete difficulty pools — supplementing with generic bank`);

        if (easyPool.length > 0) {
          easy = pickRandom(easyPool);
        } else {
          easy = pickMostRelevant(GENERIC_BANK.easy, skills);
        }

        if (mediumPool.length > 0) {
          medium = pickRandom(mediumPool);
        } else {
          medium = pickMostRelevant(GENERIC_BANK.medium, skills);
        }

        if (hardPool.length > 0) {
          hard = pickRandom(hardPool);
        } else {
          hard = pickMostRelevant(GENERIC_BANK.hard, skills);
        }
      }
    } else {
      log.warn("DSA_AGENT", `⚠️ Company "${company}" not found in company_questions.json — falling back to generic bank`);
    }
  }

  // ── Strategy 2: Fallback to generic question bank (example.json) ────────────
  if (!easy || !medium || !hard) {
    log.info("DSA_AGENT", `📂 [SOURCE: example.json] Using generic question bank`);
    easy = pickMostRelevant(GENERIC_BANK.easy, skills);
    medium = pickMostRelevant(GENERIC_BANK.medium, skills);
    hard = pickMostRelevant(GENERIC_BANK.hard, skills);
  }

  // Process and save questions concurrently
  const processedQuestions = await Promise.all([
    createOrUpdateDsaQuestion(easy, "Easy"),
    createOrUpdateDsaQuestion(medium, "Medium"),
    createOrUpdateDsaQuestion(hard, "Hard")
  ]);

  log.success("DSA_AGENT", `✅ Processed and saved 3 DSA questions to DB.`);
  return processedQuestions;
}

module.exports = { generateDsaQuestions };
