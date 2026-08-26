const express = require("express");
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const { expensiveLimiter } = require("../middleware/rateLimiter");
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

// Question action endpoints — protected by strict rate limiter (15 req/min)
// These routes call Judge0 (code execution) and Groq LLM (AI evaluation),
// both of which are paid external APIs that must be protected from abuse.
router.post("/session/:id/evaluate", expensiveLimiter, evaluateQuestion);
router.post("/session/:id/execute", expensiveLimiter, executeCodingAnswer);

module.exports = router;

