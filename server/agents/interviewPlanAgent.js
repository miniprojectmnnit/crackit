const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");
const Question = require("../models/Question");

const questionSchema = z.object({
  questions: z.array(z.object({
    question_text: z.string().describe("The string the interviewer speaks."),
    type: z.enum(["Coding", "Behavioral", "System Design", "General"]),
    domain: z.enum(["Programming", "Data Structures & Algorithms", "Logical Reasoning", "Mathematics", "Networking", "Operating Systems", "Databases", "System Design", "Problem Solving", "Communication"]),
    solution: z.string().describe("The core concept they should hit in the answer.")
  }))
});

const plannerPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an expert technical interviewer planning a structured interview for a candidate based on their resume.
Generate exactly {question_count} questions for this candidate.

INTERVIEW STRUCTURE REQUIRED:
Generates {question_count} questions covering the following domains broadly, adhering to this distribution (approximate based on count):
- Resume-based / Project Deep Dive (e.g., "What challenge did you face in {projects}?") 
- Core CS domains (e.g., Operating Systems, Networking, Databases - even if not on resume)
- Programming Concept
- Data Structures & Algorithms
- Logical/Analytical Reasoning (Puzzles, conceptual reasoning)`],
  ["user", `CANDIDATE PROFILE:
Name: {candidate_name}
Skills: {skills}
Projects: {projects}

Please generate the questions now.`]
]);

exports.generateInterviewPlan = async (resumeProfile, questionCount = 10) => {
  try {
    const candidateName = resumeProfile.candidate_info?.name || "the candidate";
    const skills = resumeProfile.technical_skills?.join(", ") || "None listed";
    const projects = JSON.stringify(resumeProfile.projects || []);

    log.info("AGENT", `🤖 Calling LangChain to generate ${questionCount} interview questions...`);

    const llm = getLLM({ temperature: 0.7 });
    const structuredLlm = llm.withStructuredOutput(questionSchema);
    const chain = plannerPrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      question_count: questionCount,
      candidate_name: candidateName,
      skills: skills,
      projects: projects
    });

    const parsedQuestions = result.questions;
    log.success("AGENT", `✅ Generated ${parsedQuestions.length} questions.`);

    // Save generated questions to the database so they have real ObjectIds
    const savedQuestionIds = [];
    for (const q of parsedQuestions) {
      const normalized_text = q.question_text.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 100) + "_" + Date.now() + Math.floor(Math.random() * 1000);
      
      const dbQuestion = new Question({
        question_text: q.question_text,
        normalized_text: normalized_text,
        solution: q.solution,
        type: q.type,
        domain: q.domain,
        topic: q.domain,
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
