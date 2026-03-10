export function isInterviewExperience(text) {
  const keywords = [
    'interview experience',
    'interview process',
    'my interview',
    'interview journey',
    'round 1',
    'round 2',
    'round 3',
    'coding round',
    'technical round',
    'system design round',
    'hr round',
    'behavioral round',
    'onsite interview',
    'phone interview',
    'asked me'
  ];
  const bodyText = text.toLowerCase();
  return keywords.some(kw => bodyText.includes(kw));
}
//Its job is to determine whether the scraped article is actually an interview experience page before running the question extraction pipeline.