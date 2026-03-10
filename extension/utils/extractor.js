export function extractCandidateQuestions(articleText) {
  const lines = articleText.split('\n');
  const candidateLines = [];
  const keywords = [
    'implement',
    'design',
    'find',
    'explain',
    'write',
    'create',
    'build',
    'solve',
    'reverse',
    'detect',
    'calculate',
    'optimize'
  ];
  lines.forEach(line => {
    const text = line.trim();
    if (!text) return;

    const lowerText = text.toLowerCase();
    const hasQuestionMark = text.includes('?');
    const hasKeyword = keywords.some(kw => lowerText.includes(kw));

    if (hasQuestionMark || hasKeyword) {
      candidateLines.push(text);
    }
  });

  return candidateLines;
}
//This function tries to identify lines that might contain interview questions from the extracted article text.