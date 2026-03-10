export function extractGeneric() {
  const selectors = [
    "article",
    "main",
    ".post-content",
    ".entry-content"
  ];

  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.innerText.length > 200) {
      return {
        title: document.querySelector("h1")?.innerText || document.title,
        content: el.innerText,
        source: "generic",
        url: window.location.href
      };
    }
  }

  return {
    title: document.title,
    content: document.body.innerText,
    source: "generic",
    url: window.location.href
  };
}
