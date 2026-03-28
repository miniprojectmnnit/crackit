import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useInterviewSocket from '../../hooks/useInterviewSocket';
import useGeminiVoice from '../InterviewSimulation/hooks/useGeminiVoice';
import useSpeechRecognition from '../InterviewSimulation/hooks/useSpeechRecognition';
import UnifiedInput from '../../components/UnifiedInput';
import CodeEditor from '../InterviewSimulation/components/CodeEditor';
import QuestionPanel from '../InterviewSimulation/components/QuestionPanel';
import { generateCodeTemplate } from '../InterviewSimulation/utils/codeTemplate';

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
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className={`max-w-[85%] sm:max-w-[80%] px-5 py-3.5 rounded-3xl text-[14px] leading-relaxed shadow-sm backdrop-blur-sm transition-all ${isAi
        ? 'bg-[#1e2330]/90 border border-[#2a3040] text-slate-200 rounded-tl-sm'
        : 'bg-emerald-900/40 border border-emerald-800/50 text-emerald-100 rounded-tr-sm'
        }`}>
        <div className="flex items-center gap-2 mb-1.5">
           <span className={`text-[10px] font-bold uppercase tracking-wider ${isAi ? 'text-cyan-500/80' : 'text-emerald-500/80'}`}>
             {isAi ? 'AI Interviewer' : 'You'}
           </span>
        </div>
        <div className="whitespace-pre-wrap">{text}</div>
        {corrected && (
          <span className="block text-[10px] text-emerald-500/50 mt-2 italic font-medium flex items-center gap-1">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
             Verified Transcript
          </span>
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
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  
  // ── Code Editor State ──
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [code, setCode] = useState('// Write your solution here...');
  const [language, setLanguage] = useState('JavaScript');
  const [execResult, setExecResult] = useState(null);
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  
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
  const handleAiMessage = useCallback((text, msgPhase, questionObj) => {
    setPhase(msgPhase || 'questioning');
    setTranscript(prev => [...prev, { role: 'interviewer', text }]);
    speak(text);
    if (questionObj) {
      setCurrentQuestion(questionObj);
    }
  }, [speak]);

  // Code Template Autopopulation
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'Coding' && code === '// Write your solution here...') {
      setCode(generateCodeTemplate(currentQuestion, language));
    }
  }, [currentQuestion, language]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!text || !text.trim()) return;
    stopListening();
    listeningRef.current = false;
    setIsListening(false);

    // Show the raw text in transcript (server will correct and we update on answer_corrected event)
    setTranscript(prev => [...prev, { role: 'candidate', text, corrected: false }]);
    setPendingAnswer('');
    resetTranscript();

    sendAnswerRef.current?.(text);
  }, [stopListening, resetTranscript]);

  // Handle Code Execution to backend compiler container structure
  const runCode = async () => {
    if (!sessionId || !currentQuestion) return;
    setIsEvaluatingCode(true);
    setExecResult(null);
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/session/${sessionId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: currentQuestion._id || currentQuestion.question_id,
          code,
          language,
          user_id: localStorage.getItem("user_id") || "mock_user_123"
        })
      });

      if (!res.ok) throw new Error("Failed to execute code");
      const data = await res.json();
      setExecResult(data);
    } catch (err) {
      console.error('[INTERVIEW] ❌ Code execution failed:', err);
      setExecResult({ passed: 0, failed: 1, total: 1, log: "Execution failed to reach server." });
    }
    setIsEvaluatingCode(false);
  };

  // Auto-scroll
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const isCodingArea = currentQuestion?.type === 'Coding';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#121212]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10 flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-emerald-500/20">C</div>
          <span className="font-semibold text-slate-200 tracking-tight">CrackIt Interview</span>
        </div>
        
        <div className="flex-1 flex justify-center">
            <ProgressBar current={progress.current} total={progress.total} />
        </div>

        <div className="flex items-center gap-4 w-1/3 justify-end">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium ${connectionState === 'connected' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
            connectionState === 'connecting' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400' : connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="capitalize">{connectionState}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      {isCodingArea ? (
        // ─── CODING ROUND (LEETCODE UI) ────────────────────────────────────────────────────────────
        <div className="flex flex-1 overflow-hidden p-2 gap-2 bg-[#000000]">
          
          {/* Left: Question Panel */}
          <div className="w-1/2 flex flex-col bg-[#1e1e1e] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               <QuestionPanel question={currentQuestion} />
            </div>
          </div>

          {/* Right: Code Editor */}
          <div className="w-1/2 flex flex-col bg-[#1e1e1e] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
             <CodeEditor
               code={code}
               language={language}
               onLanguageChange={(newLang) => setLanguage(newLang)}
               onCodeChange={setCode}
               onRunCode={runCode}
               onSubmit={() => submitAnswer(code)}
               isEvaluating={isEvaluatingCode}
               execResult={execResult}
             />
          </div>

          {/* Floating AI Chat Window */}
          <div className={`absolute bottom-6 right-6 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] drop-shadow-2xl ${isChatMinimized ? 'w-72 h-14' : 'w-[420px] h-[600px] max-h-[85vh]'}`}>
             <div className="w-full h-full flex flex-col bg-[#0f111a]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
                
                {/* Chat Header */}
                <div 
                   className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 cursor-pointer hover:bg-slate-800 transition-colors group"
                   onClick={() => setIsChatMinimized(!isChatMinimized)}
                >
                   <div className="flex items-center gap-3 pl-1">
                       <div className="relative">
                           <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
                           <div className={`absolute inset-0 w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                       </div>
                       <div className="text-sm font-semibold tracking-wide text-slate-200 flex items-center gap-2">
                           Interview Assistant
                           {isSpeaking && <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded-full border border-cyan-400/20">Speaking...</span>}
                       </div>
                   </div>
                   <button className="text-slate-400 group-hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10">
                      {isChatMinimized ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      )}
                   </button>
                </div>

                {!isChatMinimized && (
                   <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                         {transcript.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700">🎙️</div>
                                <div className="text-xs">Waiting for conversation...</div>
                            </div>
                         )}
                         {transcript.map((msg, i) => (
                           <Bubble key={i} role={msg.role} text={msg.text} corrected={msg.corrected} />
                         ))}

                         {/* Live interim transcript */}
                         {pendingAnswer && isListening && (
                           <div className="flex justify-end animate-fade-in-up">
                             <div className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-tr-sm text-xs bg-emerald-950/40 border border-emerald-800/30 text-emerald-300/80 italic shadow-sm">
                               <span className="text-[9px] font-semibold block mb-1 text-emerald-500/60 uppercase tracking-wider">You</span>
                               {pendingAnswer}
                               <span className="inline-block ml-1 w-1 h-2.5 bg-emerald-400 animate-pulse rounded-sm align-middle" />
                             </div>
                           </div>
                         )}
                         <div ref={transcriptEndRef} />
                      </div>
                      
                      {/* Floating Input Area */}
                      <div className="shrink-0 bg-black/60 border-t border-white/10 p-2 min-h-[120px]">
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
                )}
             </div>
          </div>

        </div>
      ) : (
        // ─── STANDARD ROUND (GENERIC UI) ────────────────────────────────────────────────────────
        <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#14151a]">
          
          {/* Left: AI Context Panel */}
          <div className="w-[320px] border-r border-white/5 flex flex-col items-center justify-center gap-10 p-8 flex-shrink-0 bg-black/20 backdrop-blur-md shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)] z-10 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/5 to-transparent pointer-events-none" />
            <AIAvatar isSpeaking={isSpeaking} connectionState={connectionState} />
            <div className="text-center z-10">
              <div className="text-base font-semibold text-slate-200 tracking-wide">AI Interviewer</div>
              <div className="text-sm text-slate-500 mt-1.5 font-medium">
                {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Processing...'}
              </div>
            </div>
            
            {/* Status Pill */}
            <div className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide border shadow-lg z-10 transition-all duration-300 ${isSpeaking ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-cyan-900/20' :
              isListening ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-emerald-900/20' :
                'border-white/10 bg-white/5 text-slate-400'
              }`}>
              <div className="flex items-center gap-2">
                 {isSpeaking ? (
                    <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span> AI Speaking</>
                 ) : isListening ? (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> Mic Active</>
                 ) : (
                    <><span className="animate-spin w-3 h-3 border-2 border-slate-400/20 border-t-slate-400 rounded-full" /> Processing</>
                 )}
              </div>
            </div>
          </div>

          {/* Center: Chat Window */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-900/10 to-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 z-10 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
              {transcript.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-slate-500 bg-white/5 px-8 py-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="text-4xl mb-4 opacity-80">🎙️</div>
                    <div className="text-sm font-medium">Session initialized. Awaiting interviewer...</div>
                  </div>
                </div>
              )}
              {transcript.map((msg, i) => (
                <Bubble key={i} role={msg.role} text={msg.text} corrected={msg.corrected} />
              ))}

              {/* Live interim transcript */}
              {pendingAnswer && isListening && (
                <div className="flex justify-end animate-fade-in-up">
                  <div className="max-w-[70%] px-5 py-4 rounded-3xl rounded-tr-sm text-sm bg-emerald-950/40 border border-emerald-800/30 text-emerald-300/80 italic shadow-sm backdrop-blur-sm">
                    <span className="text-[10px] font-bold block mb-1.5 text-emerald-500/60 uppercase tracking-widest">You</span>
                    {pendingAnswer}
                    <span className="inline-block ml-1.5 w-1.5 h-3.5 bg-emerald-400 animate-pulse rounded-sm align-middle" />
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="border-t border-white/5 bg-[#0f111a]/80 backdrop-blur-xl flex-shrink-0 min-h-[160px] max-h-[40vh] w-full flex z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
              <div className="w-full max-w-5xl mx-auto flex items-stretch">
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
      )}
    </div>
  );
};

export default InterviewRoom;
