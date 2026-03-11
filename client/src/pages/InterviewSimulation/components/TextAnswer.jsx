import React from 'react';
import { Send } from 'lucide-react';

const TextAnswer = ({ answer, onAnswerChange, onSubmit, isEvaluating }) => {
  return (
    <div className="p-6 flex-1 flex flex-col">
      <textarea
        className="w-full flex-1 bg-neutral-950 border border-neutral-800 rounded-md p-4 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
        placeholder="Type your response or speak into your microphone..."
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
      <div className="mt-4 flex justify-end">
        <button onClick={onSubmit} disabled={isEvaluating || !answer.trim()} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium transition-colors disabled:opacity-50">
          <Send size={16} /> Submit Answer
        </button>
      </div>
    </div>
  );
};

export default TextAnswer;
