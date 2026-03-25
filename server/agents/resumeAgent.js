const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const resumeSchema = z.object({
  candidate_info: z.object({
    name: z.string(),
    education: z.array(z.object({
      degree: z.string(),
      university: z.string(),
      year_of_graduation: z.string()
    }))
  }),
  technical_skills: z.array(z.string()).describe("All tools, databases, frameworks, programming languages (e.g., 'Java', 'React')"),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies_used: z.array(z.string()),
    role: z.string()
  })),
  domain_scores: z.object({
    "Programming": z.number(),
    "Data Structures & Algorithms": z.number(),
    "Logical Reasoning": z.number(),
    "Mathematics": z.number(),
    "Networking": z.number(),
    "Operating Systems": z.number(),
    "Databases": z.number(),
    "System Design": z.number(),
    "Problem Solving": z.number(),
    "Communication": z.number()
  }).describe("Score 0-10 based on resume claims. Give higher initial weight (4-6) for complex projects. Cap confidence.")
});

const resumePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an expert technical recruiter and resume analyzer. Your goal is to parse the candidate's raw resume text into structured fields.
IMPORTANT RULES:
1. "candidate_info" - Extract their name and education details.
2. "technical_skills" - Extract all tools, databases, frameworks, programming languages. This is the Tool Layer.
3. "projects" - Extract projects mentioned. Detect project name, technologies used, a short description, and the candidate's role.
4. "domain_scores" - Map their skills and projects to EXACT domains. Score from 0 to 10 based on resume claims (0 if weak/absent, up to 5/6 max).`],
  ["user", `RAW RESUME TEXT:
{raw_text}`]
]);

exports.parseResumeText = async (rawText) => {
  try {
    log.info("AGENT", "🤖 Calling LangChain to parse resume text...");
    
    const llm = getLLM({ temperature: 0.1 });
    const structuredLlm = llm.withStructuredOutput(resumeSchema);
    const chain = resumePrompt.pipe(structuredLlm);

    const parsedData = await chain.invoke({ raw_text: rawText });
    
    log.success("AGENT", "✅ Resume parsed successfully.");
    return parsedData;

  } catch (err) {
    log.error("AGENT", `Resume parsing agent failed: ${err.message}`, err);
    throw err;
  }
};
