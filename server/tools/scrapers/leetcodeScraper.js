const axios = require("axios");
const cheerio = require("cheerio");
const log = require("../../utils/logger");

/**
 * Scrapes a LeetCode problem page to extract its description and constraints.
 * Since LeetCode pages are sometimes dynamically rendered, we also include a fallback
 * to their public GraphQL API if basic HTML scraping fails.
 * 
 * @param {string} url - The full LeetCode problem URL (e.g., https://leetcode.com/problems/two-sum)
 * @returns {Promise<string>} The extracted problem text (description + examples + constraints)
 */
async function scrapeLeetcodeProblem(url) {
  try {
    log.info("SCRAPER", `🌐 Fetching LeetCode problem: ${url}`);
    
    // Extract the title slug from the url (e.g. "two-sum" from "https://leetcode.com/problems/two-sum")
    const titleSlugMatch = url.match(/problems\/([^\/]+)/);
    const titleSlug = titleSlugMatch ? titleSlugMatch[1] : null;

    if (!titleSlug) {
      log.warn("SCRAPER", `Could not parse title slug from URL: ${url}`);
      return "No description available (Invalid LeetCode URL).";
    }

    // Try GraphQL API first as it's the most reliable way to get LeetCode content without headless browsers
    try {
      const graphqlUrl = "https://leetcode.com/graphql";
      const query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            content
          }
        }
      `;

      const response = await axios.post(graphqlUrl, {
        operationName: "questionData",
        variables: { titleSlug },
        query
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 8000
      });

      if (response.data?.data?.question?.content) {
        log.success("SCRAPER", `✅ Successfully fetched from GraphQL API for ${titleSlug}`);
        const htmlContent = response.data.data.question.content;
        
        // Parse the HTML content returned by the API
        const $ = cheerio.load(htmlContent);
        
        // Format it nicely
        $('p').append('\n');
        $('li').prepend('- ').append('\n');
        
        return $.text().trim();
      }
    } catch (graphqlErr) {
      log.warn("SCRAPER", `GraphQL attempt failed, falling back to HTML scraping: ${graphqlErr.message}`);
    }

    // Fallback: Direct HTML scraping looking for the data-track-load="description_content" container
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // The specific selector provided in the HTML snippet
    const contentNode = $('[data-track-load="description_content"]');

    if (contentNode.length > 0) {
      log.success("SCRAPER", `✅ Successfully scraped HTML content for ${titleSlug}`);
      
      // Clean up formatting
      contentNode.find('p').append('\n');
      contentNode.find('li').prepend('- ').append('\n');
      contentNode.find('pre').prepend('\n').append('\n');
      
      return contentNode.text().trim();
    } 

    log.warn("SCRAPER", `⚠️ Could not find description content using known selectors.`);
    return "Problem description could not be extracted (Premium problem or anti-bot protection).";

  } catch (error) {
    log.error("SCRAPER", `❌ Failed to scrape LeetCode URL ${url}: ${error.message}`);
    return "Failed to fetch question details.";
  }
}

/**
 * Parses a raw HTML string from a LeetCode problem page to extract its details.
 * 
 * @param {string} html - The raw HTML string of the LeetCode page.
 * @returns {Object} An object containing the parsed information.
 */
function parseLeetcodeHtml(html) {
  const $ = cheerio.load(html);

  // 1. Title
  let title = "Unknown Title";
  const titleA = $('a.no-underline.hover\\:text-blue-s.truncate');
  if (titleA.length) {
    title = titleA.first().text().trim();
  } else {
    const titleDiv = $('.text-title-large');
    if (titleDiv.length) title = titleDiv.first().text().trim();
  }

  // 2. Difficulty
  let difficulty = "Unknown";
  const difficultyElement = $('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');
  if (difficultyElement.length) {
    difficulty = difficultyElement.first().text().trim();
  }

  // 3. Description
  let description = "";
  const contentNode = $('[data-track-load="description_content"]');
  if (contentNode.length) {
    // Clone to safely manipulate
    const cloned = contentNode.clone();
    cloned.find('p').append('\\n');
    cloned.find('li').prepend('- ').append('\\n');
    cloned.find('pre').prepend('\\n').append('\\n');
    description = cloned.text().trim();
  }

  // 4. Topics
  const topics = [];
  $('a[href^="/tag/"]').each((_, el) => {
    topics.push($(el).text().trim());
  });

  // 5. Hints
  const hints = [];
  $('.HTMLContent_html__0OZLp').each((_, el) => {
    if ($(el).attr('data-track-load') !== 'description_content') {
      const text = $(el).text().trim();
      if (text) {
        hints.push(text);
      }
    }
  });

  // 6. Stats (Accepted, Acceptance Rate)
  const stats = {};
  $('.text-sd-muted-foreground').each((_, el) => {
    const text = $(el).text().trim();
    if (text === 'Accepted' || text === 'Submissions') {
      const statValue = $(el).next().find('span.text-sd-foreground').first().text().trim();
      if (statValue) stats[text] = statValue;
    } else if (text === 'Acceptance Rate') {
      const statValue = $(el).next().find('span.text-sd-foreground').first().text().trim();
      if (statValue) stats['AcceptanceRate'] = statValue + '%';
    }
  });

  return {
    title,
    difficulty,
    description,
    topics,
    hints,
    stats,
  };
}

module.exports = { scrapeLeetcodeProblem, parseLeetcodeHtml };
