//A background script is a script that runs in the background of the browser and manages extension logic.
//It is used to handle messages from the content script and perform actions based on the message.
//In Manifest V3, the background script is replaced with a service worker.

//registers the background worker
import { defineBackground } from 'wxt/sandbox';

//This function sends the extracted article text to your backend server.
import { extractQuestionsApi } from '../../utils/api.js';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    //This message comes from the popup button.
    if (request.action === 'PROCESS_EXTRACTION') {
      handleExtraction(request.tabId, request.url)
        .then(result => sendResponse({ success: true, questions: result }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Indicates async response
    }
  });

  async function handleExtraction(tabId, url) {
    // Request content script to get article text
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_ARTICLE_TEXT' });

    if (!response) {
      throw new Error('Could not communicate with the content script. Ensure the page is completely loaded.');
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Send data to backend API
    return await extractQuestionsApi(url, response.text);
  }
});
