const { ai } = require("../utils/geminiClient");
const log = require("../utils/logger");
const Question = require("../models/Question");

const INTERVIEW_PLANNER_PROMPT = `
You are an expert technical interviewer planning a structured interview for a candidate based on their resume.
Generate exactly {QUESTION_COUNT} questions for this candidate.

CANDIDATE PROFILE:
Name: {CANDIDATE_NAME}
Skills: {SKILLS}
Projects: {PROJECTS}

INTERVIEW STRUCTURE REQUIRED:
Generates {QUESTION_COUNT} questions covering the following domains broadly, adhering to this distribution (approximate based on count):
- Resume-based / Project Deep Dive (e.g., "What challenge did you face in {PROJECT}?") 
- Core CS domains (e.g., Operating Systems, Networking, Databases - even if not on resume)
- Programming Concept
- Data Structures & Algorithms
- Logical/Analytical Reasoning (Puzzles, conceptual reasoning)

For each question, provide:
1. question_text: The string the interviewer speaks.
2. type: "Coding" | "Behavioral" | "System Design" | "General"
3. domain: Must be EXACTLY one of: "Programming", "Data Structures & Algorithms", "Logical Reasoning", "Mathematics", "Networking", "Operating Systems", "Databases", "System Design", "Problem Solving", "Communication"
4. solution: The core concept they should hit in the answer.

Respond ONLY with valid JSON. Do not use Markdown block wrappers.
[
  {
    "question_text": "string",
    "type": "string",
    "domain": "string",
    "solution": "string"
  }
]
`;

exports.generateInterviewPlan = async (resumeProfile, questionCount = 10) => {
  try {
    const candidateName = resumeProfile.candidate_info?.name || "the candidate";
    const skills = resumeProfile.technical_skills?.join(", ") || "None listed";
    const projects = JSON.stringify(resumeProfile.projects || []);

    const prompt = INTERVIEW_PLANNER_PROMPT
      .replace("{QUESTION_COUNT}", questionCount.toString())
      .replace("{QUESTION_COUNT}", questionCount.toString())
      .replace("{CANDIDATE_NAME}", candidateName)
      .replace("{SKILLS}", skills)
      .replace("{PROJECTS}", projects);

    log.info("AGENT", `🤖 Calling Gemini to generate ${questionCount} interview questions...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.7 }
    });

    const output = (response.text || "").trim();
    const jsonStr = output.replace(/^\`\`\`json/i, "").replace(/\`\`\`$/, "").trim();
    
    const parsedQuestions = JSON.parse(jsonStr);

    // Save generated questions to the database so they have real ObjectIds
    const savedQuestionIds = [];
    for (const q of parsedQuestions) {
      const normalized_text = q.question_text.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 100) + "_" + Date.now() + Math.floor(Math.random() * 1000);
      
      const dbQuestion = new Question({
        question_text: q.question_text,
        normalized_text: normalized_text,
        solution: q.solution,
        type: q.type,
        domain: q.domain, // newly mapped domain
        topic: q.domain, // reuse topic for UI compatibility if needed
        difficulty: "Medium"
      });
      await dbQuestion.save();
      savedQuestionIds.push(dbQuestion._id);
    }

    return savedQuestionIds;

  } catch (err) {
    log.error("AGENT", `Interview planner agent failed: ${err.message}`, err);
    throw err;
  }
};
