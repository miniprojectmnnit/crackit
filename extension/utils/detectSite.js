export function detectSite() {
  const host = window.location.hostname;

  if (host.includes("geeksforgeeks")) return "gfg";
  if (host.includes("leetcode")) return "leetcode";
  if (host.includes("medium")) return "medium";
  if (host.includes("reddit")) return "reddit";

  return "generic";
}
