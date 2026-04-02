import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Target, Brain, Code } from 'lucide-react';
import { API_BASE_URL } from '../config';

const InterviewReport = ({ sessionId }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetch(`${API_BASE_URL}/api/interviews/session/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          setSession(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [sessionId]);

  if (loading) return <div className="p-10 text-center text-white">Loading Report...</div>;
  if (!session) return <div className="p-10 text-center text-red-400">Error loading report.</div>;

  const totalScore = Math.round(session.total_score || 0);
  
  // Calculate average out of the answered questions
  let validAnswers = session.questions.filter(q => q.score > 0);
  let displayScore = totalScore;
  if (validAnswers.length > 0 && totalScore === 0) {
     const sum = validAnswers.reduce((acc, q) => acc + q.score, 0);
     displayScore = Math.round(sum / session.questions.length); // Assuming total score might not have saved correctly yet
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-8 font-sans">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Interview Completion Report</h1>
        <p className="text-neutral-400">Here is how you performed across {session.questions.length} questions.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 mb-8 flex items-center justify-between shadow-2xl">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Overall Performance</h2>
          <p className="text-neutral-400 text-sm">Based on correctness, clarity, and problem-solving skills.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
             <div className="text-4xl font-bold text-cyan-400">{displayScore}%</div>
             <div className="text-sm text-cyan-500/80 font-medium uppercase tracking-widest mt-1">Total Score</div>
          </div>
          <Target className="text-cyan-500/20 w-16 h-16" />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Question Breakdown</h3>
        {session.questions.map((q, idx) => {
          // Fallback if populate failed
          const fallbackText = "Question text unavailable";
          const title = q.question_id?.question_text || fallbackText;
          const type = q.question_id?.type || 'General';
          
          return (
            <div key={idx} className="bg-neutral-900/50 border border-neutral-800/80 rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-800 text-cyan-400 border border-neutral-700">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{type}</span>
                  </div>
                  <h4 className="text-md font-medium text-neutral-200">{title}</h4>
                </div>
                {q.score > 0 && (
                   <div className="shrink-0 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded font-semibold text-sm border border-emerald-500/20">
                     {Math.round(q.score)} / 100
                   </div>
                )}
              </div>
              
              <div className="bg-neutral-950 rounded p-4 border border-neutral-800/50">
                <div className="mb-3">
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">Your Answer</span>
                  <p className="text-sm text-neutral-300 whitespace-pre-wrap">{q.answer || "No answer provided"}</p>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">AI Feedback</span>
                  <p className="text-sm text-cyan-100">{q.transcript?.[1]?.text || "Feedback recorded in session."}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-10 flex justify-center">
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-md transition-colors shadow-lg shadow-cyan-900/20">
          Return Home
        </button>
      </div>

    </div>
  );
};

export default InterviewReport;
