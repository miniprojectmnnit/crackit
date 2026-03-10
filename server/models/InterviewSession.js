const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true }, // Clerk user ID
  source_url: { type: String },              // The URL they are practicing against

  questions: [
    {
      question_id: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      answer: { type: String }, // Code or text response
      score: { type: Number },
      followup_answer: { type: String }
    }
  ],

  transcript: [
    {
      role: { type: String, enum: ["interviewer", "candidate"] },
      text: { type: String }
    }
  ],

  total_score: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
