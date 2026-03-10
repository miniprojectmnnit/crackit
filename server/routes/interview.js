const express = require("express");
const router = express.Router();
const {
  getQuestionsForUrl,
  createSession,
  evaluateQuestion,
  executeCodingAnswer,
  getSession
} = require("../controllers/interviewController");

// Basic questions retrieval
router.get("/questions", getQuestionsForUrl);

// Session endpoints
router.post("/session", createSession);
router.get("/session/:id", getSession);

// Question action endpoints
router.post("/session/:id/evaluate", evaluateQuestion);
router.post("/session/:id/execute", executeCodingAnswer);

module.exports = router;
