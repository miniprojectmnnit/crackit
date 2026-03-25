import React, { useEffect, useRef } from 'react';

const TranscriptPanel = ({ transcript }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom on new message
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="bg-neutral-800 px-4 py-3 border-b border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-200">Interview Transcript</h3>
      </div>
      
      <div 
        ref={panelRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
      >
        {(!transcript || transcript.length === 0) ? (
          <div className="text-center text-neutral-500 text-sm mt-10">
            No conversation history yet.
          </div>
        ) : (
          transcript.map((msg, index) => {
            const isAi = msg.role === 'ai';
            return (
              <div 
                key={index}
                className={`flex flex-col max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  isAi ? 'self-start' : 'self-end'
                }`}
              >
                <span className={`text-[10px] mb-1 px-1 font-medium ${isAi ? 'text-cyan-500' : 'text-emerald-500 self-end'}`}>
                  {isAi ? 'AI INTERVIEWER' : 'YOU'}
                </span>
                <div 
                  className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    isAi 
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-tl-sm' 
                      : 'bg-emerald-900/40 border border-emerald-800/60 text-emerald-100 rounded-tr-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;
