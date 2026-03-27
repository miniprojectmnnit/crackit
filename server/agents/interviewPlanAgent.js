const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const questionSchema = z.object({
  questions: z.array(z.object({
    question_text: z.string().describe("The exact question the interviewer will ask. Should sound natural when spoken."),
    type: z.string().describe("The category of the question, e.g. 'Coding', 'Behavioral', 'Core CS', 'System Design'."),
    domain: z.string().describe("The domain this question covers, e.g. 'Programming', 'Networking', etc.")
  }))
});

const plannerPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an expert senior technical interviewer planning a real, spoken interview.
Generate exactly {question_count} questions that feel natural when spoken aloud.

INTERVIEW STRUCTURE — approximate distribution:
- 2-3 Resume/Project-based (referencing their actual projects)
- 2-3 Core CS (OS, Networking, Databases)
- 2-3 Data Structures & Algorithms
- 1-2 Behavioral / Communication
- 1 Logical/Analytical reasoning

TARGET ROLE: {role}
TARGET COMPANY: {company}
YEARS OF EXPERIENCE: {experience}
FOCUS AREAS: {focusArea}

IMPORTANT: Questions must sound natural for a voice interview. Avoid overly technical formatting.
Example good: "Can you walk me through how you built the PDF Juggler project and what challenges you faced?"
Example bad: "Describe project: PDF Juggler. Challenges: [list]"

If a Target Role, Target Company, or Focus Area is provided, tailor the questions appropriately. For example, if the target company is Visa, focus on payment systems and transactions. If the target role is Frontend, ask deep UI/UX and framework questions. Adjust difficulty based on years of experience.`],
  ["user", `CANDIDATE PROFILE:
Name: {candidate_name}
Skills: {skills}
Projects: {projects}

Generate the questions now.`]
]);

exports.generateInterviewPlan = async (resumeProfile, questionCount = 10, context = {}) => {
  try {
    const candidateName = resumeProfile.candidate_info?.name || "the candidate";
    const skills = resumeProfile.technical_skills?.join(", ") || "Not specified";
    const projects = (resumeProfile.projects || []).map(p => p.name || "").filter(Boolean).join(", ") || "Not specified";
    
    // Extract context details or use defaults
    const role = context.role || "Software Engineer";
    const company = context.company || "Any Tech Company";
    const experience = context.experience || "Entry Level";
    const focusArea = context.focusArea || "General Software Development";

    log.info("AGENT", `🤖 Generating ${questionCount} interview questions for ${candidateName} targeting ${role} at ${company}...`);

    const llm = getLLM({ temperature: 0.8 });
    const structuredLlm = llm.withStructuredOutput(questionSchema);
    const chain = plannerPrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      question_count: questionCount,
      candidate_name: candidateName,
      skills,
      projects,
      role,
      company,
      experience,
      focusArea
    });

    const questions = result.questions.map(q => q.question_text);
    log.success("AGENT", `✅ Generated ${questions.length} questions`);
    return questions;

  } catch (err) {
    log.error("AGENT", `Interview planner agent failed: ${err.message}`, err);
    throw err;
  }
};
