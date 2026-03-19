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
  getUserSessions
} = require("../controllers/interviewController");
const { getLiveToken } = require("../controllers/liveTokenController");

// Basic questions retrieval
router.get("/questions", getQuestionsForUrl);

// Gemini Live API token
router.get("/live-token", getLiveToken);

// Session endpoints
router.post("/session", createSession);
router.get("/session/:id", getSession);
router.get("/session/:id/report", getReport);
router.get("/user/:userId", getUserSessions);

// Question action endpoints
router.post("/session/:id/evaluate", evaluateQuestion);
router.post("/session/:id/execute", executeCodingAnswer);

module.exports = router;
