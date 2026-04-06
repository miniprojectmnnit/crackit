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
/**
 * Infer a generic type string from a raw value string.
 */
function inferType(value) {
  const v = value.trim();
  if (v === 'true' || v === 'false') return 'boolean';
  if (/^".*"$/.test(v)) return 'string';
  if (/^-?\d+\.\d+$/.test(v)) return 'double';
  if (/^-?\d+$/.test(v)) return 'integer';
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return 'any[]';
    
    // Extract first element to infer type of the array
    let depth = 0;
    let firstElem = '';
    for (const ch of inner) {
      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') depth--;
      if (ch === ',' && depth === 0) break;
      firstElem += ch;
    }
    return inferType(firstElem) + '[]';
  }
  return 'any';
}

/**
 * Parse string-based examples from company_questions.json into structured objects.
 * Format expected: "Input: num = 5\nOutput: 10\nExplanation: ..."
 */
function parseExamplesToTestCases(examplesArray) {
  if (!examplesArray || !Array.isArray(examplesArray)) return { examples: [], test_cases: [], parameters: [], return_type: null };

  const parsedExamples = [];
  const testCases = [];
  let parameters = [];
  let return_type = null;

  examplesArray.forEach((exStr, idx) => {
    if (typeof exStr !== 'string') return;

    // Matches "Input: ... " until newline or "Output:"
    const inputMatch = exStr.match(/Input:\s*(.*?)(?=\n|Output:|$)/si);
    // Matches "Output: ... " until newline or "Explanation:"
    const outputMatch = exStr.match(/Output:\s*(.*?)(?=\n|Explanation:|$)/si);
    const explanationMatch = exStr.match(/Explanation:\s*(.*)/si);

    if (inputMatch && outputMatch) {
      let inputStr = inputMatch[1].trim();
      const outputStr = outputMatch[1].trim();
      const explanation = explanationMatch ? explanationMatch[1].trim() : "";

      // Cleanup: Remove "Example 1:", "Example 1 " or similar prefixes if they somehow caught by regex
      inputStr = inputStr.replace(/^Example\s*\d+[:\s]*/i, "").trim();

      parsedExamples.push({ input: inputStr, output: outputStr, explanation });
      testCases.push({ input: inputStr, expected_output: outputStr });

      // Extract parameters and return type from the FIRST example to avoid conflicts
      if (idx === 0) {
        const params = [];
        let currentName = '';
        let currentValue = '';
        let inName = true;
        let depth = 0;
        
        // Add a sentinel comma at the end to process the last parameter
        const s = inputStr.trim() + ',';
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (inName) {
            if (ch === '=') {
              inName = false;
            } else {
              currentName += ch;
            }
          } else {
            if (ch === '[' || ch === '{') depth++;
            else if (ch === ']' || ch === '}') depth--;
            
            if (ch === ',' && depth === 0) {
              const name = currentName.trim();
              const value = currentValue.trim();
              if (name && value) {
                params.push({
                  name: name,
                  type: inferType(value)
                });
              }
              currentName = '';
              currentValue = '';
              inName = true;
            } else {
              currentValue += ch;
            }
          }
        }
        
        if (params.length > 0) {
          parameters = params;
        } else {
          // Single raw value (e.g. "Input: 2")
          parameters = [{ name: 'input', type: inferType(inputStr) }];
        }
        return_type = inferType(outputStr);
      }
    }
  });

  return { examples: parsedExamples, test_cases: testCases, parameters, return_type };
}

const { generateCodeMetadata } = require("./codeGeneratorAgent");

// ── Database Helper ───────────────────────────────────────────────────────────

async function createOrUpdateDsaQuestion(qData, difficulty) {
  let description = qData.desc || qData.description || "";

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

  const { examples, test_cases, parameters: regexParameters, return_type: regexReturnType } = parseExamplesToTestCases(qData.examples);

  let questionDoc = await Question.findOne({ normalized_text: normalizedText });
  if (!questionDoc) {
     questionDoc = new Question({
       question_text: qData.title,
       normalized_text: normalizedText,
       type: "Coding",
       difficulty: difficulty,
       title: qData.title,
       description: description,
       examples,
       test_cases,
       source_site: qData.link ? (qData.link.includes("leetcode.com") ? "leetcode" : "external") : "internal"
     });
     
     // Preliminary values from regex
     questionDoc.parameters = regexParameters;
     questionDoc.return_type = regexReturnType;
     
     // Derive method name from title as fallback
     let method_name = qData.title.replace(/ /g, '').replace(/[^a-zA-Z0-9]/g, '');
     questionDoc.method_name = method_name.charAt(0).toLowerCase() + method_name.slice(1);
     
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

  // AI ENRICHMENT: If question lacks specific parameters or has generic 'any' type, call the Code Generator Agent
  const currentParams = questionDoc.parameters || [];
  const hasGenericType = currentParams.some(p => p.type === 'any' || p.type === 'auto') || currentParams.length === 0;
  
  if (hasGenericType || !questionDoc.method_name || !questionDoc.return_type) {
    log.info("DSA_AGENT", `🤖 AI Enrichment triggered for: ${questionDoc.title}`);
    const aiMetadata = await generateCodeMetadata(questionDoc.title, questionDoc.description, qData.examples);
    
    if (aiMetadata) {
      questionDoc.method_name = aiMetadata.method_name;
      questionDoc.parameters = aiMetadata.parameters;
      questionDoc.return_type = aiMetadata.return_type;
      questionDoc.starter_code = aiMetadata.starter_code;
      await questionDoc.save();
      log.success("DSA_AGENT", `✅ AI Enrichment complete for: ${questionDoc.title}`);
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

module.exports = { generateDsaQuestions, inferType, parseExamplesToTestCases };
