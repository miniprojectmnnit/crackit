const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Page = require("../models/Page");
const { evaluateAnswer } = require("../agents/evaluateAgent");
const { executeCode } = require("../services/codeExecutionService");
const log = require("../utils/logger");

exports.getQuestionsForUrl = async (req, res) => {
  try {
    const { url } = req.query;
    log.info("INTERVIEW", `📋 Fetching questions for URL: ${url}`);

    if (!url) return res.status(400).json({ error: "URL is required" });

    const page = await Page.findOne({ page_url: url }).populate("question_ids");
    if (!page) {
      log.warn("INTERVIEW", `No page found for URL: ${url}`);
      return res.status(404).json({ error: "No questions found for this URL" });
    }

    log.success("INTERVIEW", `✅ Returning ${page.question_ids.length} questions for ${url}`);
    res.json(page.question_ids);
  } catch (err) {
    log.error("INTERVIEW", `Failed to fetch questions: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { user_id, source_url } = req.body;
    log.info("SESSION", `🆕 Creating interview session — user: ${user_id || 'anonymous'}, url: ${source_url}`);
    
    const session = new InterviewSession({
      user_id: user_id || "anonymous_user",
      source_url,
      questions: [],
      transcript: []
    });

    await session.save();
    log.success("SESSION", `✅ Session created — ID: ${session._id}`);
    res.status(201).json(session);
  } catch (err) {
    log.error("SESSION", `Failed to create session: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.evaluateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_id, answer } = req.body;

    log.info("EVALUATE", `📝 Evaluating answer — session: ${id}, question: ${question_id}`);
    log.info("EVALUATE", `📝 Answer length: ${answer ? answer.length : 0} chars`);

    const session = await InterviewSession.findById(id);
    if (!session) {
      log.warn("EVALUATE", `Session not found: ${id}`);
      return res.status(404).json({ error: "Session not found" });
    }

    const question = await Question.findById(question_id);
    if (!question) {
      log.warn("EVALUATE", `Question not found: ${question_id}`);
      return res.status(404).json({ error: "Question not found" });
    }

    log.info("EVALUATE", `🤖 Calling evaluateAgent — question type: ${question.type}, text: "${question.question_text.substring(0, 60)}..."`);

    // evaluate
    const evaluation = await evaluateAnswer(question, answer, question.solution);

    log.success("EVALUATE", `✅ Evaluation complete — correctness: ${evaluation?.correctness}, clarity: ${evaluation?.clarity}, problem_solving: ${evaluation?.problem_solving}`);
    if (evaluation?.follow_up_question) {
      log.info("EVALUATE", `🔄 Follow-up question: "${evaluation.follow_up_question.substring(0, 80)}..."`);
    }

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
    log.success("EVALUATE", `💾 Session updated — total score: ${session.total_score.toFixed(1)}, questions answered: ${session.questions.length}`);

    res.json({ evaluation, session });
  } catch (err) {
    log.error("EVALUATE", `Evaluation failed: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.executeCodingAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_id, code } = req.body;

    log.info("EXECUTE", `🏃 Code execution request — session: ${id}, question: ${question_id}`);
    log.info("EXECUTE", `📝 Code length: ${code ? code.length : 0} chars`);

    const session = await InterviewSession.findById(id);
    const question = await Question.findById(question_id);

    if (!session || !question) {
      log.warn("EXECUTE", `Not found — session: ${!!session}, question: ${!!question}`);
      return res.status(404).json({ error: "Not found" });
    }

    const testCases = question.test_cases || [];
    log.info("EXECUTE", `🧪 Running ${testCases.length} test cases...`);

    const result = await executeCode(code, testCases);

    log.success("EXECUTE", `✅ Execution complete — passed: ${result.passed}, failed: ${result.failed}${result.error ? ', error: ' + result.error : ''}`);

    res.json(result);
  } catch (err) {
    log.error("EXECUTE", `Code execution failed: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getSession = async (req, res) => {
  try {
    log.info("SESSION", `📋 Fetching session: ${req.params.id}`);
    const session = await InterviewSession.findById(req.params.id).populate("questions.question_id");
    if (!session) {
      log.warn("SESSION", `Session not found: ${req.params.id}`);
      return res.status(404).json({ error: "Session not found" });
    }
    
    log.success("SESSION", `✅ Session retrieved — ${session.questions.length} questions, score: ${session.total_score || 'N/A'}`);
    res.json(session);
  } catch (err) {
    log.error("SESSION", `Failed to fetch session: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};
