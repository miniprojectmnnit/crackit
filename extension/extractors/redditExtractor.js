export function extractReddit() {
  const main = document.querySelector("main");

  if (!main) return null;

  return {
    title: document.querySelector("h1")?.innerText || "",
    content: main.innerText,
    source: "reddit",
    url: window.location.href
  };
}
//trained on-> https://www.reddit.com/r/developersIndia/comments/14rprqp/interview_experience_i_found_it_disheartening_and/