import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Keyboard } from 'lucide-react';

const VoiceVisualizer = ({ isListening, volume }) => (
  <div className="flex items-center gap-[3px] h-10">
    {Array.from({ length: 12 }).map((_, i) => {
      const h = isListening ? Math.max(4, (volume / 100) * 36 * (0.5 + 0.5 * Math.sin(i * 0.8))) : 4;
      return (
        <div key={i} className={`w-[3px] rounded-full transition-all duration-75 ${isListening ? 'bg-emerald-400' : 'bg-neutral-700'}`}
          style={{ height: `${h}px` }} />
      );
    })}
  </div>
);

const UnifiedInput = ({ 
  answer, 
  onAnswerChange, 
  onSubmit, 
  isEvaluating, 
  isListening, 
  isSpeechSupported, 
  onToggleListening,
  volume = 0,
  isSpeaking = false,
  placeholder = "Type your response or click the mic to speak...",
}) => {
  const [inputMode, setInputMode] = useState(isListening ? 'voice' : 'text');
  const textareaRef = useRef(null);

  // Sync mode with listening state if changed externally (e.g. from an auto-start timer)
  useEffect(() => {
    if (isListening && inputMode !== 'voice') {
      setInputMode('voice');
    }
  }, [isListening, inputMode]);

  const handleToggleMode = () => {
    const newMode = inputMode === 'text' ? 'voice' : 'text';
    setInputMode(newMode);
    
    if (newMode === 'voice') {
      if (!isListening) onToggleListening();
    } else {
      if (isListening) onToggleListening();
      // Auto focus text area
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isEvaluating && answer.trim()) onSubmit();
    }
  };

  return (
    <div className="p-4 md:p-6 flex-1 flex flex-col w-full h-full max-h-full">
      {/* Input container */}
      <div className="relative flex-1 flex flex-col min-h-[120px] bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-inner focus-within:border-cyan-500/50 transition-colors">
        
        {/* Toggle Mode Hint / Visualizer */}
        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-4 pointer-events-none z-10">
          <div className="flex items-center gap-2">
            {inputMode === 'voice' && (
              <VoiceVisualizer isListening={isListening} volume={volume} />
            )}
          </div>
          
          <div className="flex gap-2">
            {isListening && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-900/80 rounded-full text-xs text-red-100 font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording...
              </div>
            )}
            {isSpeaking && !isListening && (
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/80 rounded-full text-xs text-cyan-100 font-medium">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                AI Speaking...
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className={`w-full h-full flex-1 bg-transparent p-4 pt-10 text-neutral-200 focus:outline-none resize-none z-0 ${inputMode === 'voice' && isListening ? 'opacity-80' : ''}`}
          placeholder={isListening ? "🎤 Listening... Speak your answer (auto-submits on silence)" : placeholder}
          value={answer}
          onChange={(e) => {
            if (inputMode === 'voice') {
               // Optional: If they start typing in voice mode, switch to text mode
               setInputMode('text');
               if (isListening) onToggleListening();
            }
            onAnswerChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        
        {/* Bottom fading gradient to look sleek */}
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-neutral-950 to-transparent pointer-events-none z-10" />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Input Mode Toggle */}
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1 w-full sm:w-auto">
          <button
            onClick={() => {
              if (inputMode !== 'text') handleToggleMode();
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === 'text' 
                ? 'bg-neutral-800 text-white shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Keyboard size={16} /> Text
          </button>
          
          {isSpeechSupported && (
            <button
              onClick={() => {
                if (inputMode !== 'voice') handleToggleMode();
                else {
                  onToggleListening(); // Allow toggling mic on/off while in voice mode
                }
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'voice' 
                  ? isListening 
                    ? 'bg-red-600/90 text-white shadow-md shadow-red-900/30' 
                    : 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />} 
              {isListening ? 'Stop' : 'Voice'}
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          disabled={isEvaluating || !answer.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
        >
          <Send size={16} /> Submit Answer
        </button>

      </div>
    </div>
  );
};

export default UnifiedInput;
