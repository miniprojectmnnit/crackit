/**
 * Scraper Registry — add new scrapers here.
 *
 * Each scraper module must export:
 *   { name: string, platform: string, scrape(company, maxArticles): Promise<Question[]> }
 *
 * Question shape:
 *   { question: string, type: "HR/Behavioral"|"Technical"|"System Design", source: string }
 */

const gfgScraper = require("./gfgScraper");

// ── Registry ──────────────────────────────────────────────────────────────────
// To add a new scraper: import it and push to SCRAPERS.
const SCRAPERS = [
  gfgScraper,
  // Future: require("./glassdoorScraper"),
  // Future: require("./leetcodeScraper"),
];

/**
 * Scrape interview experiences for a company from one or all platforms.
 *
 * @param {string} company - Company name (e.g. "Google")
 * @param {object} options
 * @param {string} [options.platform] - Specific platform ("gfg"). Omit for all.
 * @param {string} [options.questionType] - Filter by type: "HR/Behavioral" | "Technical" | "System Design"
 * @param {number} [options.maxArticles] - Max articles per scraper (default: 3)
 * @returns {Promise<Array<{question, type, source, platform}>>}
 */
async function scrapeInterviewExperiences(company, { platform, questionType, maxArticles = 3 } = {}) {
  const selected = platform
    ? SCRAPERS.filter((s) => s.platform === platform)
    : SCRAPERS;

  const allResults = [];

  await Promise.allSettled(
    selected.map(async (scraper) => {
      try {
        const results = await scraper.scrape(company, maxArticles);
        results.forEach((r) => allResults.push({ ...r, platform: scraper.name }));
      } catch (err) {
        console.warn(`[SCRAPER_REGISTRY] ${scraper.name} failed: ${err.message}`);
      }
    })
  );

  // Filter by question type if requested
  const filtered = questionType
    ? allResults.filter((r) => r.type === questionType)
    : allResults;

  return filtered;
}

module.exports = { scrapeInterviewExperiences, SCRAPERS };
