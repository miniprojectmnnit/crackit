import React from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

const TextAnswer = ({ answer, onAnswerChange, onSubmit, isEvaluating, isListening, isSpeechSupported, onToggleListening }) => {
  return (
    <div className="p-6 flex-1 flex flex-col">
      <div className="relative flex-1 flex flex-col">
        <textarea
          className="w-full flex-1 bg-neutral-950 border border-neutral-800 rounded-md p-4 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
          placeholder={isListening ? "🎤 Listening... Speak your answer" : "Type your response or click the mic to speak..."}
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
        {isListening && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-red-900/80 rounded-full text-xs text-red-200 font-medium">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording...
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-3">
        {isSpeechSupported && (
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              isListening
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? (
              <>
                <MicOff size={16} />
                Stop Mic
              </>
            ) : (
              <>
                <Mic size={16} />
                Voice Input
              </>
            )}
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={isEvaluating || !answer.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          <Send size={16} /> Submit Answer
        </button>
      </div>
    </div>
  );
};

export default TextAnswer;
