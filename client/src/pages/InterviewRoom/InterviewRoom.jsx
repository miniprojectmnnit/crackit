import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useInterviewSocket from '../../hooks/useInterviewSocket';
import useGeminiVoice from '../InterviewSimulation/hooks/useGeminiVoice';
import useSpeechRecognition from '../InterviewSimulation/hooks/useSpeechRecognition';
import UnifiedInput from '../../components/UnifiedInput';

// ─── Animated AI Avatar ─────────────────────────────────────────────────────

const AIAvatar = ({ isSpeaking, connectionState }) => (
  <div className="relative flex items-center justify-center">
    {isSpeaking && (
      <>
        <div className="absolute w-40 h-40 rounded-full border border-cyan-400/20 animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute w-32 h-32 rounded-full border border-cyan-400/30 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
      </>
    )}
    <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking
      ? 'border-4 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)] bg-gradient-to-br from-cyan-900/80 to-slate-900'
      : 'border-2 border-cyan-800/50 bg-gradient-to-br from-slate-800 to-slate-900'
      }`}>
      <span className="text-5xl select-none">🤖</span>
      {isSpeaking && (
        <div className="absolute bottom-1 right-1 flex gap-[2px] items-end h-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-[3px] bg-cyan-400 rounded-full animate-pulse"
              style={{ height: `${6 + Math.sin(i) * 6}px`, animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }} />
          ))}
        </div>
      )}
    </div>
    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-slate-900 ${connectionState === 'connected' ? 'bg-emerald-400' :
      connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'
      }`} />
  </div>
);


// ─── Progress Bar ────────────────────────────────────────────────────────────

const ProgressBar = ({ current, total }) => {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-400 font-mono whitespace-nowrap">Q {current} / {total}</span>
      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500 font-mono">{Math.round(pct)}%</span>
    </div>
  );
};

// ─── Transcript Bubble ───────────────────────────────────────────────────────

