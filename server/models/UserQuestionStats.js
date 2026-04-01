const mongoose = require("mongoose");

const userQuestionStatsSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Question", 
    required: true, 
    index: true 
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  solved: { 
    type: Boolean, 
    default: false 
  },
  timeTaken: { 
    type: [Number], 
    default: [] 
  },
  lastAttemptedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Ensure unique combination of user and question
userQuestionStatsSchema.index({ userId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model("UserQuestionStats", userQuestionStatsSchema);
