const Question = require("../models/Question");
const UserQuestionStats = require("../models/UserQuestionStats");
const InterviewSession = require("../models/InterviewSession");

/**
 * Smart DSA selection system logic
 * Features:
 * - 1 Easy, 1 Medium, 1 Hard (Exactly 3)
 * - Cooldown (last 3 sessions)
 * - Phase 1: Unsolved questions
 * - Phase 2: Weakness based strategy
 */
exports.getSmartDSAQuestions = async (userId) => {
  // 1. Identify "Recently Asked Questions" (Cooldown - Last 3 sessions)
  const recentSessions = await InterviewSession.find({ userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .select("questions.question_id");

  const recentQuestionIds = recentSessions.flatMap(session => 
    session.questions.map(q => q.question_id?.toString())
  ).filter(Boolean);

  const results = [];
  const difficulties = ["Easy", "Medium", "Hard"];

  for (const diff of difficulties) {
    let question = null;

    // --- Phase 1: Unsolved Questions ---
    // Fetch stats for this user that are NOT solved
    const solvedStats = await UserQuestionStats.find({ userId, solved: true }).select("questionId");
    const solvedIds = solvedStats.map(s => s.questionId.toString());

    // Strategy 1: Find a question with NO record OR solved = false, and NOT in recent
    const unsolvedQuestion = await Question.findOne({
      difficulty: diff,
      type: "Coding", // Only DSA/Coding questions
      _id: { $nin: [...recentQuestionIds, ...solvedIds] }
    }).sort({ createdAt: -1 }); // Pick newer ones first or random? Let's do random-ish by skipping
    
    // If we have many, pick 1 randomly from a small pool
    if (unsolvedQuestion) {
      // For more randomness, we could use aggregate $sample, but findOne is simpler for now.
      // Let's refine to pick randomly from top 10 unsolved to avoid always picking the same one if multiple users start.
      const pool = await Question.find({
        difficulty: diff,
        type: "Coding",
        _id: { $nin: [...recentQuestionIds, ...solvedIds] }
      }).limit(10);
      
      if (pool.length > 0) {
        question = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    // --- Phase 2: Weakness Strategy (If Phase 1 fails or all solved) ---
    if (!question) {
      const allDiffQuestions = await Question.find({ 
        difficulty: diff, 
        type: "Coding",
        _id: { $nin: recentQuestionIds } 
      });

      if (allDiffQuestions.length > 0) {
        // Fetch stats for these questions to calculate priority
        const questionIds = allDiffQuestions.map(q => q._id);
        const stats = await UserQuestionStats.find({ 
          userId, 
          questionId: { $in: questionIds } 
        });

        const statsMap = new Map(stats.map(s => [s.questionId.toString(), s]));

        // Calculate priority score for each
        const ranked = allDiffQuestions.map(q => {
          const s = statsMap.get(q._id.toString());
          let score = 0;
          if (s) {
            // priorityScore = (attempts * 10) + (avgTimeInMinutes) + (lastAttemptSolved ? 0 : 50)
            const avgTime = s.timeTaken.length > 0 
              ? s.timeTaken.reduce((a, b) => a + b, 0) / s.timeTaken.length 
              : 0;
            const avgTimeMin = avgTime / 60;
            
            score = (s.attempts * 10) + avgTimeMin + (s.solved ? 0 : 50);
          } else {
            // No stats yet, but we're in Phase 2? 
            // This case happens if ALL questions have stats but Phase 1 filter (solved: false) excluded them.
            // If it's not solved, it should have been caught in Phase 1 (unless it was in recent).
            score = 100; // High priority for new-ish but not 'recent'
          }
          return { question: q, score };
        });

        // Sort by score DESC
        ranked.sort((a, b) => b.score - a.score);
        question = ranked[0]?.question;
      }
    }

    if (question) {
      results.push(question);
    }
  }

  // Handle Edge Case: If fewer than 3 available, fill with any available (excluding recent)
  if (results.length < 3) {
    const existingIds = results.map(r => r._id.toString());
    const extra = await Question.find({
      _id: { $nin: [...recentQuestionIds, ...existingIds] },
      type: "Coding"
    }).limit(3 - results.length);
    results.push(...extra);
  }

  return results.slice(0, 3);
};
