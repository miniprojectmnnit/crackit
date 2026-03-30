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

INTERVIEW STRUCTURE — strict distribution:
- Project Questions: First ask for an introduction of a specific project, and then as the next question formulate a highly targeted follow-up question diving deeper into that project (anticipating their introduction based on the context).
- Distribute the remaining questions across Logical Reasoning.
- 2 Core CS questions (OS, Networking, Databases, etc.)
- 1 question based on Achievements (identify from Candidate Resume Text)
- 1 question based on Position of Responsibility (identify from Candidate Resume Text)


TARGET ROLE: {role}
TARGET COMPANY: {company}
YEARS OF EXPERIENCE: {experience}
FOCUS AREAS: {focusArea}

IMPORTANT: Questions must sound natural for a voice interview. Avoid overly technical formatting.
Example good: "Can you briefly introduce your work on the PDF Juggler project? I'd love to know your main role."
Example bad: "Describe project: PDF Juggler."

Tailor the questions appropriately to the target role and adjust difficulty based on years of experience.`],
  ["user", `CANDIDATE PROFILE:
Name: {candidate_name}
Skills: {skills}
Projects: {projects}
Candidate Resume Text: {raw_text}

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
      raw_text: (resumeProfile.raw_text || "").substring(0, 3000),
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
