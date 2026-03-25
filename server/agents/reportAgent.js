const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const reportSchema = z.object({
  strengths: z.array(z.string()).describe("Array of strings for domains scoring > 7. Provide a short description for each."),
  weak_areas: z.array(z.string()).describe("Array of strings for domains scoring < 4. Provide short description."),
  potential_growth: z.array(z.string()).describe("Array of strings using cross-domain inference (e.g. Strong reasoning but weak DSA -> high potential)."),
  professional_summary: z.string().describe("A professional 3-4 sentence paragraph summarizing their overall performance."),
  resume_vs_observed: z.array(z.object({
    domain: z.string(),
    resume_claim: z.enum(["High", "Medium", "Low", "None"]),
    observed_skill: z.enum(["High", "Medium", "Low", "None"])
  })).describe("Comparing resume claim vs observed skill based on scores")
});

const reportPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an expert technical interviewer tasked with summarizing a candidate's performance after an interview.
Provide a comprehensive, objective Evaluation Report addressing the candidate's actual demonstrable skills compared to their resume claims.
1. strengths: Use domains scoring > 7
2. weak_areas: Use domains scoring < 4
3. potential_growth: Cross-domain inference
4. professional_summary: 3-4 sentence paragraph
5. resume_vs_observed: Claimed capability vs observed capability`],
  ["user", `CANDIDATE INFO:
{candidate_info}

RESUME TOOL SKILLS:
{resume_skills}

DOMAIN SCORES (Calculated dynamically during interview):
{domain_scores}`]
]);

exports.generateFinalReport = async (resumeProfile) => {
  try {
    const candidateInfo = JSON.stringify(resumeProfile.candidate_info);
    const resumeSkills = resumeProfile.technical_skills.join(", ");
    const domainScoresArray = Array.from(resumeProfile.domain_scores.entries()).map(([k, v]) => `${k}: ${v.toFixed(2)}`);
    const domainScoresText = domainScoresArray.join("\\n");

    log.info("AGENT", "🤖 Calling LangChain to generate Final Evaluation Report...");
    
    const llm = getLLM({ temperature: 0.2 });
    const structuredLlm = llm.withStructuredOutput(reportSchema);
    const chain = reportPrompt.pipe(structuredLlm);

    const parsedReport = await chain.invoke({
      candidate_info: candidateInfo,
      resume_skills: resumeSkills,
      domain_scores: domainScoresText
    });

    log.success("AGENT", "✅ Final Evaluation Report generated.");
    
    // Merge the raw scores in for UI rendering
    parsedReport.skill_scores = Object.fromEntries(resumeProfile.domain_scores);

    return parsedReport;

  } catch (err) {
    log.error("AGENT", `Report generation failed: ${err.message}`, err);
    throw err;
  }
};
