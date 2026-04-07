//A background script is a script that runs in the background of the browser and manages extension logic.
//It is used to handle messages from the content script and perform actions based on the message.
//In Manifest V3, the background script is replaced with a service worker.
import { defineBackground } from 'wxt/sandbox';
import { extractQuestionsApi } from '../../utils/api.js';

export default defineBackground(() => {
  chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === 'SET_EXT_TOKEN') {
      chrome.storage.local.set({ extension_token: request.token }, () => {
        console.log('[AUTH] ✅ Extension token saved from external source.');
        sendResponse({ success: true });
      });
      return true; // async
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PROCESS_EXTRACTION') {
      
      // Request content script to get article text
      chrome.tabs.sendMessage(request.tabId, { action: 'GET_ARTICLE_TEXT' }, async (response) => {
        if (chrome.runtime.lastError) {
          return sendResponse({ success: false, error: 'Could not establish connection. Ensure the page is completely loaded or refresh the page.' });
        }
        
        if (!response) {
          return sendResponse({ success: false, error: 'Empty response from content script.' });
        }
        
        if (response.error) {
          return sendResponse({ success: false, error: response.error });
        }

        try {
          // Send data to backend API
          const extracted = await extractQuestionsApi(request.url, response.content || response.text);
          sendResponse({ success: true, questions: extracted });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      });

      return true; // Indicates async response
    }
  });
});
