import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from "react-hot-toast";
import { generateCodeTemplate } from '../utils/codeTemplate';
import useGeminiVoice from './useGeminiVoice';
import useSpeechRecognition from './useSpeechRecognition';

const DEFAULT_CODE = '// Write your solution here...';

/**
 * Custom hook encapsulating all interview simulation logic:
 * session creation, question fetching, answer submission, code execution,
 * text-to-speech, speech-to-text, and navigation between questions.
 */
export const useInterview = (initialSessionId) => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const resumeId = searchParams.get('resumeId');
  const { speak, stop, isSpeaking, isConnected } = useGeminiVoice();

  // Core state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interaction state
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('JavaScript');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Refs for debouncing mic start and tracking answer
  const micTimerRef = useRef(null);
  const answerRef = useRef('');
  const lastSpokenQuestionRef = useRef(null);

  // Keep answerRef in sync with answer state
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // Speech recognition — transcribes voice into the answer field
  const handleTranscript = useCallback((text) => {
    console.log(`[INTERVIEW] 🎤 Transcript update (${text.length} chars)`);
    setAnswer(text);
  }, []);

  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    volume,
  } = useSpeechRecognition(handleTranscript);

  const currentQuestion = questions[currentIndex];

  // --- DEBOUNCED mic start: wait for isSpeaking to stay false for 1.2s ---
  useEffect(() => {
    // Clear any pending mic start timer
    if (micTimerRef.current) {
      clearTimeout(micTimerRef.current);
      micTimerRef.current = null;
    }

    if (isSpeaking) {
      // AI is speaking — STOP mic immediately to avoid recording AI's voice
      if (isListening) {
        console.log('[INTERVIEW] 🔇 Stopping mic — AI is speaking');
        stopListening();
      }
    } else {
      // AI stopped speaking — wait 1.2s before starting mic (debounce flickering)
      micTimerRef.current = setTimeout(() => {
        if (!isSpeaking && !isListening) {
          console.log('[INTERVIEW] 🎤 AI done speaking — auto-starting mic for your response');
          resetTranscript();
          startListening();
        }
      }, 1200);
    }

    return () => {
      if (micTimerRef.current) {
        clearTimeout(micTimerRef.current);
      }
    };
  }, [isSpeaking]);

  // --- Initialization ---
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    } else if (url || resumeId) {
      initInterview();
    }
  }, [url, resumeId, initialSessionId]);

  const initInterview = async () => {
    setLoading(true);
    console.log('[INTERVIEW] 🚀 Initializing interview for URL:', url);
    try {
      // 1. Create Session
      console.log('[INTERVIEW] 📋 Creating session...');
      const res = await fetch('http://localhost:5000/api/interviews/session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          source_url: url,
          resume_id: resumeId,
          question_count: 10,
          user_id: localStorage.getItem("user_id") || "mock_user_123"
        })
      });

      if (!res.ok) {
        toast.error("Failed to create session");
        setLoading(false);
        return;
      }
      const sessionResponse = await res.json();
      setSessionData(sessionResponse);
      console.log('[INTERVIEW] ✅ Session created — ID:', sessionResponse._id);

      // 2. Fetch Questions (Wait, if using resumeId, questions are returned in the session obj)
      // Actually, we need to adapt here: When using resume_id, createSession generates questions
      //, but the return doesn't return the populated questions directly, it returns the session.
      // So let's fetch session with populated questions from getSession to be sure.
      console.log('[INTERVIEW] 📋 Fetching session questions...');
      const objRes = await fetch(`http://localhost:5000/api/interviews/session/${sessionResponse._id}?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!objRes.ok) {
        toast.error("Failed to load questions");
        setLoading(false);
        return;
      }

      const sessionPopulated = await objRes.json();
      const populatedQuestions = sessionPopulated.questions.map(q => q.question_id || {
        _id: q._id,
        question_text: q.text,
        type: 'General'
      });
      
      setQuestions(populatedQuestions);
      console.log(`[INTERVIEW] ✅ Loaded ${populatedQuestions.length} questions`);
      populatedQuestions.forEach((q, i) => {
        console.log(`[INTERVIEW]   Q${i + 1}: [${q?.type}] ${q?.question_text?.substring(0, 60)}...`);
      });
    } catch (err) {
      console.error('[INTERVIEW] ❌ Init failed:', err);
      toast.error("Interview initialization failed.");
    }
    setLoading(false);
    console.log('[INTERVIEW] 🏁 Interview initialization complete');
  };

  const loadSession = async (sessionId) => {
    setLoading(true);
    console.log(`[INTERVIEW] 🚀 Loading existing session: ${sessionId}`);
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/session/${sessionId}?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        toast.error("Failed to load session info");
        setLoading(false);
        return;
      }
      const sessionPopulated = await res.json();
      setSessionData(sessionPopulated);
      const populatedQuestions = sessionPopulated.questions.map(q => q.question_id || {
        _id: q._id,
        question_text: q.text,
        type: 'General'
      });
      setQuestions(populatedQuestions);
      console.log(`[INTERVIEW] ✅ Loaded ${populatedQuestions.length} questions for session ${sessionId}`);
    } catch (err) {
      console.error('[INTERVIEW] ❌ Load session failed:', err);
      toast.error("Failed to load existing session.");
    }
    setLoading(false);
    console.log('[INTERVIEW] 🏁 Session loading complete');
  };

  // --- Setup code template & TTS when question changes ---
  useEffect(() => {
    if (currentQuestion) {
      if (lastSpokenQuestionRef.current !== currentQuestion._id) {
        lastSpokenQuestionRef.current = currentQuestion._id;
        
        console.log(`[INTERVIEW] 📝 Question ${currentIndex + 1}/${questions.length} — [${currentQuestion?.type}] "${currentQuestion?.question_text?.substring(0, 60)}..."`);

        // Stop any ongoing mic before AI speaks new question
        stopListening();
        resetTranscript();
        setAnswer('');

        setConversationHistory(prev => [...prev, { role: 'ai', text: currentQuestion.question_text }]);
        speak(currentQuestion?.question_text || "");

        if (currentQuestion.type === 'Coding') {
          console.log('[INTERVIEW] 💻 Generated code template for coding question');
          setCode(generateCodeTemplate(currentQuestion, language));
        } else {
          setCode(DEFAULT_CODE);
        }
      }
    }
  }, [currentIndex, currentQuestion]);

  // --- Internal submit function (used by handleNext too) ---
  const _submitAnswerInternal = async (answerContent, questionToEval) => {
    if (!sessionData || !questionToEval || !answerContent || !answerContent.trim()) return null;

    const answerType = questionToEval.type === 'Coding' ? 'code' : 'text';
    console.log(`[INTERVIEW] 📤 Submitting ${answerType} answer (${answerContent.length} chars)`);

    try {
      setConversationHistory(prev => [...prev, { role: 'user', text: answerContent }]);
      const res = await fetch(`http://localhost:5000/api/interviews/session/${sessionData._id}/evaluate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: questionToEval._id,
          answer: answerContent,
          user_id: localStorage.getItem("user_id") || "mock_user_123"
        })
      });
      const data = await res.json();
      console.log(`[INTERVIEW] ✅ Evaluation — correctness: ${data.evaluation?.correctness}, clarity: ${data.evaluation?.clarity}, problem_solving: ${data.evaluation?.problem_solving}`);
      return data;
    } catch (err) {
      console.error('[INTERVIEW] ❌ Submit failed:', err);
      toast.error("Answer submission failed.");
      return null;
    }
  };

  // --- Navigation (auto-submits if there's an answer) ---
  const handleNext = async () => {
    stop();
    stopListening();
    if (micTimerRef.current) {
      clearTimeout(micTimerRef.current);
      micTimerRef.current = null;
    }

    // Auto-submit the current answer before moving on
    const currentAnswer = currentQuestion?.type === 'Coding' ? code : answerRef.current;
    if (currentAnswer && currentAnswer.trim() && currentQuestion && !feedback) {
      console.log('[INTERVIEW] 📤 Auto-submitting answer before moving to next question...');
      setIsEvaluating(true);
      const data = await _submitAnswerInternal(currentAnswer, currentQuestion);
      if (data?.evaluation) {
        setFeedback(data.evaluation);
        // Don't auto-navigate — let user see feedback first
        setIsEvaluating(false);
        console.log('[INTERVIEW] ✅ Answer auto-submitted. Review feedback, then click Next again.');
        return;
      }
      setIsEvaluating(false);
    }

    resetTranscript();
    if (currentIndex < questions.length - 1) {
      console.log(`[INTERVIEW] ➡️ Moving to next question (${currentIndex + 1} → ${currentIndex + 2})`);
      setCurrentIndex(currentIndex + 1);
      setFeedback(null);
      setExecResult(null);
      setAnswer('');
      setCode(DEFAULT_CODE);
    } else {
      console.log('[INTERVIEW] 🏁 Interview finished — all questions completed');
      
      // Dispatch the report generation API call in the background!
      // The frontend will now navigate to InterviewReport.jsx and poll until this completes.
      if (sessionData && sessionData._id) {
        console.log('[INTERVIEW] 🚀 Sparking background report generation...');
        fetch(`http://localhost:5000/api/interviews/session/${sessionData._id}/report?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`)
          .catch(err => console.error('[INTERVIEW] ❌ Failed to dispatch report generation:', err));
      }

      setInterviewFinished(true);
    }
  };

  // --- Explicit Answer Submission ---
  const submitAnswer = async () => {
    if (!sessionData || !currentQuestion) return;
    stopListening();
    if (micTimerRef.current) {
      clearTimeout(micTimerRef.current);
      micTimerRef.current = null;
    }
    setIsEvaluating(true);

    const answerContent = currentQuestion.type === 'Coding' ? code : answer;
    const data = await _submitAnswerInternal(answerContent, currentQuestion);

    if (data?.evaluation) {
      setFeedback(data.evaluation);

      // Auto-speak the AI's feedback
      if (data.evaluation.feedback) {
        let msg = data.evaluation.feedback;
        if (data.evaluation.follow_up_question) {
          msg += " " + data.evaluation.follow_up_question;
          console.log(`[INTERVIEW] 🔄 Follow-up: "${data.evaluation.follow_up_question.substring(0, 60)}..."`);
        }
        setConversationHistory(prev => [...prev, { role: 'ai', text: msg }]);
        speak(msg);
      }
    }
    setIsEvaluating(false);
  };

  // --- Code Execution ---
  const runCode = async () => {
    if (!sessionData || !currentQuestion) return;
    setIsEvaluating(true);
    console.log(`[INTERVIEW] 🏃 Running code (${code.length} chars) for question ${currentIndex + 1}`);
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/session/${sessionData._id}/execute`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: currentQuestion._id,
          code,
          language,
          user_id: localStorage.getItem("user_id") || "mock_user_123"
        })
      });

      if (!res.ok) {
        throw new Error("Failed to execute code");
      }
      const data = await res.json();
      setExecResult(data);
      console.log(`[INTERVIEW] ✅ Code execution — passed: ${data.passed}, failed: ${data.failed}${data.error ? ', error: ' + data.error : ''}`);
    } catch (err) {
      console.error('[INTERVIEW] ❌ Code execution failed:', err);
      toast.error("Code execution failed.");
      setExecResult({ passed: 0, failed: 1, total: 1, log: "Execution failed to reach server." });
    }
    setIsEvaluating(false);
  };

  // --- Follow-up handler ---
  const handleAnswerFollowUp = () => {
    console.log('[INTERVIEW] 🔄 Answering follow-up question');
    resetTranscript();
    setFeedback(null);
    setAnswer('');
  };

  return {
    // State
    loading,
    interviewFinished,
    currentQuestion,
    currentIndex,
    questions,
    session: sessionData,
    code,
    language,
    answer,
    feedback,
    execResult,
    isEvaluating,
    conversationHistory,

    // Voice input
    isListening,
    isSpeechSupported,
    toggleListening: (text = answer) => toggleListening(text),
    volume,
    isSpeaking,

    // Setters
    setCode,
    setLanguage,
    setAnswer,

    // Actions
    handleNext,
    submitAnswer,
    runCode,
    handleAnswerFollowUp,
  };
};

export default useInterview;
