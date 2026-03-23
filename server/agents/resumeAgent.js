const { callGeminiWithFallback } = require("../utils/llmClient");
const log = require("../utils/logger");

const RESUME_PARSER_PROMPT = `
You are an expert technical recruiter and resume analyzer. Your goal is to parse the candidate's raw resume text into structured fields.

RAW RESUME TEXT:
{RAW_TEXT}

Extract and structure the information exactly matching the JSON format below.
IMPORTANT RULES:
1. "candidate_info" - Extract their name and education details.
2. "technical_skills" - Extract all tools, databases, frameworks, programming languages (e.g., "Java", "React", "MongoDB", "Docker"). This is the Tool Layer.
3. "projects" - Extract projects mentioned. Detect project name, technologies used, a short description, and the candidate's role.
4. "domain_scores" - Map their skills and projects to these EXACT domains: 
   "Programming", "Data Structures & Algorithms", "Logical Reasoning", "Mathematics", "Networking", "Operating Systems", "Databases", "System Design", "Problem Solving", "Communication".
   Score from 0 to 10 based on resume claims (0 if not mentioned or very weak, up to maybe 5 or 6 maximum for a resume claim before verification, never mark domains strong without direct evidence). 
   Give higher initial weight (e.g., 4-6) if they mention specific complex projects or extended experience in a domain. Keep confidence LOW (which means caps on scores).

Respond ONLY with valid JSON. Do not use Markdown JSON block wrappers (\`\`\`json) or any other text.

{
  "candidate_info": {
    "name": "string",
    "education": [
      {
        "degree": "string",
        "university": "string",
        "year_of_graduation": "string"
      }
    ]
  },
  "technical_skills": ["string"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies_used": ["string"],
      "role": "string"
    }
  ],
  "domain_scores": {
    "Programming": number,
    "Data Structures & Algorithms": number,
    "Logical Reasoning": number,
    "Mathematics": number,
    "Networking": number,
    "Operating Systems": number,
    "Databases": number,
    "System Design": number,
    "Problem Solving": number,
    "Communication": number
  }
}
`;

exports.parseResumeText = async (rawText) => {
  try {
    const prompt = RESUME_PARSER_PROMPT.replace("{RAW_TEXT}", rawText);

    log.info("AGENT", "🤖 Calling Gemini to parse resume text...");
    const output = await callGeminiWithFallback(prompt, { temperature: 0.1 });

    // In case the model wraps in markdown despite instructions
    const jsonStr = output.replace(/^\`\`\`json/i, "").replace(/\`\`\`$/, "").trim();

    const parsedData = JSON.parse(jsonStr);
    return parsedData;

  } catch (err) {
    log.error("AGENT", `Resume parsing agent failed: ${err.message}`, err);
    throw err;
  }
};
