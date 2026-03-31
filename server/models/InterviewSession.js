const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  resume_id: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeProfile", required: false },
  source_url: { type: String, required: false },

  // Generated question list
  questions: [{
    question_id: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    text: { type: String }, // For LLM-generated plain text questions
    answer: { type: String },
    score: { type: Number }
  }],

  // User-provided context
  context: {
    company: { type: String, default: "" },
    role: { type: String, default: "" },
    experience: { type: String, default: "" },
    focusArea: { type: String, default: "" },
  },

  // Interview round type selected by candidate
  round_type: {
    type: String,
    enum: ["resume", "dsa", "system_design", "hr"],
    default: "resume"
  },

  // LangGraph conductor state
  phase: {
    type: String,
    enum: ["initializing", "greeting", "questioning", "evaluating", "followup", "report", "generating_report", "done"],
    default: "initializing"
  },
  current_q_index: { type: Number, default: 0 },
  dsa_sub_phase: { 
    type: String, 
    enum: ["intuition", "coding", "evaluating"],
    default: "intuition"
  },
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