const Bubble = ({ role, text, corrected }) => {
  const isAi = role === 'interviewer';
  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isAi
        ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
        : 'bg-emerald-900/50 border border-emerald-700/50 text-emerald-100 rounded-tr-sm'
        }`}>
        <span className={`text-[10px] font-semibold block mb-1 ${isAi ? 'text-cyan-400' : 'text-emerald-400'}`}>
          {isAi ? 'AI INTERVIEWER' : 'YOU'}
        </span>
        {text}
        {corrected && (
          <span className="block text-[10px] text-emerald-600/60 mt-1 italic">✓ STT corrected</span>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const InterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [transcript, setTranscript] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [phase, setPhase] = useState('connecting');
  const [pendingAnswer, setPendingAnswer] = useState('');
  const transcriptEndRef = useRef(null);
  const sendAnswerRef = useRef(null);
  const listeningRef = useRef(false);
  const wsRef = useRef(null); // reference to the sendAnswer + signalSpeechDone functions

  // Called when AI finishes a speech turn — signal the server
  const handleSpeechDone = useCallback(() => {
    wsRef.current?.signalSpeechDone?.();
  }, []);

  // Voice output — single Gemini voice with queue
  const { speak, stop, isSpeaking } = useGeminiVoice(handleSpeechDone);

  // Called when AI sends a message to speak
  const handleAiMessage = useCallback((text, msgPhase) => {
    setPhase(msgPhase || 'questioning');
    setTranscript(prev => [...prev, { role: 'interviewer', text }]);
    speak(text);
  }, [speak]);

  // Called when interview is done
  const handleInterviewComplete = useCallback((sid) => {
    stop();
    setTimeout(() => navigate(`/report/${sid}`), 3000);
  }, [navigate, stop]);

  // WebSocket connection
  const { connectionState, progress, sendAnswer, signalSpeechDone } = useInterviewSocket(
    sessionId,
    handleAiMessage,
    handleInterviewComplete
  );

  // Keep functions accessible via ref
  useEffect(() => {
    sendAnswerRef.current = sendAnswer;
    wsRef.current = { signalSpeechDone };
  }, [sendAnswer, signalSpeechDone]);

  // Speech recognition
  const handleTranscript = useCallback((text) => {
    setPendingAnswer(text);
  }, []);

  const { volume, startListening, stopListening, resetTranscript } = useSpeechRecognition(handleTranscript);

  // Auto-start mic ONLY when AI stops speaking and we're in an active interview phase
  useEffect(() => {
    const speakingPhases = ['questioning', 'followup'];
    if (!isSpeaking && connectionState === 'connected' && speakingPhases.includes(phase)) {
      const timer = setTimeout(() => {
        if (!listeningRef.current) {
          resetTranscript();
          setPendingAnswer('');
          startListening();
          listeningRef.current = true;
          setIsListening(true);
        }
      }, 600);
      return () => clearTimeout(timer);
    } else if (isSpeaking && listeningRef.current) {
      stopListening();
      listeningRef.current = false;
      setIsListening(false);
    }
  }, [isSpeaking, connectionState, phase]);

  // Auto-submit after 3s silence
  const silenceTimerRef = useRef(null);
  useEffect(() => {
    if (pendingAnswer && isListening) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (pendingAnswer.trim().length > 8 && listeningRef.current) {
          submitAnswer(pendingAnswer);
        }
      }, 3000);
    }
    return () => clearTimeout(silenceTimerRef.current);
  }, [pendingAnswer]);

  const submitAnswer = useCallback((text) => {
    if (!text.trim()) return;
    stopListening();
    listeningRef.current = false;
    setIsListening(false);

    // Show the raw text in transcript (server will correct and we update on answer_corrected event)
    setTranscript(prev => [...prev, { role: 'candidate', text, corrected: false }]);
    setPendingAnswer('');
    resetTranscript();

    sendAnswerRef.current?.(text);
  }, [stopListening, resetTranscript]);

  // Auto-scroll
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="min-h-screen bg-[#080a0f] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur px-6 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-sm font-bold">C</div>
          <span className="font-semibold tracking-tight">CrackIt Interview</span>
        </div>
        <div className="flex items-center gap-4">
          <ProgressBar current={progress.current} total={progress.total} />
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connectionState === 'connected' ? 'bg-emerald-500/10 text-emerald-400' :
            connectionState === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400' : connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
            {connectionState}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: AI Panel */}
        <div className="w-72 border-r border-white/5 flex flex-col items-center justify-center gap-8 p-8 flex-shrink-0 bg-gradient-to-b from-slate-900/50 to-transparent">
          <AIAvatar isSpeaking={isSpeaking} connectionState={connectionState} />
          <div className="text-center">
            <div className="text-sm font-medium text-slate-300">AI Interviewer</div>
            <div className="text-xs text-slate-500 mt-1">
              {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Processing...'}
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-medium border ${isSpeaking ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' :
            isListening ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' :
              'border-white/10 bg-white/5 text-slate-400'
            }`}>
            {isSpeaking ? '🔊 AI Speaking' : isListening ? '🎙️ Mic Active' : '⏳ Processing'}
          </div>
        </div>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ scrollBehavior: 'smooth' }}>
            {transcript.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-600">
                  <div className="text-4xl mb-4">🎙️</div>
                  <div className="text-sm">Connecting to interview session...</div>
                </div>
              </div>
            )}
            {transcript.map((msg, i) => (
              <Bubble key={i} role={msg.role} text={msg.text} corrected={msg.corrected} />
            ))}

            {/* Live interim transcript */}
            {pendingAnswer && isListening && (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm bg-emerald-950/40 border border-emerald-800/30 text-emerald-300/70 italic">
                  <span className="text-[10px] font-semibold block mb-1 text-emerald-500/60">YOU (speaking...)</span>
                  {pendingAnswer}
                  <span className="inline-block ml-1 w-1 h-3 bg-emerald-400 animate-pulse rounded-sm" />
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Bottom input area */}
          <div className="border-t border-white/5 bg-black/20 flex-shrink-0 min-h-[160px] max-h-[40vh] w-full flex">
            <UnifiedInput
              answer={pendingAnswer}
              onAnswerChange={setPendingAnswer}
              onSubmit={() => submitAnswer(pendingAnswer)}
              isEvaluating={false}
              isListening={isListening}
              isSpeechSupported={true}
              onToggleListening={(currentText = pendingAnswer) => {
                if (isListening) {
                  stopListening();
                  listeningRef.current = false;
                  setIsListening(false);
                } else {
                  startListening(currentText);
                  listeningRef.current = true;
                  setIsListening(true);
                }
              }}
              volume={volume}
              isSpeaking={isSpeaking}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
