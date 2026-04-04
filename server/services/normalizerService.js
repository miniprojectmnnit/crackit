const log = require("../utils/logger");

exports.normalizeQuestions = (candidateQuestions) => {

    log.info("NORMALIZE", `🔄 Normalizing ${candidateQuestions.length} candidate questions...`);
    //normalizedMap: A dictionary where the "Clean" version is the key, and the "Original" version (with proper grammar and casing) is the value. This way, you can search efficiently but still display a nice-looking question to the user.
    //normalizedTexts: A simple array of all the clean strings, which makes it easy to run a "Bulk Search" in your database.
    const normalizedMap = {};
    const normalizedTexts = [];
    let skipped = 0;

    for (let q of candidateQuestions) {

        const text = q.question_text;
        if (!text) {
            skipped++;
            continue;
        }
        //first convert to lowercase
        //then remmove all characters except letter,digit or space
        //remove first and alst space
        const normalized = text
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim();

        if (!normalized) {
            skipped++;
            continue;
        }

        normalizedMap[normalized] = {
            text,
            type: q.type || "General"
        };

        normalizedTexts.push(normalized);
    }

    log.success("NORMALIZE", `✅ Normalization complete — ${normalizedTexts.length} unique questions, ${skipped} skipped`);

    return { normalizedMap, normalizedTexts };
};