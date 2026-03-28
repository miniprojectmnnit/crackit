/**
 * GFG (GeeksForGeeks) Interview Experience Scraper
 *
 * Scrapes interview questions from GFG interview experience pages.
 * Returns structured { question, type } objects.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const log = require("../../utils/logger");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

// Multiple GFG URL patterns to maximize found articles
function buildSearchUrls(company) {
  const slug = company.toLowerCase().replace(/\s+/g, "-");
  const slugNoHyphen = company.toLowerCase().replace(/\s+/g, "");
  return [
    `https://www.geeksforgeeks.org/tag/${slug}-interview-experiences/`,
    `https://www.geeksforgeeks.org/tag/${slug}/`,
    `https://www.geeksforgeeks.org/company/${slug}/`,
    `https://www.geeksforgeeks.org/${slugNoHyphen}-interview-experiences/`,
  ];
}

/**
 * Classify a question text into a type.
 */
function classifyQuestion(text) {
  const lower = text.toLowerCase();
  if (/tell me about|yourself|strength|weakness|teamwork|conflict|challenge|why (did you|do you want)|greatest achievement|describe a time|situation|handled|motivation|where do you see/i.test(lower)) {
    return "HR/Behavioral";
  }
  if (/design|architecture|scalab|system|microservice|database schema|distributed/i.test(lower)) {
    return "System Design";
  }
  return "Technical";
}

/**
 * Extract question-like sentences from raw article text.
 */
function extractQuestionsFromText(text) {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 400);

  const questionPatterns = [
    /^(what|how|why|explain|describe|tell|can you|implement|design|find|given|write|difference|compare|when|define|is it|are there|which|where)/i,
    /\?$/,
    /^(q\d*[\.\):]|round \d|question \d)/i,
  ];

  return sentences
    .filter((s) => questionPatterns.some((p) => p.test(s)))
    .map((q) => ({
      question: q.replace(/^(q\d*[\.\):\s]+|round \d+[\.\):\s]+|question \d+[\.\):\s]+)/i, "").trim(),
      type: classifyQuestion(q),
    }))
    .filter((q) => q.question.length > 15);
}

/**
 * Collect all unique article links from a GFG index or search page.
 */
async function collectArticleLinks(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(res.data);
    const links = new Set();

    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (
        href.startsWith("https://www.geeksforgeeks.org/") &&
        !href.includes("#") &&
        !href.includes("?") &&
        href.length > 40 &&
        (href.includes("interview") || href.includes("experience") || href.includes("placement"))
      ) {
        links.add(href);
      }
    });

    return [...links];
  } catch (err) {
    log.warn("GFG_SCRAPER", `Could not fetch index ${url}: ${err.message}`);
    return [];
  }
}

/**
 * Scrape a single GFG article and return extracted questions.
 */
async function scrapeArticle(link) {
  try {
    const articleRes = await axios.get(link, { headers: HEADERS, timeout: 12000 });
    const a$ = cheerio.load(articleRes.data);

    const bodyText = a$(".article--container, .entry-content, .text, .content")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (bodyText.length < 100) return [];

    const extracted = extractQuestionsFromText(bodyText);

    if (extracted.length > 0) {
      log.success("GFG_SCRAPER", `📄 Article extracted — ${link.split("/").slice(-2, -1)[0]} → ${extracted.length} questions found`);
      extracted.forEach((q, i) => {
        log.info("GFG_SCRAPER", `   [${q.type}] Q${i + 1}: "${q.question.substring(0, 90)}${q.question.length > 90 ? "..." : ""}"`);
      });
    } else {
      log.warn("GFG_SCRAPER", `📄 Article had no extractable questions: ${link}`);
    }

    return extracted.map((q) => ({ ...q, source: link }));
  } catch (err) {
    log.warn("GFG_SCRAPER", `Failed to scrape article ${link}: ${err.message}`);
    return [];
  }
}

/**
 * Main scrape function for GFG.
 *
 * @param {string} company - Company name (e.g. "Google")
 * @param {number} maxArticles - Max articles to scrape (default: 10)
 * @returns {Promise<Array<{question, type, source}>>}
 */
async function scrape(company, maxArticles = 10) {
  log.info("GFG_SCRAPER", `🔍 Starting GFG scrape for company: "${company}" (max ${maxArticles} articles)`);

  // Collect links from multiple URL patterns
  const urls = buildSearchUrls(company);
  const allLinks = new Set();

  for (const url of urls) {
    log.info("GFG_SCRAPER", `   Trying index URL: ${url}`);
    const links = await collectArticleLinks(url);
    links.forEach((l) => allLinks.add(l));
    if (allLinks.size > 0) {
      log.info("GFG_SCRAPER", `   Found ${links.length} links (total unique so far: ${allLinks.size})`);
    }
  }

  const uniqueLinks = [...allLinks].slice(0, maxArticles);
  log.info("GFG_SCRAPER", `📚 Scraping ${uniqueLinks.length} article(s) for "${company}"...`);

  if (uniqueLinks.length === 0) {
    log.warn("GFG_SCRAPER", `⚠️  No articles found for "${company}" on GFG — will use LLM fallback`);
    return [];
  }

  // Scrape articles in batches of 3 (to avoid hammering GFG)
  const results = [];
  const BATCH = 3;
  for (let i = 0; i < uniqueLinks.length; i += BATCH) {
    const batch = uniqueLinks.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(scrapeArticle));
    batchResults.flat().forEach((q) => results.push(q));

    // Brief pause between batches
    if (i + BATCH < uniqueLinks.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  log.success("GFG_SCRAPER", `✅ GFG scrape complete for "${company}": ${results.length} total questions extracted from ${uniqueLinks.length} articles`);

  // Summary by type
  const byType = results.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});
  Object.entries(byType).forEach(([type, count]) => {
    log.info("GFG_SCRAPER", `   ${type}: ${count} questions`);
  });

  return results;
}

module.exports = {
  name: "GeeksForGeeks",
  platform: "gfg",
  scrape,
};
