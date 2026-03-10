exports.normalizeQuestions = (candidateQuestions) => {

    const normalizedMap = {};
    const normalizedTexts = [];

    for (let q of candidateQuestions) {

        const text = q.question_text;
        if (!text) continue;

        const normalized = text
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim();

        if (!normalized) continue;

        normalizedMap[normalized] = {
            text,
            type: q.type || "General"
        };

        normalizedTexts.push(normalized);
    }

    return { normalizedMap, normalizedTexts };
};