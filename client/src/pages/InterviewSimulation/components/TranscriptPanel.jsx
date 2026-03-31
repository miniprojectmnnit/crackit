import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

const TranscriptPanel = ({ transcript }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border border-neutral-800 rounded-xl overflow-hidden shadow-xl">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 backdrop-blur border-b border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-200">
          Interview Transcript
        </h3>
        <span className="text-[10px] text-neutral-500 font-mono">
          Live
        </span>
      </div>

      {/* Messages */}
      <div
        ref={panelRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700"
      >
        {(!transcript || transcript.length === 0) ? (
          <div className="flex flex-col items-center justify-center text-neutral-500 text-sm mt-20">
            <div className="opacity-60 mb-2">💬</div>
            No conversation yet
          </div>
        ) : (
          transcript.map((msg, index) => {
            const isAi = msg.role === 'ai';

            return (
              <div
                key={index}
                className={`flex items-end gap-2 ${isAi ? 'justify-start' : 'justify-end'
                  }`}
              >
                {/* Avatar */}
                {isAi && (
                  <div className="w-7 h-7 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                    <Bot size={14} />
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition ${isAi
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-bl-sm'
                      : 'bg-emerald-500 text-black font-medium rounded-br-sm'
                    }`}
                >
                  {msg.text}
                </div>

                {!isAi && (
                  <div className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <User size={14} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-4 py-2 text-xs text-neutral-500 border-t border-neutral-800 bg-neutral-950">
        Responses are evaluated in real-time
      </div>
    </div>
  );
};

export default TranscriptPanel;