const Page = require("../models/Page");
const Question = require("../models/Question");

const { extractQuestionsWithLLM } = require("../utils/llmExtractor");
const { normalizeQuestions } = require("../services/normalizerService");
const { upsertQuestions } = require("../services/questionService");

exports.extractQuestions = async (req, res) => {

    const { url, article_text } = req.body;

    if (!url || !article_text) {
        return res.status(400).json({
            error: "url and article_text are required"
        });
    }

    try {

        /* 1️⃣ Check cache */
        const existingPage = await Page.findOne({ page_url: url }).lean();

        if (existingPage) {

            const storedQuestions = await Question.find({
                _id: { $in: existingPage.question_ids }
            }).lean();

            return res.json({
                message: "Cached",
                questions: storedQuestions
            });
        }

        /* 2️⃣ Extract questions using LLM */
        const candidateQuestions =
            await extractQuestionsWithLLM(article_text);

        if (!candidateQuestions || candidateQuestions.length === 0) {
            return res.json({
                message: "No questions found",
                questions: []
            });
        }

        /* 3️⃣ Normalize questions */
        const { normalizedMap, normalizedTexts } =
            normalizeQuestions(candidateQuestions);

        /* 4️⃣ Insert / reuse questions in DB */
        const extractedQuestions =
            await upsertQuestions(normalizedMap, normalizedTexts);

        /* 5️⃣ Detect source domain */
        let sourceDomain = "unknown";

        try {
            sourceDomain = new URL(url).hostname;
        } catch { }

        /* 6️⃣ Save page */
        const newPage = new Page({
            page_url: url,
            raw_article_text: article_text,
            question_ids: extractedQuestions.map(q => q._id),
            source_site: sourceDomain
        });

        await newPage.save();

        /* 7️⃣ Response */

        return res.json({
            message: "Extracted",
            questions: extractedQuestions
        });

    } catch (error) {

        console.error("Extraction error:", error);

        return res.status(500).json({
            error: "Internal server error"
        });

    }
};