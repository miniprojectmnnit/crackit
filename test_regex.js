function isMetaRequest(text) {
  const lower = text.toLowerCase().trim();
  const metaPatterns = [
    /^(can you |please |could you )?(repeat|say again|repeat that|say that again)/,
    /^(i didn't (hear|understand)|didn't catch that)/,
    /^(what (did you say|was the question)|can you (clarify|explain the question))/,
    /^(hello|hi|hey)[\s,!.]*$/,
    /^(what|huh|sorry|pardon)[\s?!.]*$/
  ];
  // Avoid catching short words like "next" or "skip" as meta-requests
  const isShortWord = lower.length < 4; 
  return metaPatterns.some(p => p.test(lower)) || isShortWord;
}

function isSkipRequest(text) {
  const lower = text.toLowerCase().trim();
  const skipPatterns = [
    /^(can we |please |could we )?(move on|next question|skip|skip this|move to (the )?next)/,
    /^next[\s,!.]*$/,
    /^skip[\s,!.]*$/
  ];
  return skipPatterns.some(p => p.test(lower));
}

const tests = [
  "repeat that",
  "says again",
  "what did you say",
  "hello",
  "hi",
  "next",
  "skip",
  "move on to the next question",
  "please move to next",
  "could we move on",
  "i have solved it"
];

tests.forEach(t => {
  console.log(`Input: "${t}"`);
  console.log(`  isMeta: ${isMetaRequest(t)}`);
  console.log(`  isSkip: ${isSkipRequest(t)}`);
});
