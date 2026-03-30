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
    // Left empty since textarea is removed
  };

  return (
    <div className="p-4 md:p-6 flex-1 flex flex-col w-full h-full max-h-full items-center justify-center">
      {/* Input container */}
      <div className="relative w-full max-w-lg min-h-[120px] bg-neutral-950/50 border border-neutral-800 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-6">
        
        {/* Voice Visualizer and status */}
        <div className="flex flex-col items-center gap-4 z-10">
           <VoiceVisualizer isListening={isListening} volume={volume} />
           
           {isListening && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-900/80 rounded-full text-xs text-red-100 font-medium animate-pulse">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Listening... Speak your answer
              </div>
            )}
            {isSpeaking && !isListening && (
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/80 rounded-full text-xs text-cyan-100 font-medium animate-pulse">
                <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                AI Speaking...
              </div>
            )}
            {!isListening && !isSpeaking && (
               <div className="text-neutral-500 text-sm italic">
                  Waiting...
               </div>
            )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex justify-center w-full">
          
        {isSpeechSupported && (
            <button
              onClick={() => {
                  onToggleListening();
              }}
              className={`flex items-center justify-center gap-3 px-8 py-3 rounded-full font-semibold transition-all ${
                  isListening 
                    ? 'bg-red-600/90 text-white shadow-lg shadow-red-900/40 hover:bg-red-500' 
                    : 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500'
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />} 
              {isListening ? 'Stop Mic' : 'Start Mic'}
            </button>
        )}

      </div>
    </div>
  );
};

export default UnifiedInput;
