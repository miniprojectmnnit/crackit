import React from 'react';
import { Lightbulb } from 'lucide-react';

const FeedbackOverlay = ({ feedback, onAnswerFollowUp, onNext }) => {
  if (!feedback) return null;

  return (
    <div className="p-4 bg-cyan-950/30 border-t border-cyan-900 text-cyan-100 flex gap-4 items-start">
      <Lightbulb className="text-cyan-400 shrink-0 mt-1" size={20} />
      <div className="flex-1">
        <h4 className="font-semibold text-cyan-300 mb-1">AI Feedback</h4>
        <p className="text-sm text-cyan-100/80 leading-relaxed">{feedback.feedback}</p>

        {feedback.follow_up_question && (
          <div className="mt-2 p-3 bg-cyan-900/40 rounded border border-cyan-800/50">
            <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider">Follow-Up Question:</span>
            <p className="text-sm mt-1">{feedback.follow_up_question}</p>
          </div>
        )}

        <div className="mt-3 flex gap-4 text-xs font-medium">
          <span className="bg-black/40 px-2 py-1 rounded">Score: {feedback.correctness}/100</span>
          <span className="bg-black/40 px-2 py-1 rounded">Clarity: {feedback.clarity}/100</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 ml-auto shrink-0">
        {feedback.follow_up_question && (
          <button onClick={onAnswerFollowUp} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-white font-medium transition-colors border border-neutral-700">
            Answer Follow-Up
          </button>
        )}
        <button onClick={onNext} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm text-white font-medium transition-colors">
          Next Question
        </button>
      </div>
    </div>
  );
};

export default FeedbackOverlay;
