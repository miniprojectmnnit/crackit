const express = require("express");
const router = express.Router();
const InterviewSession = require("../models/InterviewSession");
const ResumeProfile = require("../models/ResumeProfile");
const log = require("../utils/logger");

// POST /api/sessions — Create a new interview session from a resume
router.post("/", async (req, res) => {
  try {
    const { resume_id, user_id, context = {}, round_type = "resume" } = req.body;

    if (!resume_id || !user_id) {
      return res.status(400).json({ error: "resume_id and user_id are required" });
    }

    const validRounds = ["resume", "dsa", "system_design", "hr"];
    if (!validRounds.includes(round_type)) {
      return res.status(400).json({ error: `Invalid round_type. Must be one of: ${validRounds.join(", ")}` });
    }

    const resumeProfile = await ResumeProfile.findById(resume_id);
    if (!resumeProfile) {
      return res.status(404).json({ error: "Resume profile not found" });
    }

    const session = new InterviewSession({
      user_id,
      resume_id,
      round_type,
      context,
      questions: [],
      phase: "initializing",
      current_q_index: 0,
      follow_up_count: 0,
      transcript: []
    });

    await session.save();
    log.success("SESSION", `✅ Session [${round_type}] created: ${session._id} for user: ${user_id}`);

    res.status(201).json({
      session_id: session._id,
      round_type,
      ws_url: `ws://localhost:5000/ws/interview/${session._id}`
    });
  } catch (err) {
    log.error("SESSION", `Failed to create session: ${err.message}`);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /api/sessions/:id — Get session info and report
router.get("/:id", async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// GET /api/sessions/user/:userId — Get all sessions for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ user_id: req.params.userId })
      .sort({ createdAt: -1 })
      .select("_id phase round_type total_score final_report createdAt resume_id");
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

module.exports = router;
