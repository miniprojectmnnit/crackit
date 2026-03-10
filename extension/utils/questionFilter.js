export function normalizeQuestion(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}
