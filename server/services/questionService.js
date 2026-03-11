const Question = require("../models/Question");
const { expandCodingQuestion } = require("./questionExpansionService");
const log = require("../utils/logger");

exports.upsertQuestions = async (normalizedMap, normalizedTexts, sourceDomain) => {

    log.info("DB", `💾 Upserting ${normalizedTexts.length} questions (source: ${sourceDomain})`);

    const existingQuestions = await Question.find({
        normalized_text: { $in: normalizedTexts }
    });

    const existingMap = {};

    existingQuestions.forEach(q => {
        existingMap[q.normalized_text] = q;
    });

    const existingCount = existingQuestions.length;
    const newCount = normalizedTexts.length - existingCount;
    log.info("DB", `📊 Found ${existingCount} existing, ${newCount} new questions to create`);

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
                log.info("DB", `🔧 Expanding coding question: "${questionData.question_text.substring(0, 80)}..."`);
                const expanded = await expandCodingQuestion(questionData.question_text);
                if (expanded) {
                    questionData = { ...questionData, ...expanded };
                    log.success("DB", `✅ Coding question expanded — title: "${expanded.title}", difficulty: ${expanded.difficulty}`);
                } else {
                    log.warn("DB", `Expansion returned null for: "${questionData.question_text.substring(0, 60)}..."`);
                }
            }

            const newQuestion = new Question(questionData);
            question = await newQuestion.save();
            log.success("DB", `💾 Saved new question: "${question.question_text.substring(0, 60)}..." (type: ${question.type})`);
        } else {
            log.debug("DB", `♻️ Reusing existing question: "${question.question_text.substring(0, 60)}..."`);
        }

        results.push(question);
    }

    log.success("DB", `✅ Upsert complete — ${results.length} total questions ready`);

    return results;
};