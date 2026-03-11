import React from 'react';

const QuestionPanel = ({ question }) => {
  return (
    <div className="p-6 border-b border-neutral-800 overflow-y-auto max-h-[40%]">
      <h2 className="text-xl font-semibold mb-2">{question.question_text}</h2>
      {question.description && (
        <p className="text-neutral-400 text-sm whitespace-pre-wrap">{question.description}</p>
      )}
    </div>
  );
};

export default QuestionPanel;
