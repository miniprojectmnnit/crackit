const { z } = require("zod");
const { getLLM } = require("../utils/llmClient");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const log = require("../utils/logger");

const correctionSchema = z.object({
  corrected_text: z.string().describe("The corrected version of the user's speech.")
});

const correctionPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an expert Speech-to-Text error corrector for a technical interview application.

The candidate is speaking their answer about their technical experience, skills, and projects.
You must fix STT transcription errors while PRESERVING the candidate's actual meaning and intent.

WHAT TO FIX:
1. Phonetically similar word substitutions — the microphone mishears words that sound alike:
   - "game" → "gain" (if context is about experience/learning, not gaming)
   - "their" / "there" / "they're" confusion
   - "accept" / "except", "affect" / "effect"
   - Technical jargon mishearing: "react" heard as "react" is fine; "component" heard as "comment" → fix
   - Names of tech: "mongo" heard as "mango", "node" heard as "mode", "python" heard as "pie thing"
   - Hindi words that are STT phonetic guesses: e.g. "mujhe" might be heard as "movie" → translate to English equivalent

2. Clear STT mechanical errors: wrong word splits, run-ons, missing spaces.

3. Mixed Hindi-English (code-switching): translate Hindi portions to English ONLY if the meaning is clear from context.

WHAT NOT TO CHANGE:
- Do NOT correct wrong technical answers — if candidate says something incorrect, keep it
- Do NOT improve grammar or sentence structure beyond fixing the transcription error
- Do NOT add information the candidate didn't say
- Do NOT change the candidate's opinion or assessment of anything

CONTEXT: This is a technical interview. Candidate is likely talking about programming, projects, work experience, problem-solving, and technical concepts.

Examples:
- "I learned a lot through game experience" → "I learned a lot through gain experience" (game/gain phonetic swap)
- "I use react and mango db" → "I use React and MongoDB" (mango → Mongo)
- "the time complexity is oh of log n" → "the time complexity is O(log n)"
- "I worked with my team and we had to except the deadline" → "I worked with my team and we had to accept the deadline"
- "mujhe ye problem mili thi" → "I had encountered this problem" (translate Hindi)
- "I use pie thing for data analysis" → "I use Python for data analysis"`],
  ["user", `Fix any STT transcription errors in this candidate's response. Return only the corrected text:\n\n"{raw_text}"`]
]);


/**
 * Corrects STT transcription errors without changing meaning or content.
 */
async function correctTranscription(rawText) {
  if (!rawText || rawText.trim().length < 5) return rawText;

  log.info("STT_AGENT", `🔊 Correcting transcription: "${rawText.substring(0, 80)}..."`);

  try {
    const llm = getLLM({ temperature: 0 });
    const chain = correctionPrompt.pipe(llm.withStructuredOutput(correctionSchema));
    const result = await chain.invoke({ raw_text: rawText });

    if (result.corrected_text && result.corrected_text.trim()) {
      if (result.corrected_text !== rawText) {
        log.info("STT_AGENT", `✅ Corrected: "${result.corrected_text.substring(0, 80)}..."`);
      } else {
        log.info("STT_AGENT", `✅ No correction needed`);
      }
      return result.corrected_text;
    }
    return rawText;
  } catch (err) {
    log.error("STT_AGENT", `Correction failed: ${err.message}`);
    return rawText; // Return original on failure — never block the interview
  }
}

module.exports = { correctTranscription };
