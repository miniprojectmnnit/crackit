import { defineContentScript } from 'wxt/sandbox';

import { detectSite } from "../../utils/detectSite";

import { extractGFG } from "../../extractors/gfgExtractor";
import { extractLeetCode } from "../../extractors/leetcodeExtractor";
import { extractMedium } from "../../extractors/mediumExtractor";
import { extractReddit } from "../../extractors/redditExtractor";
import { extractGeneric } from "../../extractors/genericExtractor";

export default defineContentScript({
  matches: ["<all_urls>"],

  main() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Handle the new action name
      if (request.action === "GET_ARTICLE" || request.action === "GET_ARTICLE_TEXT") {
        const site = detectSite();
        let result = null;

        if (site === "gfg") result = extractGFG();
        else if (site === "leetcode") result = extractLeetCode();
        else if (site === "medium") result = extractMedium();
        else if (site === "reddit") result = extractReddit();
        
        // Fallback to generic if specialised extractor returned null or site is unknown
        if (!result) {
          result = extractGeneric();
        }

        sendResponse(result);
      }
    });
    return true;
  }
});
