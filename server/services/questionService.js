const Question = require("../models/Question");

exports.upsertQuestions = async (normalizedMap, normalizedTexts) => {

    const existingQuestions = await Question.find({
        normalized_text: { $in: normalizedTexts }
    });

    const existingMap = {};

    existingQuestions.forEach(q => {
        existingMap[q.normalized_text] = q;
    });

    const results = [];

    for (let normalized of normalizedTexts) {

        let question = existingMap[normalized];

        if (!question) {

            const newQuestion = new Question({
                question_text: normalizedMap[normalized].text,
                normalized_text: normalized,
                type: normalizedMap[normalized].type
            });

            question = await newQuestion.save();
        }

        results.push(question);
    }

    return results;
};