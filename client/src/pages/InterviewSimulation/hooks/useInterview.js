import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { generateCodeTemplate } from '../utils/codeTemplate';

const DEFAULT_CODE = '// Write your solution here...';

/**
 * Speaks text aloud using the Web Speech API.
 */
const speakQuestion = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

/**
 * Custom hook encapsulating all interview simulation logic:
 * session creation, question fetching, answer submission, code execution,
 * text-to-speech, and navigation between questions.
 */
const useInterview = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const { user } = useAuth();

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
    try {
      // 1. Create Session
      const sessRes = await fetch('http://localhost:5000/api/interviews/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id || 'anonymous', source_url: url })
      });
      const sessData = await sessRes.json();
      setSession(sessData);

      // 2. Fetch Questions
      const objRes = await fetch(`http://localhost:5000/api/interviews/questions?url=${encodeURIComponent(url)}`);
      if (!objRes.ok) throw new Error("Failed to load questions");

      const populatedQuestions = await objRes.json();
      setQuestions(populatedQuestions);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // --- Setup code template & TTS when question changes ---
  useEffect(() => {
    if (currentQuestion) {
      speakQuestion(currentQuestion.question_text);

      if (currentQuestion.type === 'Coding') {
        setCode(generateCodeTemplate(currentQuestion));
      } else {
        setCode(DEFAULT_CODE);
      }
    }
  }, [currentIndex, currentQuestion]);

  // --- Navigation ---
  const handleNext = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFeedback(null);
      setExecResult(null);
      setAnswer('');
      setCode(DEFAULT_CODE);
    } else {
      setInterviewFinished(true);
    }
  };

  // --- Answer Submission ---
  const submitAnswer = async () => {
    if (!session || !currentQuestion) return;
    setIsEvaluating(true);
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/session/${session._id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: currentQuestion._id,
          answer: currentQuestion.type === 'Coding' ? code : answer
        })
      });
      const data = await res.json();
      setFeedback(data.evaluation);

      // Auto-speak the AI's feedback
      if (data.evaluation && data.evaluation.feedback) {
        let msg = data.evaluation.feedback;
        if (data.evaluation.follow_up_question) {
          msg += " " + data.evaluation.follow_up_question;
        }
        speakQuestion(msg);
      }
    } catch (err) {
      console.error(err);
    }
    setIsEvaluating(false);
  };

  // --- Code Execution ---
  const runCode = async () => {
    if (!session || !currentQuestion) return;
    setIsEvaluating(true);
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
    } catch (err) {
      console.error(err);
      setExecResult({ passed: 0, failed: 1, total: 1, log: "Execution failed to reach server." });
    }
    setIsEvaluating(false);
  };

  // --- Follow-up handler ---
  const handleAnswerFollowUp = () => {
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
