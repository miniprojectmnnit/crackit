const Question = require("../models/Question");
const { expandCodingQuestion } = require("./questionExpansionService");

exports.upsertQuestions = async (normalizedMap, normalizedTexts, sourceDomain) => {

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
            
            let questionData = {
                question_text: normalizedMap[normalized].text,
                normalized_text: normalized,
                type: normalizedMap[normalized].type,
                source_site: sourceDomain
            };

            // If it's a coding question, expand it using the Multi-Agent pipeline
            if (questionData.type === "Coding") {
                console.log(`Expanding coding question: "${questionData.question_text}"`);
                const expanded = await expandCodingQuestion(questionData.question_text);
                if (expanded) {
                    questionData = { ...questionData, ...expanded };
                }
            }

            const newQuestion = new Question(questionData);
            question = await newQuestion.save();
        }

        results.push(question);
    }

    return results;
};