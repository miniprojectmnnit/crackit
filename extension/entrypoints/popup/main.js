import { renderQuestionList, renderInterviewUI } from '../../components/interviewUI.js';

document.addEventListener('DOMContentLoaded', async () => {
  const extractBtn = document.getElementById('extract-btn');
  const mockBtn = document.getElementById('mock-btn');
  const statusEl = document.getElementById('status');
  const questionsListEl = document.getElementById('questions-list');
  
  let currentQuestions = [];
  const APP_BASE_URL = "https://crackit-interview.vercel.app";
  // const APP_BASE_URL = "http://localhost:5173";
  
  // Get current active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const mainActionsEl = document.getElementById('main-actions');
  const linkContainerEl = document.getElementById('link-container');
  const loginBtn = document.getElementById('login-btn');
  
  // Check for extension token
  const { extension_token } = await chrome.storage.local.get('extension_token');
  
  if (extension_token) {
    mainActionsEl.style.display = 'block';
    linkContainerEl.style.display = 'none';
  } else {
    mainActionsEl.style.display = 'none';
    linkContainerEl.style.display = 'block';
  }

  loginBtn.addEventListener('click', () => {
    const extensionId = chrome.runtime.id;
    const authUrl = `${APP_BASE_URL}/extension-auth?extensionId=${extensionId}`;
    chrome.tabs.create({ url: authUrl });
  });

  extractBtn.addEventListener('click', async () => {
    statusEl.innerHTML = '<span class="loading">Extraction in progress...</span>';
    extractBtn.disabled = true;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'PROCESS_EXTRACTION', 
        tabId: tab.id, 
        url: tab.url 
      });
      
      if (response && response.success) {
        currentQuestions = response.questions;
        statusEl.textContent = `✅ Extracted ${currentQuestions.length} questions.`;
        renderQuestionList(currentQuestions, questionsListEl);
        if (currentQuestions.length > 0) {
          mockBtn.style.display = 'block';
        }
      } else {
        statusEl.innerHTML = `<span class="error">❌ Extraction failed: ${response?.error || 'Unknown error'}</span>`;
      }
    } catch (err) {
      statusEl.innerHTML = `<span class="error">❌ Error: ${err.message}</span>`;
    } finally {
      extractBtn.disabled = false;
    }
  });
  
  mockBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: `${APP_BASE_URL}/interviewsimulation?url=` + encodeURIComponent(tab.url)
    });
  });
});
