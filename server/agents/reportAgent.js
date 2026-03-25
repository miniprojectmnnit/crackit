const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const reportSchema = z.object({
  summary: z.string().describe("A 3-4 sentence overall summary of the candidate's performance across the full interview."),
  strengths: z.array(z.string()).describe("3-5 specific strengths demonstrated during the interview."),
  areas_for_improvement: z.array(z.string()).describe("3-5 specific areas where the candidate needs to improve."),
  overall_score: z.number().int().min(0).max(100).describe("Overall interview score from 0-100."),
  recommendation: z.enum(["Strong Hire", "Hire", "Maybe", "No Hire"]).describe("Final hiring recommendation.")
});

const reportPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a senior engineering manager and expert technical interviewer.
You have just conducted a complete technical interview with a candidate.
Your job is to write a comprehensive, realistic, and objective final assessment.

Be like a real hiring manager:
- Acknowledge specific moments from the conversation
- Reference specific questions and answers where relevant
- Be honest but constructive
- Base the recommendation on the actual evidence in the transcript`],
  ["user", `Here is the full interview transcript:

{transcript}

Based on this transcript, generate a final interview report.`]
]);

async function generateFinalReport(transcript) {
  log.info("REPORT_AGENT", `📋 Generating final report from ${transcript.length} transcript entries...`);

  const transcriptStr = transcript
    .map(t => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n\n");

  try {
    const llm = getLLM({ temperature: 0.3 });
    const structuredLlm = llm.withStructuredOutput(reportSchema);
    const chain = reportPrompt.pipe(structuredLlm);

    const result = await chain.invoke({ transcript: transcriptStr });

    log.success("REPORT_AGENT", `✅ Report generated — score: ${result.overall_score}, recommendation: ${result.recommendation}`);
    return result;
  } catch (error) {
    log.error("REPORT_AGENT", `Report generation failed: ${error.message}`);
    return {
      summary: "Report generation failed.",
      strengths: [],
      areas_for_improvement: [],
      overall_score: 0,
      recommendation: "Maybe"
    };
  }
}

module.exports = { generateFinalReport };
