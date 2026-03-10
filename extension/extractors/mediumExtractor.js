export function extractMedium() {
  const article = document.querySelector("article");

  if (!article) return null;

  return {
    title: document.querySelector("h1")?.innerText || "",
    content: article.innerText,
    source: "medium",
    url: window.location.href
  };
}
