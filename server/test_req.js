async function run() {
  try {
    const res = await fetch("http://localhost:5000/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://example.com", article_text: "test" })
    });
    console.log("Status Code:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (e) {
    console.error("Fetch Error:", e.message);
  }
}
run();
