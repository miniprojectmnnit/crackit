const log = require("../utils/logger");

exports.normalizeQuestions = (candidateQuestions) => {

    log.info("NORMALIZE", `🔄 Normalizing ${candidateQuestions.length} candidate questions...`);

    const normalizedMap = {};
    const normalizedTexts = [];
    let skipped = 0;

    for (let q of candidateQuestions) {

        const text = q.question_text;
        if (!text) {
            skipped++;
            continue;
        }

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