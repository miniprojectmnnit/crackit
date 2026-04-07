const mongoose = require("mongoose");

const snippetSchema = new mongoose.Schema({
  method_name: String,
  parameters: [
    {
      name: String,
      type: String
    }
  ],
  return_type: String,
  starter_code: String
}, { _id: false });

const questionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },

  normalized_text: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  type: { 
    type: String, 
    enum: ["Coding", "Behavioral", "System Design", "General"],
    default: "General" 
  },

  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },

  tags: { type: [String], default: [] },

  // New fields for AI Interviewer System
  title: { type: String },
  description: { type: String },
  constraints: { type: [String], default: [] },
  topics: { type: [String], default: [] },
  method_name: { type: String },
  parameters: [
    {
      name: { type: String },
      type: { type: String }
    }
  ],
  return_type: { type: String },
  starter_code: { type: String },
  solution: { type: String },
  source_site: { type: String },

  snippets: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  examples: [
    {
      input: { type: String },
      output: { type: String },
      explanation: { type: String }
    }
  ],

  test_cases: [
    {
      input: { type: String },
      expected_output: { type: String }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);