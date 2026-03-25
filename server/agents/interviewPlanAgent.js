const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const questionSchema = z.object({
  questions: z.array(z.object({
    question_text: z.string().describe("The exact question the interviewer will ask. Should sound natural when spoken."),
    type: z.enum(["Coding", "Behavioral", "System Design", "General"]),
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

IMPORTANT: Questions must sound natural for a voice interview. Avoid overly technical formatting.
Example good: "Can you walk me through how you built the PDF Juggler project and what challenges you faced?"
Example bad: "Describe project: PDF Juggler. Challenges: [list]"`],
  ["user", `CANDIDATE PROFILE:
Name: {candidate_name}
Skills: {skills}
Projects: {projects}

Generate the questions now.`]
]);

exports.generateInterviewPlan = async (resumeProfile, questionCount = 10) => {
  try {
    const candidateName = resumeProfile.candidate_info?.name || "the candidate";
    const skills = resumeProfile.technical_skills?.join(", ") || "Not specified";
    const projects = (resumeProfile.projects || []).map(p => p.name || "").filter(Boolean).join(", ") || "Not specified";

    log.info("AGENT", `🤖 Generating ${questionCount} interview questions for ${candidateName}...`);

    const llm = getLLM({ temperature: 0.8 });
    const structuredLlm = llm.withStructuredOutput(questionSchema);
    const chain = plannerPrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      question_count: questionCount,
      candidate_name: candidateName,
      skills,
      projects
    });

    const questions = result.questions.map(q => q.question_text);
    log.success("AGENT", `✅ Generated ${questions.length} questions`);
    return questions;

  } catch (err) {
    log.error("AGENT", `Interview planner agent failed: ${err.message}`, err);
    throw err;
  }
};
