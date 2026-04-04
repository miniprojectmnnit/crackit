const log = require("../utils/logger");

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
// Parse from string to JSON
const JUDGE0_LANGUAGE_MAP = process.env.JUDGE0_LANGUAGE_MAP
  ? JSON.parse(process.env.JUDGE0_LANGUAGE_MAP)
  : { JavaScript: 93, Python: 71, Java: 62, "C++": 54 };

async function submitToJudge0(sourceCode, languageId) {
  try {
    log.info("JUDGE0", `Submitting code to Judge0 (Language ID: ${languageId})...`);

    // Create submission to get token
    //Your code converts the text to Base64, hits the /submissions endpoint, and receives a Token (a unique ID for that specific run).
    const postResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&fields=*`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
      },
      body: JSON.stringify({
        source_code: Buffer.from(sourceCode).toString("base64"),
        language_id: languageId,
      }),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      log.error("JUDGE0", `Judge0 Create Submission Error: ${errorText}`);
      throw new Error("Failed to create submission in Judge0");
    }

    const { token } = await postResponse.json();
    if (!token) throw new Error("No token returned from Judge0");

    log.info("JUDGE0", `Got token ${token}. Polling for results...`);

    // Poll for results
    //Code execution isn't instant. It has to wait in a queue, compile, and then run. 
    // It "pings" the Judge0 server every 1 second to ask, "Is it done yet?"

    // If the status_id is greater than 2, it means the code has finished (either it passed, failed, or crashed).

    // If the code takes longer than 20 seconds, the loop breaks and throws an error to prevent your server from waiting forever.
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s

      const getResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true&fields=*`, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
        }
      });

      if (!getResponse.ok) {
        throw new Error("Failed to fetch submission status");
      }

      const data = await getResponse.json();

      // status_id <= 2 means In Queue or Processing
      if (data.status_id > 2) {
        log.info("JUDGE0", `Execution finished with status: ${data.status?.description || data.status_id}`);
        return {
          stdout: data.stdout ? Buffer.from(data.stdout, "base64").toString("utf8") : null,
          stderr: data.stderr ? Buffer.from(data.stderr, "base64").toString("utf8") : null,
          compile_output: data.compile_output ? Buffer.from(data.compile_output, "base64").toString("utf8") : null,
          status: data.status,
          time: data.time,
          memory: data.memory
        };
      }
      attempts++;
    }

    throw new Error("Execution timed out after 20 seconds");

  } catch (error) {
    log.error("JUDGE0", `Judge0 Error: ${error.message}`);
    throw error;
  }
}

function getLanguageId(languageName) {
  // Try to match, ignoring case or treating common names
  const match = Object.keys(JUDGE0_LANGUAGE_MAP).find(
    (k) => k.toLowerCase() === languageName.toLowerCase()
  );
  return match ? JUDGE0_LANGUAGE_MAP[match] : null;
}

module.exports = { submitToJudge0, getLanguageId };
