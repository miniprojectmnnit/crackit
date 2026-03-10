export function extractGFG() {
  const container =
    document.querySelector(".article-container") ||
    document.querySelector(".entry-content");

  if (!container) return null;

  return {
    title: document.querySelector("h1")?.innerText || "",
    content: container.innerText,
    source: "geeksforgeeks",
    url: window.location.href
  };
}
//trained on- https://www.geeksforgeeks.org/interview-experiences/visa-interview-experience-for-software-engineer-ncg/