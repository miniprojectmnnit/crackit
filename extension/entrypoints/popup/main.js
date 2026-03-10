import { renderQuestionList, renderInterviewUI } from '../../components/interviewUI.js';

document.addEventListener('DOMContentLoaded', async () => {
  const extractBtn = document.getElementById('extract-btn');
  const mockBtn = document.getElementById('mock-btn');
  const statusEl = document.getElementById('status');
  const questionsListEl = document.getElementById('questions-list');
  
  let currentQuestions = [];
  
  // Get current active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return;
  
  extractBtn.addEventListener('click', async () => {
    statusEl.textContent = 'Extracting...';
    extractBtn.disabled = true;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'PROCESS_EXTRACTION', 
        tabId: tab.id, 
        url: tab.url 
      });
      
      if (response && response.success) {
        currentQuestions = response.questions;
        statusEl.textContent = `Extracted ${currentQuestions.length} questions.`;
        renderQuestionList(currentQuestions, questionsListEl);
        if (currentQuestions.length > 0) {
          mockBtn.style.display = 'block';
        }
      } else {
        statusEl.textContent = 'Failed: ' + (response?.error || 'Unknown error');
      }
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    } finally {
      extractBtn.disabled = false;
    }
  });
  
  mockBtn.addEventListener('click', () => {
    document.querySelector('.actions').style.display = 'none';
    questionsListEl.style.display = 'none';
    statusEl.style.display = 'none';
    renderInterviewUI(currentQuestions);
  });
});
