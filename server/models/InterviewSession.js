const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  resume_id: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeProfile", required: true },

  // Generated question list (array of strings)
  questions: [{ type: String }],

  // LangGraph conductor state
  phase: {
    type: String,
    enum: ["initializing", "greeting", "questioning", "evaluating", "followup", "report", "done"],
    default: "initializing"
  },
  current_q_index: { type: Number, default: 0 },
  follow_up_count: { type: Number, default: 0 },

  // Full conversation transcript
  transcript: [
    {
      role: { type: String, enum: ["interviewer", "candidate"] },
      text: { type: String },
      question_index: { type: Number },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Per-question evaluations
  evaluations: [
    {
      question_index: { type: Number },
      question: { type: String },
      answer: { type: String },
      score: { type: Number },
      feedback: { type: String }
    }
  ],

  // Final AI-generated report
  final_report: {
    summary: { type: String },
    strengths: [String],
    areas_for_improvement: [String],
    overall_score: { type: Number },
    recommendation: { type: String }
  },

  total_score: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
