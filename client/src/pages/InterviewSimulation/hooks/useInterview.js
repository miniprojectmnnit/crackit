import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from "react-hot-toast";
import { generateCodeTemplate } from '../../../lib/codeTemplate';
import useGeminiVoice from './useGeminiVoice';
import useSpeechRecognition from './useSpeechRecognition';
import { useAuthFetch } from '../../../auth/useAuthFetch';
import { API_BASE_URL } from '../../../config';

const DEFAULT_CODE = '// Write your solution here...';

/**
 * Custom hook encapsulating all interview simulation logic:
 * session creation, question fetching, answer submission, code execution,
 * text-to-speech, speech-to-text, and navigation between questions.
 */
export const useInterview = (initialSessionId) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const resumeId = searchParams.get('resumeId');
  const { speak, stop, isSpeaking, isConnected } = useGeminiVoice();
  const authFetch = useAuthFetch();

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
  //Its main job is to prevent a very annoying feedback loop: it makes sure the app doesn't record the AI's own voice as the user's answer.
  useEffect(() => {
    //Every time the AI starts or stops speaking, we cancel any existing timers. This prevents "Ghost" timers from turning the mic on at the wrong time.
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
      //Why the wait? Sometimes the AI takes a tiny breath between sentences, or there’s a bit of echo in the room. This 1.2s "buffer" ensures the room is actually quiet before we start recording the user.
    }

    return () => {
      if (micTimerRef.current) {
        clearTimeout(micTimerRef.current);
      }
    };
  }, [isSpeaking]);

  // --- Initialization ---
  //ts job is to decide whether it needs to create a brand-new interview or resume an existing one the moment the page loads.
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
      const res = await authFetch(`${API_BASE_URL}/api/interviews/session`, {
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

      // --- REDIRECT TO PREMIUM UI ---
      // If we are starting from a URL (extension) or it's a DSA round, 
      // swap to the modern WebSocket-powered InterviewRoom immediately.
      if (url || sessionResponse.round_type === 'dsa') {
        console.log('[INTERVIEW] 🚀 Redirecting to Premium Interview Room...');
        navigate(`/interview-room/${sessionResponse._id}`);
        return;
      }

      // 2. Fetch Questions (Wait, if using resumeId, questions are returned in the session obj)
      // Actually, we need to adapt here: When using resume_id, createSession generates questions
      //, but the return doesn't return the populated questions directly, it returns the session.
      // So let's fetch session with populated questions from getSession to be sure.

      //QUESTION- why returned session why not fetched question directly?
      //ANSWER-because when u created session it might not fully extracted the ques becuse it is very heavy task and without it ai may take long time to load but with this it create sessions and then later we can fetch questions
      console.log('[INTERVIEW] 📋 Fetching session questions...');
      const objRes = await authFetch(`${API_BASE_URL}/api/interviews/session/${sessionResponse._id}?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!objRes.ok) {
        toast.error("Failed to load questions");
        setLoading(false);
        return;
      }
      //this is done to get the populated questions
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

  //it is designed to pull an existing interview out of the database so a user can continue exactly where they left off.
  const loadSession = async (sessionId) => {
    setLoading(true);
    console.log(`[INTERVIEW] 🚀 Loading existing session: ${sessionId}`);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/interviews/session/${sessionId}?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`, {
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

  //It watches for the exact moment the question changes and prepares everything—the audio, the text state, and the code editor—so the user has a seamless transition to the next task.
  useEffect(() => {
    if (currentQuestion) {
      if (lastSpokenQuestionRef.current !== currentQuestion._id) {
        lastSpokenQuestionRef.current = currentQuestion._id;

        console.log(`[INTERVIEW] 📝 Question ${currentIndex + 1}/${questions.length} — [${currentQuestion?.type}] "${currentQuestion?.question_text?.substring(0, 60)}..."`);

        // Stop any ongoing mic before AI speaks new question
        stopListening();
        resetTranscript();
        setAnswer('');
        //Adds the AI's question to the chat log so the user can read it if they didn't hear it clearly.
        setConversationHistory(prev => [...prev, { role: 'ai', text: currentQuestion.question_text }]);
        //Triggers the Text-to-Speech (TTS) engine. The AI physically "asks" the question out loud.
        speak(currentQuestion?.question_text || "");
        //Checks if the question is a Coding challenge.
        if (currentQuestion.type === 'Coding') {
          console.log('[INTERVIEW] 💻 Setup code state for new coding question');
          const qId = currentQuestion._id || currentQuestion.question_id;
          const storageKey = `crackit_code_${sessionData?._id}_${sessionData?.round_type || 'general'}_${qId}_${language}`;
          const savedCode = localStorage.getItem(storageKey);
          if (savedCode) {
            setCode(savedCode);
          } else {
            setCode(generateCodeTemplate(currentQuestion, language));
          }
        } else {
          setCode(DEFAULT_CODE);
        }
      }
    }
  }, [currentIndex, currentQuestion, sessionData, language]); // added language and sessionData for safety

  // Local Storage Recovery for Language Changes
  const lastLanguageRef = useRef(language);

  //Its specific job is to handle what happens when a user changes the programming language (e.g., switching from JavaScript to Python) while working on a coding question.
  //Without this, if you switched languages, you might see JavaScript code being highlighted as if it were Python, or worse, you'd lose all the work you just did in the previous language.
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'Coding') {
      const qId = currentQuestion._id || currentQuestion.question_id;
      const isNewLanguage = language !== lastLanguageRef.current;

      if (isNewLanguage) {
        const storageKey = `crackit_code_${sessionData?._id}_${sessionData?.round_type || 'general'}_${qId}_${language}`;
        const savedCode = localStorage.getItem(storageKey);

        if (savedCode) {
          setCode(savedCode);
        } else {
          setCode(generateCodeTemplate(currentQuestion, language));
        }
        lastLanguageRef.current = language;
      }
    }
  }, [language, currentQuestion, sessionData]);

  // Save code to local storage when code changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'Coding' && code && sessionData?._id) {
      const qId = currentQuestion._id || currentQuestion.question_id;
      const storageKey = `crackit_code_${sessionData._id}_${sessionData?.round_type || 'general'}_${qId}_${language}`;
      localStorage.setItem(storageKey, code);
    }
  }, [code, currentQuestion, language, sessionData]);

  // --- Internal submit function (used by handleNext too) ---
  //It is responsible for taking whatever the user just provided—be it a spoken answer or a block of code—and sending it to the backend to be graded by the AI.
  const _submitAnswerInternal = async (answerContent, questionToEval) => {
    if (!sessionData || !questionToEval || !answerContent || !answerContent.trim()) return null;

    const answerType = questionToEval.type === 'Coding' ? 'code' : 'text';
    console.log(`[INTERVIEW] 📤 Submitting ${answerType} answer (${answerContent.length} chars)`);

    try {
      setConversationHistory(prev => [...prev, { role: 'user', text: answerContent }]);
      const res = await authFetch(`${API_BASE_URL}/api/interviews/session/${sessionData._id}/evaluate`, {
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
  //It handles the logic for when a user clicks the "Next" button. It isn't just a simple page-turner; it acts as a safety net to ensure no answer is lost and handles the transition from the "Interview" phase to the "Reporting" phase.
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
        authFetch(`${API_BASE_URL}/api/interviews/session/${sessionData._id}/report?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`)
          .catch(err => console.error('[INTERVIEW] ❌ Failed to dispatch report generation:', err));
      }

      setInterviewFinished(true);
    }
  };

  // --- Explicit Answer Submission ---
  //This function is what handles the active dialogue between the user and the AI mentor during a single question.
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
  //asks the AI to judge your code, runCode asks the server to actually compile and execute it against real test cases.
  const runCode = async () => {
    if (!sessionData || !currentQuestion) return;
    setIsEvaluating(true);
    console.log(`[INTERVIEW] 🏃 Running code (${code.length} chars) for question ${currentIndex + 1}`);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/interviews/session/${sessionData._id}/execute`, {
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
