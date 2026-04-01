const { getAuth } = require('@clerk/express');
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Page = require("../models/Page");
const ResumeProfile = require("../models/ResumeProfile");
const { evaluateAnswer } = require("../agents/evaluateAgent");
const { generateInterviewPlan } = require("../agents/interviewPlanAgent");
const { generateFinalReport } = require("../agents/reportAgent");
const { executeCodePipeline } = require("../services/executionService");
const UserQuestionStats = require("../models/UserQuestionStats");
const { getSmartDSAQuestions } = require("../services/dsaSelectionService");
const log = require("../utils/logger");

exports.getQuestionsForUrl = async (req, res) => {
  try {
    const { url } = req.query;
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
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
    const { source_url, resume_id, question_count = 10, context = {} } = req.body;
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    log.info("SESSION", `🆕 Creating interview session — user: ${userId}, url: ${source_url}, resume_id: ${resume_id}`);
    
    let questions = [];

    if (resume_id) {
       log.info("SESSION", `📄 Using Resume Profile to generate questions...`);
       const resumeProfile = await ResumeProfile.findById(resume_id);
       if (!resumeProfile) {
         return res.status(404).json({ error: "Resume profile not found" });
       }
       // Generate custom questions
       const questionTexts = await generateInterviewPlan(resumeProfile, question_count, context);
       questions = questionTexts.map(text => ({ text }));
    } else if (source_url) {
      log.info("SESSION", `🌐 Fetching existing questions from URL: ${source_url}`);
      const page = await Page.findOne({ page_url: source_url });
      if (page && page.question_ids && page.question_ids.length > 0) {
        log.success("SESSION", `✅ Found ${page.question_ids.length} questions for URL`);
        questions = page.question_ids.map(id => ({ question_id: id }));
      } else {
        log.warn("SESSION", `⚠️  No questions found for URL: ${source_url}. Interview will have no questions.`);
      }
    }

    const session = new InterviewSession({
      userId: userId,
      source_url,
      resume_id,
      context,
      questions,
      transcript: []
    });

    await session.save();
    log.success("SESSION", `✅ Session created — ID: ${session._id} with ${questions.length} questions`);
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
    const { userId: authUserId } = getAuth(req);
    if (!session || session.userId !== authUserId) {
      log.warn("EVALUATE", `Session not found or forbidden: ${id}`);
      return res.status(session ? 403 : 404).json({ error: "Session not found or access denied" });
    }

    let question = await Question.findById(question_id);
    if (!question) {
      log.warn("EVALUATE", `Question document not found: ${question_id}, checking session inline questions...`);
      // Fallback: check if the question_id matches an embedded text question in the session
      const embeddedQuestion = session.questions.find(q => q._id && q._id.toString() === question_id);
      if (embeddedQuestion && embeddedQuestion.text) {
        question = {
          _id: embeddedQuestion._id,
          question_text: embeddedQuestion.text,
          type: "General"
        };
      } else {
        return res.status(404).json({ error: "Question not found" });
      }
    }

    log.info("EVALUATE", `🤖 Calling evaluateAgent — question type: ${question.type}, text: "${question.question_text?.substring(0, 60)}..."`);

    // evaluate
    const evaluation = await evaluateAnswer(question, answer, question.solution, session.transcript);

    log.success("EVALUATE", `✅ Evaluation complete — correctness: ${evaluation?.correctness}, clarity: ${evaluation?.clarity}, problem_solving: ${evaluation?.problem_solving}`);
    if (evaluation?.follow_up_question) {
      log.info("EVALUATE", `🔄 Follow-up question: "${evaluation.follow_up_question.substring(0, 80)}..."`);
    }

    // Save to session
    const existingQuestion = session.questions.find(q =>
      (q.question_id && q.question_id.toString() === question_id) ||
      (q._id && q._id.toString() === question_id)
    );

    if (existingQuestion) {
      existingQuestion.answer = answer;
      existingQuestion.score = evaluation?.correctness || 0;
    } else {
      session.questions.push({
        question_id,
        answer,
        score: evaluation?.correctness || 0
      });
    }

    // Transcript logging
    session.transcript.push({ role: "candidate", text: answer });
    session.transcript.push({ role: "interviewer", text: evaluation?.feedback || "Okay, let's move on." });

    // Update total score naive average
    const totalScores = session.questions.reduce((acc, q) => acc + (q.score || 0), 0);
    session.total_score = totalScores / session.questions.length;

    await session.save();
    
    // Domain Score Updating Layer
    if (session.resume_id && question.domain) {
      log.info("EVALUATE", `📈 Updating Domain Score for ${question.domain} in ResumeProfile`);
      const resume = await ResumeProfile.findById(session.resume_id);
      if (resume) {
        let currentScore = resume.domain_scores.get(question.domain) || 0;
        let increment = 0.05; // Default incorrect or very poor

        if (evaluation?.correctness >= 80) increment = 0.3;
        else if (evaluation?.correctness >= 50) increment = 0.15;

        // Apply reasoning bonus if applicable
        if (evaluation?.problem_solving >= 80) {
           let logicScore = resume.domain_scores.get("Logical Reasoning") || 0;
           resume.domain_scores.set("Logical Reasoning", Math.min(10, logicScore + 0.1));
        }

        resume.domain_scores.set(question.domain, Math.min(10, currentScore + increment));
        await resume.save();
        log.success("EVALUATE", `📈 Domain ${question.domain} updated by +${increment} to ${resume.domain_scores.get(question.domain).toFixed(2)}`);
      }
    }

    log.success("EVALUATE", `💾 Session updated — total score: ${session.total_score.toFixed(1)}, questions answered: ${session.questions.length}`);

    // Update User Question Stats
    const { timeTaken = 0 } = req.body;
    await UserQuestionStats.findOneAndUpdate(
      { userId: authUserId, questionId: question_id },
      { 
        $inc: { attempts: 1 },
        $push: { timeTaken: timeTaken },
        $set: { solved: evaluation?.correctness >= 80, lastAttemptedAt: new Date() }
      },
      { upsert: true }
    );

    res.json({ evaluation, session });
  } catch (err) {
    log.error("EVALUATE", `Evaluation failed: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.executeCodingAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_id, code, language = "JavaScript" } = req.body;

    log.info("EXECUTE", `🏃 Code execution request — session: ${id}, question: ${question_id}, lang: ${language}`);
    log.info("EXECUTE", `📝 Code length: ${code ? code.length : 0} chars`);

    const session = await InterviewSession.findById(id);
    const question = await Question.findById(question_id);
    const { userId: authUserId } = getAuth(req);

    if (!session || !question || session.userId !== authUserId) {
      log.warn("EXECUTE", `Not found or forbidden — session: ${!!session}`);
      return res.status((session && session.userId !== authUserId) ? 403 : 404).json({ error: "Not found or access denied" });
    }

    const testCases = question.test_cases || [];
    log.info("EXECUTE", `🧪 Running ${testCases.length} test cases...`);

    const result = await executeCodePipeline(code, language, question, testCases);

    log.success("EXECUTE", `✅ Execution complete — passed: ${result.passed}, failed: ${result.failed}${result.error ? ', error: ' + result.error : ''}`);

    // Update User Question Stats
    const { timeTaken = 0 } = req.body;
    const isSolved = result.passed > 0 && result.failed === 0;
    await UserQuestionStats.findOneAndUpdate(
      { userId: authUserId, questionId: question_id },
      { 
        $inc: { attempts: 1 },
        $push: { timeTaken: timeTaken },
        $set: { solved: isSolved, lastAttemptedAt: new Date() }
      },
      { upsert: true }
    );

    res.json(result);
  } catch (err) {
    log.error("EXECUTE", `Code execution failed: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getSession = async (req, res) => {
  try {
    log.info("SESSION", `📋 Fetching session: ${req.params.id}`);
    const session = await InterviewSession.findById(req.params.id).populate({ path: "questions.question_id", model: "Question" });
    const { userId: authUserId } = getAuth(req);
    if (!session || session.userId !== authUserId) {
      log.warn("SESSION", `Session not found or forbidden: ${req.params.id}`);
      return res.status(session ? 403 : 404).json({ error: "Session not found or access denied" });
    }
    
    log.success("SESSION", `✅ Session retrieved — ${session.questions.length} questions, score: ${session.total_score || 'N/A'}`);
    res.json(session);
  } catch (err) {
    log.error("SESSION", `Failed to fetch session: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    log.info("REPORT", `📋 Generating report for session: ${id}`);
    
    const session = await InterviewSession.findById(id);
    const { userId: authUserId } = getAuth(req);
    if (!session || session.userId !== authUserId) return res.status(session ? 403 : 404).json({ error: "Session not found or access denied" });
    if (session.phase === "done" && session.final_report) {
      log.info("REPORT", `Report already generated for session: ${id}`);
      return res.json(session);
    }

    // Mark phase as generating to avoid duplicate calls
    session.phase = "generating_report";
    await session.save();

    const report = await generateFinalReport(session.transcript);

    // Save to session
    session.final_report = report;
    session.phase = "done";
    await session.save();
    log.success("REPORT", `✅ Report generated and saved to session: ${id}`);

    res.json(session);
  } catch (err) {
    log.error("REPORT", `Failed to generate report: ${err.message}`, err);
    // Revert phase on error if it was generating
    try {
       const s = await InterviewSession.findById(req.params.id);
       if(s && s.phase === "generating_report") {
         s.phase = "initializing";
         await s.save();
       }
    } catch(e) {}
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    log.info("SESSION", `📋 Fetching interview history for auth user: ${userId}`);
    
    // Find all sessions for the user, sort by newest first
    const sessions = await InterviewSession.find({ userId: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "questions.question_id", model: "Question" })
      .populate({ path: "resume_id", model: "ResumeProfile" });
      
    log.success("SESSION", `✅ Retrieved ${sessions.length} sessions for user ${userId}`);
    res.json(sessions);
  } catch (err) {
    log.error("SESSION", `Failed to fetch user sessions: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getSmartDSAQuestions = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    log.info("DSA", `🎯 Selecting smart questions for user: ${userId}`);
    const questions = await getSmartDSAQuestions(userId);
    
    log.success("DSA", `✅ Selected ${questions.length} questions for ${userId}`);
    res.json(questions);
  } catch (err) {
    log.error("DSA", `Failed to select questions: ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
};
