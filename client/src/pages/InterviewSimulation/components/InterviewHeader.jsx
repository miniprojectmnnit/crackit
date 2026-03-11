import React from 'react';

const InterviewHeader = ({ currentIndex, totalQuestions, questionType, onNext, isLast }) => {
  return (
    <header className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900">
      <div>
        <h1 className="text-xl font-bold text-cyan-400">AI Interview Simulation</h1>
        <p className="text-sm text-neutral-400">Question {currentIndex + 1} of {totalQuestions} • {questionType}</p>
      </div>
      <button onClick={onNext} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors text-sm font-medium">
        {isLast ? 'Finish Interview' : 'Skip / Next'}
      </button>
    </header>
  );
};

export default InterviewHeader;
