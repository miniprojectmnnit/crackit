const mongoose = require("mongoose");

const resumeProfileSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  
  candidate_info: {
    name: { type: String },
    education: [{
      degree: String,
      university: String,
      year_of_graduation: String
    }]
  },

  // Store raw technologies identified (Tool Layer)
  technical_skills: [String],

  // Extracted projects
  projects: [{
    name: String,
    description: String,
    technologies_used: [String],
    role: String
  }],

  // Initial mapped domain scores based purely on resume claims
  // Will be strings matching primary domains with a float value (0-10)
  domain_scores: {
    type: Map,
    of: Number,
    default: new Map([
      ["Programming", 0],
      ["Data Structures & Algorithms", 0],
      ["Logical Reasoning", 0],
      ["Mathematics", 0],
      ["Networking", 0],
      ["Operating Systems", 0],
      ["Databases", 0],
      ["System Design", 0],
      ["Problem Solving", 0],
      ["Communication", 0]
    ])
  },

  // Raw text to keep a record
  raw_text: { type: String }

}, { timestamps: true });

module.exports = mongoose.model("ResumeProfile", resumeProfileSchema);
