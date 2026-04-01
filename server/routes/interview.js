const express = require("express");
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const {
  getQuestionsForUrl,
  createSession,
  evaluateQuestion,
  executeCodingAnswer,
  getSession,
  getReport,
  getUserSessions,
  getSmartDSAQuestions
} = require("../controllers/interviewController");
const { getLiveToken } = require("../controllers/liveTokenController");

// Basic questions retrieval
router.get("/questions", getQuestionsForUrl);
router.get("/smart-dsa", requireAuth(), getSmartDSAQuestions);

// Gemini Live API token
router.get("/live-token", getLiveToken);

// Session endpoints
router.post("/session", createSession);
router.get("/session/:id", getSession);
router.get("/session/:id/report", getReport);
router.get("/history", getUserSessions);

// Question action endpoints
router.post("/session/:id/evaluate", evaluateQuestion);
router.post("/session/:id/execute", executeCodingAnswer);

module.exports = router;
