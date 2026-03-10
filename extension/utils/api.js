export async function extractQuestionsApi(url, article_text) {
  try {
    const response = await fetch('http://localhost:5000/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
