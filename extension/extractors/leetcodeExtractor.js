export function extractLeetCode() {
  const selectors = [
    "main .break-words",
    "main article",
    "main"
  ];

  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.innerText.length > 200) {
      return {
        title: document.querySelector("h1")?.innerText || "",
        content: el.innerText,
        source: "leetcode",
        url: window.location.href
      };
    }
  }

  return null;
}
//trained on->https://leetcode.com/discuss/post/7636908/interactive-brokers-junior-software-engi-ver1/