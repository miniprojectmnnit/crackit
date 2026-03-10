const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },

  normalized_text: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  type: { type: String, default: "General" },

  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },

  tags: { type: [String], default: [] }

}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);