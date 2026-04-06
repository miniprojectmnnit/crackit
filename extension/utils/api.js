const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function extractQuestionsApi(url, article_text) {
  try {
    const { extension_token } = await chrome.storage.local.get('extension_token');
    
    const headers = { 'Content-Type': 'application/json' };
    if (extension_token) {
        headers['Authorization'] = `Bearer ${extension_token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, article_text })
    });
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.questions || [];
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
