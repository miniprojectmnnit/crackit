const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Page = require("../models/Page");
const { evaluateAnswer } = require("../agents/evaluateAgent");
const { executeCode } = require("../services/codeExecutionService");

exports.getQuestionsForUrl = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const page = await Page.findOne({ page_url: url }).populate("question_ids");
    if (!page) return res.status(404).json({ error: "No questions found for this URL" });

    res.json(page.question_ids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { user_id, source_url } = req.body;
    
    // For now we'll mock user_id if Clerk isn't strictly passing it yet
    const session = new InterviewSession({
      user_id: user_id || "anonymous_user",
      source_url,
      questions: [],
      transcript: []
    });

    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.evaluateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_id, answer } = req.body;

    const session = await InterviewSession.findById(id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const question = await Question.findById(question_id);
    if (!question) return res.status(404).json({ error: "Question not found" });

    // evaluate
    const evaluation = await evaluateAnswer(question, answer, question.solution);

    // Save to session
    session.questions.push({
      question_id,
      answer,
      score: evaluation?.correctness || 0
    });

    // Transcript logging
    session.transcript.push({ role: "candidate", text: answer });
    session.transcript.push({ role: "interviewer", text: evaluation?.feedback || "Okay, let's move on." });

    // Update total score naive average
    const totalScores = session.questions.reduce((acc, q) => acc + (q.score || 0), 0);
    session.total_score = totalScores / session.questions.length;

    await session.save();

    res.json({ evaluation, session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.executeCodingAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_id, code } = req.body;

    const session = await InterviewSession.findById(id);
    const question = await Question.findById(question_id);

    if (!session || !question) return res.status(404).json({ error: "Not found" });

    const testCases = question.test_cases || [];

    const result = await executeCode(code, testCases);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getSession = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id).populate("questions.question_id");
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
