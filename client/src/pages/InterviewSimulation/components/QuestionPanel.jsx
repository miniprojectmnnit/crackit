import React from 'react';

const QuestionPanel = ({ question }) => {
  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
        <h2 className="text-lg font-semibold text-white leading-snug">
          {question.question_text}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Description */}
        {question.description && (
          <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {question.description}
          </div>
        )}

        {/* Optional Sections (future-ready) */}
        {question.examples && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Test Cases
            </h3>

            {question.examples.map((ex, i) => (
              <div
                key={i}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 font-mono text-sm"
              >
                <div className="text-neutral-400">
                  Input: <span className="text-neutral-200">{ex.input}</span>
                </div>
                <div className="text-neutral-400">
                  Output: <span className="text-emerald-400">{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div className="text-neutral-500 mt-1">
                    {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {question.constraints && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Constraints
            </h3>
            <ul className="list-disc list-inside text-sm text-neutral-400 space-y-1">
              {question.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPanel;