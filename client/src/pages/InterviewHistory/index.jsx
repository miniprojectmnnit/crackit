import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, History, Calendar, Star, ChevronDown, ChevronUp, AlertCircle, MessageSquare, Clock, BarChart2, Video, Code, ArrowRight } from 'lucide-react';
import { useAuthFetch } from '../../auth/useAuthFetch';
import { API_BASE_URL } from '../../config';

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const authFetch = useAuthFetch();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/interviews/history`);
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
  }, [authFetch]);

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
                    Interview Conversation
                  </h4>
                  
                  {(!session.transcript || session.transcript.length === 0) ? (
                     session.questions.length === 0 ? (
                        <p className="text-gray-500 italic">No conversation recorded in this session.</p>
                     ) : (
                        <div className="space-y-8 pl-2 md:pl-4 border-l-2 border-[#2A2E3D]/50 relative">
                           {session.questions.map((q, idx) => (
                             <div key={q._id || idx} className="relative">
                               <div className="absolute -left-[21px] md:-left-[29px] top-1.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-[#13151D]" />
                               <div className="mb-4">
                                 <span className="text-xs font-bold uppercase text-indigo-400 mb-1 block tracking-wider">Interviewer</span>
                                 <div className="bg-[#2A2E3D]/40 border border-[#2A2E3D] rounded-xl p-4 text-gray-200 leading-relaxed shadow-sm">
                                   <p className="font-medium">{q.question_id?.question_text || q.text || "Technical Question"}</p>
                                 </div>
                               </div>
                               <div className="mb-4 pl-4 md:pl-8">
                                 <span className="text-xs font-bold uppercase text-emerald-400 mb-1 block tracking-wider">Candidate (You)</span>
                                 <div className="bg-[#1A1D27] border border-emerald-500/20 rounded-xl p-4 text-emerald-50/90 leading-relaxed shadow-sm">
                                   {q.answer ? <p>{q.answer}</p> : <p className="italic text-gray-500">No response recorded.</p>}
                                 </div>
                               </div>
                             </div>
                           ))}
                        </div>
                     )
                  ) : (
                     <div className="space-y-6">
                        {session.transcript.map((entry, idx) => {
                          const isAi = entry.role === 'interviewer' || entry.role === 'assistant';
                          return (
                            <div key={idx} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                              <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-4 shadow-sm ${
                                isAi 
                                  ? 'bg-[#2A2E3D]/50 border border-[#2A2E3D] text-gray-200 rounded-tl-none' 
                                  : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-50 rounded-tr-none'
                              }`}>
                                <div className="flex items-center justify-between gap-4 mb-2">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isAi ? 'text-indigo-400' : 'text-indigo-300'}`}>
                                    {isAi ? 'Interviewer' : 'Candidate (You)'}
                                  </span>
                                  <span className="text-[9px] text-gray-500">
                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                                
                                {entry.code && (
                                  <div className="mt-4 rounded-xl overflow-hidden border border-black/40 bg-[#0d0d0d] shadow-inner">
                                    <div className="bg-[#1a1a1a] px-3 py-1.5 border-b border-black/40 flex items-center justify-between">
                                      <span className="text-[10px] font-mono text-gray-500 uppercase">{entry.language || 'Code'}</span>
                                      <Code size={12} className="text-gray-600" />
                                    </div>
                                    <pre className="p-4 text-[13px] font-mono text-emerald-400 overflow-x-auto custom-scrollbar leading-relaxed">
                                      <code>{entry.code}</code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                     </div>
                  )}
                  
                  <div className="mt-10 pt-6 border-t border-[#2A2E3D] flex flex-wrap gap-4 justify-center">
                     <a href={`/report/${session._id}`} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                       View Full AI Report <ArrowRight size={16} />
                     </a>
                  </div>
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
