import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, History, Calendar, Star, ChevronDown, ChevronUp, AlertCircle, MessageSquare, Clock, BarChart2, Video, Code, ArrowRight } from 'lucide-react';

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/interviews/user/${localStorage.getItem("user_id") || "mock_user_123"}`);
        if (!res.ok) throw new Error("Failed to fetch interview history");
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold font-sans">Loading History...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <p className="text-xl text-red-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-white p-8 pt-24 font-sans max-w-5xl mx-auto">
      <div className="mb-10 border-b border-[#2A2E3D] pb-6 flex items-center gap-4">
        <div className="p-3 bg-indigo-500/20 rounded-xl">
          <History className="text-indigo-400" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Interview Feed
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Review your past performance, questions asked, and scores.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl shadow-xl">
          <History className="mx-auto text-gray-600 mb-4" size={48} />
          <h2 className="text-2xl font-semibold text-gray-300">No interviews found</h2>
          <p className="text-gray-500 mt-2">Complete a mock interview to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((session) => (
            <div 
              key={session._id} 
              className={`bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl overflow-hidden shadow-xl transition-all duration-300 transform ${expandedId === session._id ? 'ring-2 ring-indigo-500/50' : 'hover:-translate-y-1 hover:border-indigo-500/30'}`}
            >
              {/* Card Header (Always Visible) */}
              <div 
                className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => toggleExpand(session._id)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#2A2E3D] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold select-none">
                     {new Date(session.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                       {session.resume_id ? "Resume Mock Interview" : "General Technical Interview"}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> 
                        {new Date(session.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={14} /> 
                        {session.questions.length} Questions
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${(session.total_score || 0) >= 7 ? 'text-green-400' : (session.total_score || 0) >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {(session.total_score || 0).toFixed(1)}
                      </span>
                      <span className="text-gray-500 text-sm">/ 10</span>
                    </div>
                  </div>
                  
                  <div className="p-2 bg-[#2A2E3D] rounded-full text-gray-400">
                    {expandedId === session._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Card Body (Expanded Conversation Log) */}
              {expandedId === session._id && (
                <div className="p-6 bg-[#13151D] border-t border-[#2A2E3D]">
                  <h4 className="text-lg font-semibold mb-6 flex items-center gap-2 text-indigo-300">
                    Conversation Transcript
                  </h4>
                  
                  {session.questions.length === 0 ? (
                     <p className="text-gray-500 italic">No questions answered in this session.</p>
                  ) : (
                     <div className="space-y-8 pl-2 md:pl-4 border-l-2 border-[#2A2E3D]/50 relative">
                        {session.questions.map((q, idx) => (
                          <div key={q._id || idx} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[21px] md:-left-[29px] top-1.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-[#13151D]" />
                            
                            {/* Question block */}
                            <div className="mb-4">
                              <span className="text-xs font-bold uppercase text-indigo-400 mb-1 block tracking-wider">Interviewer</span>
                              <div className="bg-[#2A2E3D]/40 border border-[#2A2E3D] rounded-xl p-4 text-gray-200 leading-relaxed shadow-sm">
                                <p className="font-medium">{q.question_id?.question_text || "Unknown Question"}</p>
                                {q.question_id?.type === 'Coding' && (
                                  <span className="inline-block mt-2 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded font-mono">Coding Task</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Answer block */}
                            <div className="mb-4 pl-4 md:pl-8">
                              <span className="text-xs font-bold uppercase text-emerald-400 mb-1 block tracking-wider">Candidate (You)</span>
                              <div className="bg-[#1A1D27] border border-emerald-500/20 rounded-xl p-4 text-emerald-50/90 leading-relaxed shadow-sm">
                                {q.answer ? (
                                  q.question_id?.type === 'Coding' ? (
                                    <pre className="text-sm font-mono overflow-x-auto text-emerald-200"><code>{q.answer}</code></pre>
                                  ) : (
                                    <p>{q.answer}</p>
                                  )
                                ) : (
                                  <p className="italic text-gray-500">No physical response recorded.</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Score/Feedback block */}
                            <div className="pl-4 md:pl-8 flex items-center gap-3">
                              <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm ${
                                (q.score || 0) >= 80 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                (q.score || 0) >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                <Star size={16} fill="currentColor" /> Score: {q.score || 0}/100
                              </div>
                            </div>
                          </div>
                        ))}
                     </div>
                  )}
                  
                  {session.resume_id && (
                    <div className="mt-8 pt-6 border-t border-[#2A2E3D] text-center">
                       <a href={`/interview-report/${session._id}`} className="inline-block px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20">
                         View Full AI Evaluation Report
                       </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewHistory;
