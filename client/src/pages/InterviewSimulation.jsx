import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import Editor from '@monaco-editor/react';
import { Play, Send, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import InterviewReport from '../components/InterviewReport';
const InterviewSimulation = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [code, setCode] = useState('// Write your solution here...');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);

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

  const currentQuestion = questions[currentIndex];

  // Text-To-Speech function
  const speakQuestion = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Set default code skeleton when question changes
  useEffect(() => {
    if (currentQuestion) {
      // 1. Speak the question aloud
      speakQuestion(currentQuestion.question_text);

      // 2. Setup Code Editor
      if (currentQuestion.type === 'Coding') {
        const name = currentQuestion.title ? currentQuestion.title.replace(/ /g, '') : 'solve';

        // Use provided test cases to infer params if available, otherwise just use empty args
        let args = '';
        if (currentQuestion.test_cases && currentQuestion.test_cases.length > 0) {
          // just illustrative 
          args = 'input';
        }

        const template = `/**
 * PROBLEM DESCRIPTION:
 * ${currentQuestion.description || currentQuestion.question_text}
 * 
 * NOTE: 
 * - Write all your logic inside the \`${name}\` function.
 * - Make sure to RETURN the final output.
 * - Language: JavaScript (Node.js)
 */

function ${name}(${args}) {
  // Write your code here...
  
}
`;
        setCode(template);
      } else {
        setCode('// Write your solution here...');
      }
    }
  }, [currentIndex, currentQuestion]);

  const handleNext = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFeedback(null);
      setExecResult(null);
      setAnswer('');
      setCode('// Write your solution here...');
    } else {
      setInterviewFinished(true);
    }
  };

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

  if (loading) return <div className="p-10 text-center text-white text-xl">Loading Interview...</div>;
  if (interviewFinished) return (
    <div className="bg-neutral-950 min-h-screen text-neutral-200">
      <InterviewReport sessionId={session?._id} />
    </div>
  );
  if (!currentQuestion) return <div className="p-10 text-center text-white">No questions found.</div>;

  const isCoding = currentQuestion.type === 'Coding';

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-200 w-full font-sans overflow-hidden">

      {/* HEADER */}
      <header className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900">
        <div>
          <h1 className="text-xl font-bold text-cyan-400">AI Interview Simulation</h1>
          <p className="text-sm text-neutral-400">Question {currentIndex + 1} of {questions.length} • {currentQuestion.type}</p>
        </div>
        <button onClick={handleNext} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors text-sm font-medium">
          {currentIndex === questions.length - 1 ? 'Finish Interview' : 'Skip / Next'}
        </button>
      </header>

      {/* DYNAMIC MAIN LAYOUT */}
      <div className={`flex-1 p-4 flex ${isCoding ? 'flex-row gap-4' : 'flex-col gap-6'} overflow-hidden`}>

        {/* MEDIA PIPELINE (AVATAR & WEBCAM) */}
        <div className={`flex flex-col gap-4 ${isCoding ? 'w-1/3 min-w-[300px]' : 'w-full max-w-4xl mx-auto h-full'}`}>

          {/* AI INTERVIEWER */}
          <div className="relative rounded-xl overflow-hidden bg-neutral-800 border-2 border-cyan-900/50 flex-1 flex flex-col shadow-2xl">
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs z-10 font-medium text-cyan-300">
              AI Interviewer
            </div>
            {/* Dummy Avatar Loop */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
              <div className="w-32 h-32 rounded-full border-4 border-cyan-500/30 flex items-center justify-center bg-neutral-950">
                <span className="text-4xl text-cyan-500">🤖</span>
              </div>
            </div>
          </div>

          {/* CANDIDATE WEBCAM */}
          <div className="relative rounded-xl overflow-hidden bg-neutral-800 flex-1 flex flex-col shadow-2xl">
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs z-10 font-medium text-emerald-400">
              You (Candidate)
            </div>
            <Webcam
              audio={true}
              mirrored={true}
              className="w-full h-full object-cover"
            />
          </div>

        </div>


        {/* INTERACTION AREA (CODE OR TEXT) */}
        <div className={`flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-2xl ${isCoding ? 'w-2/3 h-full' : 'w-full max-w-4xl mx-auto flex-1'}`}>

          {/* QUESTION PANEL */}
          <div className="p-6 border-b border-neutral-800 overflow-y-auto max-h-[40%]">
            <h2 className="text-xl font-semibold mb-2">{currentQuestion.question_text}</h2>
            {currentQuestion.description && (
              <p className="text-neutral-400 text-sm whitespace-pre-wrap">{currentQuestion.description}</p>
            )}
          </div>

          {/* INPUT PANEL */}
          <div className="flex-1 flex flex-col">
            {isCoding ? (
              <>
                <div className="flex-1 w-full bg-[#1e1e1e]">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val)}
                    options={{ minimap: { enabled: false }, fontSize: 14 }}
                  />
                </div>
                <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button onClick={runCode} disabled={isEvaluating} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                      <Play size={16} className="text-emerald-400" /> Run Code
                    </button>
                    <button onClick={submitAnswer} disabled={isEvaluating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                      <Send size={16} /> Submit
                    </button>
                  </div>
                  {execResult && (
                    <div className={`text-sm font-medium px-3 py-1 rounded ${execResult.failed === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {execResult.passed} / {execResult.total} Test Cases Passed
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 flex-1 flex flex-col">
                <textarea
                  className="w-full flex-1 bg-neutral-950 border border-neutral-800 rounded-md p-4 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
                  placeholder="Type your response or speak into your microphone..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                  <button onClick={submitAnswer} disabled={isEvaluating || !answer.trim()} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium transition-colors disabled:opacity-50">
                    <Send size={16} /> Submit Answer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FEEDBACK OVERLAY (IF ANY) */}
          {feedback && (
            <div className="p-4 bg-cyan-950/30 border-t border-cyan-900 text-cyan-100 flex gap-4 items-start">
              <Lightbulb className="text-cyan-400 shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-semibold text-cyan-300 mb-1">AI Feedback</h4>
                <p className="text-sm text-cyan-100/80 leading-relaxed">{feedback.feedback}</p>

                {feedback.follow_up_question && (
                  <div className="mt-2 p-3 bg-cyan-900/40 rounded border border-cyan-800/50">
                    <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider">Follow-Up Question:</span>
                    <p className="text-sm mt-1">{feedback.follow_up_question}</p>
                  </div>
                )}

                <div className="mt-3 flex gap-4 text-xs font-medium">
                  <span className="bg-black/40 px-2 py-1 rounded">Score: {feedback.correctness}/100</span>
                  <span className="bg-black/40 px-2 py-1 rounded">Clarity: {feedback.clarity}/100</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-auto shrink-0">
                {feedback.follow_up_question && (
                  <button onClick={() => { setFeedback(null); setAnswer(''); }} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-white font-medium transition-colors border border-neutral-700">
                    Answer Follow-Up
                  </button>
                )}
                <button onClick={handleNext} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm text-white font-medium transition-colors">
                  Next Question
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InterviewSimulation;
