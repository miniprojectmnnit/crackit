import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { generateCodeTemplate } from '../utils/codeTemplate';
import useGeminiVoice from './useGeminiVoice';

const DEFAULT_CODE = '// Write your solution here...';

/**
 * Custom hook encapsulating all interview simulation logic:
 * session creation, question fetching, answer submission, code execution,
 * text-to-speech, and navigation between questions.
 */
const useInterview = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const { user } = useAuth();
  const { speak, stop, isSpeaking, isConnected } = useGeminiVoice();

  // Core state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interaction state
  const [code, setCode] = useState(DEFAULT_CODE);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  // --- Initialization ---
  useEffect(() => {
    if (url) {
      initInterview();
    }
  }, [url]);

  const initInterview = async () => {
    setLoading(true);
    console.log('[INTERVIEW] 🚀 Initializing interview for URL:', url);
    try {
      // 1. Create Session
      console.log('[INTERVIEW] 📋 Creating session...');
      const sessRes = await fetch('http://localhost:5000/api/interviews/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id || 'anonymous', source_url: url })
      });
      const sessData = await sessRes.json();
      setSession(sessData);
      console.log('[INTERVIEW] ✅ Session created — ID:', sessData._id);

      // 2. Fetch Questions
      console.log('[INTERVIEW] 📋 Fetching questions...');
      const objRes = await fetch(`http://localhost:5000/api/interviews/questions?url=${encodeURIComponent(url)}`);
      if (!objRes.ok) throw new Error("Failed to load questions");

      const populatedQuestions = await objRes.json();
      setQuestions(populatedQuestions);
      console.log(`[INTERVIEW] ✅ Loaded ${populatedQuestions.length} questions`);
      populatedQuestions.forEach((q, i) => {
        console.log(`[INTERVIEW]   Q${i + 1}: [${q.type}] ${q.question_text.substring(0, 60)}...`);
      });
    } catch (err) {
      console.error('[INTERVIEW] ❌ Init failed:', err);
    }
    setLoading(false);
    console.log('[INTERVIEW] 🏁 Interview initialization complete');
  };

  // --- Setup code template & TTS when question changes ---
  useEffect(() => {
    if (currentQuestion) {
      console.log(`[INTERVIEW] 📝 Question ${currentIndex + 1}/${questions.length} — [${currentQuestion.type}] "${currentQuestion.question_text.substring(0, 60)}..."`);
      speak(currentQuestion.question_text);

      if (currentQuestion.type === 'Coding') {
        console.log('[INTERVIEW] 💻 Generated code template for coding question');
        setCode(generateCodeTemplate(currentQuestion));
      } else {
        setCode(DEFAULT_CODE);
      }
    }
  }, [currentIndex, currentQuestion]);

  // --- Navigation ---
  const handleNext = () => {
    stop();
    if (currentIndex < questions.length - 1) {
      console.log(`[INTERVIEW] ➡️ Moving to next question (${currentIndex + 1} → ${currentIndex + 2})`);
      setCurrentIndex(currentIndex + 1);
      setFeedback(null);
      setExecResult(null);
      setAnswer('');
      setCode(DEFAULT_CODE);
    } else {
      console.log('[INTERVIEW] 🏁 Interview finished — all questions completed');
      setInterviewFinished(true);
    }
  };

  // --- Answer Submission ---
  const submitAnswer = async () => {
    if (!session || !currentQuestion) return;
    setIsEvaluating(true);
    const answerType = currentQuestion.type === 'Coding' ? 'code' : 'text';
    const answerContent = currentQuestion.type === 'Coding' ? code : answer;
    console.log(`[INTERVIEW] 📤 Submitting ${answerType} answer (${answerContent.length} chars) for question ${currentIndex + 1}`);
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/session/${session._id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: currentQuestion._id,
          answer: answerContent
        })
      });
      const data = await res.json();
      setFeedback(data.evaluation);
      console.log(`[INTERVIEW] ✅ Evaluation received — correctness: ${data.evaluation?.correctness}, clarity: ${data.evaluation?.clarity}, problem_solving: ${data.evaluation?.problem_solving}`);

      // Auto-speak the AI's feedback
      if (data.evaluation && data.evaluation.feedback) {
        let msg = data.evaluation.feedback;
        if (data.evaluation.follow_up_question) {
          msg += " " + data.evaluation.follow_up_question;
          console.log(`[INTERVIEW] 🔄 Follow-up question received: "${data.evaluation.follow_up_question.substring(0, 60)}..."`);
        }
        speak(msg);
      }
    } catch (err) {
      console.error('[INTERVIEW] ❌ Answer submission failed:', err);
    }
    setIsEvaluating(false);
  };

  // --- Code Execution ---
  const runCode = async () => {
    if (!session || !currentQuestion) return;
    setIsEvaluating(true);
    console.log(`[INTERVIEW] 🏃 Running code (${code.length} chars) for question ${currentIndex + 1}`);
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/session/${session._id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: currentQuestion._id,
          code
        })
      });
      const data = await res.json();
      setExecResult(data);
      console.log(`[INTERVIEW] ✅ Code execution result — passed: ${data.passed}, failed: ${data.failed}${data.error ? ', error: ' + data.error : ''}`);
    } catch (err) {
      console.error('[INTERVIEW] ❌ Code execution failed:', err);
      setExecResult({ passed: 0, failed: 1, total: 1, log: "Execution failed to reach server." });
    }
    setIsEvaluating(false);
  };

  // --- Follow-up handler ---
  const handleAnswerFollowUp = () => {
    console.log('[INTERVIEW] 🔄 Answering follow-up question');
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
    session,
    code,
    answer,
    feedback,
    execResult,
    isEvaluating,

    // Setters
    setCode,
    setAnswer,

    // Actions
    handleNext,
    submitAnswer,
    runCode,
    handleAnswerFollowUp,
  };
};

export default useInterview;
