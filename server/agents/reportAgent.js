const { ai } = require("../utils/geminiClient");
const log = require("../utils/logger");

const REPORT_PROMPT = `
You are an expert technical interviewer tasked with summarizing a candidate's performance after an interview.

CANDIDATE INFO:
{CANDIDATE_INFO}

RESUME TOOL SKILLS:
{RESUME_SKILLS}

DOMAIN SCORES (Calculated dynamically during interview):
{DOMAIN_SCORES}

Provide a comprehensive, objective Evaluation Report addressing the candidate's actual demonstrable skills compared to their resume claims.

Calculate & populate the following fields in the exact JSON format below:

1. \`strengths\`: Array of strings for domains scoring > 7. Provide a short description for each (e.g., "Strong logical reasoning demonstrated during behavioral questions").
2. \`weak_areas\`: Array of strings for domains scoring < 4. Provide short description (e.g., "Weak data structure fundamentals").
3. \`potential_growth\`: Array of strings. Use cross-domain inference. (e.g., "Strong reasoning but weak DSA -> high potential for algorithmic thinking").
4. \`professional_summary\`: A professional 3-4 sentence paragraph summarizing their overall performance.
5. \`resume_vs_observed\`: Array of objects comparing resume claim vs observed skill. You determine the "Resume Claim" (High, Medium, Low, None) based on whether it was heavily featured, and the "Observed Skill" similarly based on their numeric score (None: <2, Low: 2-4, Medium: 4-7, High: 7-10). Only include domains they were explicitly evaluated on or that were on the resume.

Return ONLY VALID JSON. No markdown wrappings.

{
  "strengths": ["string"],
  "weak_areas": ["string"],
  "potential_growth": ["string"],
  "professional_summary": "string",
  "resume_vs_observed": [
    {
      "domain": "string",
      "resume_claim": "High | Medium | Low | None",
      "observed_skill": "High | Medium | Low | None"
    }
  ]
}
`;

exports.generateFinalReport = async (resumeProfile) => {
  try {
    const candidateInfo = JSON.stringify(resumeProfile.candidate_info);
    const resumeSkills = resumeProfile.technical_skills.join(", ");
    const domainScoresArray = Array.from(resumeProfile.domain_scores.entries()).map(([k, v]) => `${k}: ${v.toFixed(2)}`);
    const domainScoresText = domainScoresArray.join("\\n");

    const prompt = REPORT_PROMPT
      .replace("{CANDIDATE_INFO}", candidateInfo)
      .replace("{RESUME_SKILLS}", resumeSkills)
      .replace("{DOMAIN_SCORES}", domainScoresText);

    log.info("AGENT", "🤖 Calling Gemini to generate Final Evaluation Report...");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const output = (response.text || "").trim();
    const jsonStr = output.replace(/^\`\`\`json/i, "").replace(/\`\`\`$/, "").trim();
    
    const parsedReport = JSON.parse(jsonStr);
    
    // Merge the raw scores in for UI rendering
    parsedReport.skill_scores = Object.fromEntries(resumeProfile.domain_scores);

    return parsedReport;

  } catch (err) {
    log.error("AGENT", `Report generation failed: ${err.message}`, err);
    throw err;
  }
};
