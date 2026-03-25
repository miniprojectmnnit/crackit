import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ThumbsUp, Target, ChevronRight, Loader2, Star } from 'lucide-react';

const recommendationConfig = {
  "Strong Hire": { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", icon: "🌟" },
  "Hire": { color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30", icon: "✅" },
  "Maybe": { color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", icon: "🤔" },
  "No Hire": { color: "text-red-400", bg: "bg-red-400/10 border-red-400/30", icon: "❌" }
};

const ScoreRing = ({ score }) => {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#facc15' : '#f87171';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="54"
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold text-white">{score}</div>
        <div className="text-xs text-slate-400">/ 100</div>
      </div>
    </div>
  );
};

const InterviewReport = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}`);
        const data = await res.json();
        setSession(data);
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setLoading(false);
      }
    };
    // Poll until phase is "done"
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}`);
        const data = await res.json();
        if (data.phase === 'done' || data.final_report?.summary) {
          setSession(data);
          setLoading(false);
          clearInterval(poll);
        }
      } catch (e) {}
    }, 2000);
    fetchSession();
    return () => clearInterval(poll);
  }, [sessionId]);

  if (loading || !session?.final_report?.summary) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-cyan-400 mx-auto mb-4" size={48} />
          <p className="text-slate-300 text-lg font-medium">Generating your report...</p>
          <p className="text-slate-500 text-sm mt-2">Our AI is analyzing the full interview</p>
        </div>
      </div>
    );
  }

  const report = session.final_report;
  const recConfig = recommendationConfig[report.recommendation] || recommendationConfig["Maybe"];

  return (
    <div className="min-h-screen bg-[#080a0f] text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-400 mb-6">
            <Trophy size={14} className="text-yellow-400" />
            Interview Complete
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Performance Report
          </h1>
        </div>

        {/* Score + Recommendation */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 flex flex-col items-center gap-4">
            <p className="text-sm text-slate-400 font-medium">Overall Score</p>
            <ScoreRing score={report.overall_score || session.total_score || 0} />
          </div>
          <div className={`border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 ${recConfig.bg}`}>
            <span className="text-5xl">{recConfig.icon}</span>
            <p className="text-sm text-slate-400">Recommendation</p>
            <p className={`text-2xl font-bold ${recConfig.color}`}>{report.recommendation}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Summary</h2>
          <p className="text-slate-200 leading-relaxed">{report.summary}</p>
        </div>

        {/* Strengths + Areas */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/50 border border-emerald-500/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <ThumbsUp size={14} /> Strengths
            </h2>
            <ul className="space-y-2">
              {report.strengths?.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Star size={12} className="text-emerald-400 mt-1 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900/50 border border-yellow-500/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Target size={14} /> Areas to Improve
            </h2>
            <ul className="space-y-2">
              {report.areas_for_improvement?.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <ChevronRight size={12} className="text-yellow-400 mt-1 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/resume-upload')}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors"
          >
            New Interview
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 rounded-xl text-sm font-medium transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewReport;
