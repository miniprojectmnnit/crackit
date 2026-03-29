import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle, Target, ArrowRight, Loader2, Award,
  Code2, Brain, Users, Cpu, Briefcase, Sparkles, Building2
} from 'lucide-react';

// ── Round definitions ──────────────────────────────────────────────────────────
const ROUNDS = [
  {
    id: "dsa",
    icon: Code2,
    title: "DSA Round",
    subtitle: "3 Questions (Easy → Hard)",
    description: "1 easy + 1 medium + 1 hard coding problem selected from a curated bank, matched to your skills.",
    color: "from-cyan-500 to-blue-600",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
    glow: "shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]",
    iconColor: "text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    badgeText: "Algorithmic Thinking"
  },
  {
    id: "resume",
    icon: FileText,
    title: "Resume-Based Round",
    subtitle: "10 Questions",
    description: "Deep-dive into your projects, technologies, and experiences. Questions generated directly from your resume.",
    color: "from-indigo-500 to-violet-600",
    border: "border-indigo-500/30 hover:border-indigo-400/60",
    glow: "shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]",
    iconColor: "text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    badgeText: "Portfolio Deep-Dive"
  },
  {
    id: "system_design",
    icon: Cpu,
    title: "System Design Round",
    subtitle: "10 Questions",
    description: "Architecture and scalability questions tailored to your role and years of experience.",
    color: "from-amber-500 to-orange-600",
    border: "border-amber-500/30 hover:border-amber-400/60",
    glow: "shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]",
    iconColor: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    badgeText: "Scalability & Architecture"
  },
  {
    id: "hr",
    icon: Users,
    title: "HR Round",
    subtitle: "10 Questions",
    description: "Behavioral & situational questions. Company-specific questions scraped from real interview experiences.",
    color: "from-emerald-500 to-teal-600",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    glow: "shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]",
    iconColor: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    badgeText: "Behavioral & Culture Fit"
  }
];

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState(null);
  
  // Unified Context State
  const [context, setContext] = useState({ 
    company: '', 
    role: '', 
    experience: '', 
    focusArea: '' 
  });
  const [startingRound, setStartingRound] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleContextChange = (e) => {
    setContext(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitSetup = async () => {
    if (!file) {
      setError("Please upload your resume to proceed.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("user_id", localStorage.getItem("user_id") || "mock_user_123");
    
    // We implicitly hold the context in state
    
    try {
      const res = await fetch("http://localhost:5000/api/resume/upload", { 
        method: "POST", 
        body: formData 
      });
      if (!res.ok) throw new Error("Failed to process resume");
      
      const parsedData = await res.json();
      setResumeData(parsedData);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRound = async (roundId) => {
    if (!resumeData?._id) return;
    setStartingRound(roundId);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: resumeData._id,
          user_id: localStorage.getItem("user_id") || "mock_user_123",
          round_type: roundId,
          context: context 
        })
      });
      
      if (!res.ok) throw new Error("Failed to create session");
      const { session_id } = await res.json();
      navigate(`/interview-room/${session_id}`);
    } catch (err) {
      setError("Failed to start interview. Please try again.");
      setStartingRound(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 p-6 md:p-12 font-sans relative overflow-hidden flex flex-col items-center">
      
      {/* Dynamic Background Effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Container */}
      <div className="w-full max-w-6xl text-center mt-6 md:mt-10 mb-8 md:mb-12 relative z-10">
        <div className="inline-flex items-center justify-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-sm font-medium tracking-wide shadow-lg shadow-indigo-900/20">
          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
          <span>CrackIt Autonomous Interview Platform</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            {resumeData ? "Select Interview Round" : "Configure Your Virtual Interview"}
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-light">
          {resumeData 
            ? "Your profile is loaded and the AI is prepped. Choose which round you'd like to simulate today." 
            : "Upload your resume and provide target details so our AI interviewer can precisely tailor the questions to your career goals."}
        </p>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300 bg-red-950/40 border-l-4 border-red-500 p-5 rounded-r-xl shadow-lg backdrop-blur-sm flex items-start gap-4">
             <div className="p-1.5 bg-red-500/20 rounded-full">
               <Cpu size={20} className="text-red-400" />
             </div>
             <div>
               <h3 className="text-red-300 font-semibold md:text-lg mb-1">Configuration Error</h3>
               <p className="text-red-400/80 text-sm">{error}</p>
             </div>
          </div>
        )}

        {/* ── STAGE 1: UNIFIED SETUP DASHBOARD ────────────────────────────────────────── */}
        {!resumeData ? (
          <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
            
            {/* L-Column: Target Context Form */}
            <div className="bg-[#0D1017]/80 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-3xl p-8 md:p-10 flex flex-col h-full transform transition-all hover:bg-[#11141D]/90">
              <div className="flex items-center gap-3 mb-8">
                <Target size={28} className="text-blue-500" />
                <h2 className="text-2xl font-bold tracking-tight text-white">Target Details</h2>
              </div>
              
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 pl-1">Target Company</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                      type="text"
                      name="company"
                      value={context.company}
                      onChange={handleContextChange}
                      placeholder="e.g., Google, Stripe, Meta"
                      className="w-full bg-black/40 border border-slate-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 pl-1">Target Role</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                      type="text"
                      name="role"
                      value={context.role}
                      onChange={handleContextChange}
                      placeholder="e.g., Senior Full-Stack Engineer"
                      className="w-full bg-black/40 border border-slate-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2 pl-1">Experience (Years)</label>
                    <input
                      type="number"
                      name="experience"
                      value={context.experience}
                      onChange={handleContextChange}
                      placeholder="e.g., 3"
                      min="0"
                      className="w-full bg-black/40 border border-slate-800 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2 pl-1">Focus Areas</label>
                    <input
                      type="text"
                      name="focusArea"
                      value={context.focusArea}
                      onChange={handleContextChange}
                      placeholder="e.g., React, Go"
                      className="w-full bg-black/40 border border-slate-800 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* R-Column: Resume Upload & Submit Action */}
            <div className="flex flex-col gap-6 h-full">
              
              <div 
                className={`bg-[#0D1017]/80 backdrop-blur-2xl border-2 border-dashed shadow-2xl rounded-3xl p-8 md:p-12 flex-1 flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                  file ? 'border-indigo-500/50 bg-indigo-950/10' : 'border-slate-800 hover:border-indigo-500/60 hover:bg-[#11141D]'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('resume-upload').click()}
              >
                {/* Background glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <input 
                  type="file" 
                  id="resume-upload" 
                  className="hidden" 
                  accept=".pdf,.txt" 
                  onChange={handleFileChange} 
                />
                
                <div className={`p-5 rounded-2xl mb-6 shadow-xl transition-all duration-300 ${
                  file ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-slate-800/80 group-hover:bg-indigo-600 group-hover:shadow-indigo-500/30'
                }`}>
                  <Upload size={40} className={`transition-colors ${file ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                </div>
                
                {file ? (
                  <div className="text-center z-10 w-full px-4">
                    <p className="text-2xl font-bold text-white mb-2 tracking-tight truncate">{file.name}</p>
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
                       <CheckCircle size={14} /> Ready to analyze ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </div>
                ) : (
                  <div className="text-center z-10">
                    <p className="text-2xl font-bold text-slate-200 mb-3 tracking-tight">Drop your resume here</p>
                    <p className="text-slate-500 text-sm font-medium">or click to browse from device</p>
                    <div className="mt-6 flex justify-center gap-3">
                       <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">PDF</span>
                       <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">TXT</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmitSetup}
                disabled={!file || isProcessing}
                className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                  !file || isProcessing
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-600/25 hover:scale-[1.02] border border-white/10 cursor-pointer'
                }`}
              >
                {isProcessing ? (
                  <><Loader2 className="animate-spin" size={24} /> Analyzing Profile & Syncing Context...</>
                ) : (
                  <>Initialise Session <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>

            </div>
          </div>
        ) : (
          /* ── STAGE 2: ROUND SELECTION HUB ─────────────────────────────────────────────── */
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Parsed Resume Summary */}
            <div className="bg-[#0D1017]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-8">
                <div className="flex items-center gap-5">
                  <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">Resume Analyzed</h2>
                    <p className="text-emerald-400/80 font-medium">Candidate: <span className="text-white">{resumeData.candidate_info?.name || "Ready to proceed"}</span></p>
                  </div>
                </div>
                
                {/* Context Echo */}
                <div className="flex flex-col items-start gap-1 text-sm bg-black/30 p-4 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-2"><span className="text-slate-500 w-16">Target:</span><span className="text-white font-medium bg-black px-2 py-0.5 rounded-md border border-white/5">{context.role || 'Not Specified'}</span></div>
                   <div className="flex items-center gap-2"><span className="text-slate-500 w-16">Company:</span><span className="text-white font-medium bg-black px-2 py-0.5 rounded-md border border-white/5">{context.company || 'Not Specified'}</span></div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                  <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg"><FileText className="text-indigo-400" size={18} /></div>
                    Extracted Skills
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {resumeData.technical_skills?.length ? resumeData.technical_skills.map((skill, idx) => (
                      <span key={idx} className="bg-[#1A1F2E] border border-indigo-500/20 text-indigo-200 px-3.5 py-1.5 rounded-full text-sm font-semibold tracking-wide hover:bg-indigo-500/20 transition-colors">{skill}</span>
                    )) : <span className="text-slate-500 italic">No specific technical skills extracted.</span>}
                  </div>
                </div>
                
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors">
                  <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg"><Award className="text-blue-400" size={18} /></div>
                    Key Portfolios / Projects
                  </h3>
                  <div className="space-y-3 flexflex-col gap-2">
                    {resumeData.projects?.length ? resumeData.projects.slice(0, 3).map((proj, idx) => (
                      <div key={idx} className="bg-[#151924] px-5 py-3.5 rounded-xl border border-slate-800 flex items-center gap-4 hover:border-slate-700 transition-colors">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        <span className="text-slate-200 font-medium truncate">{proj.name}</span>
                      </div>
                    )) : <span className="text-slate-500 italic">No projects extracted.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Round Grid */}
            <div className="grid md:grid-cols-2 gap-6 relative">
              {ROUNDS.map((round) => {
                const Icon = round.icon;
                const isLoading = startingRound === round.id;
                const isDisabled = !!startingRound;
                return (
                  <button
                    key={round.id}
                    onClick={() => handleStartRound(round.id)}
                    disabled={isDisabled}
                    className={`group relative bg-[#0D1017]/90 backdrop-blur-md border ${round.border} rounded-3xl p-8 text-left transition-all duration-300 transform 
                      ${isDisabled && !isLoading ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                      ${!isDisabled ? `hover:-translate-y-2 hover:${round.glow} cursor-pointer` : ''}
                      ${isLoading ? `scale-[1.02] ${round.glow} border-white/20` : ''}
                    `}
                  >
                    {/* Ambient Background Gradient on Hover */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${round.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                    
                    {/* Top Neon Accent Line */}
                    <div className={`absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r ${round.color} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />

                    <div className="flex flex-col h-full relative z-10 w-full overflow-hidden">
                      <div className="flex items-center justify-between mb-6">
                         <div className={`p-4 rounded-2xl bg-black/40 border border-white/5 group-hover:bg-black/60 transition-colors flex-shrink-0 ${round.iconColor}`}>
                            {isLoading ? <Loader2 size={28} className="animate-spin" /> : <Icon size={28} />}
                         </div>
                         <span className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full ${round.badge} flex-shrink-0 ml-2`}>
                            {round.badgeText}
                         </span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white tracking-tight mb-2 group-hover:translate-x-1 transition-transform">{round.title}</h3>
                        <p className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">{round.subtitle}</p>
                        <p className="text-slate-500 leading-relaxed font-medium text-sm md:text-base">{round.description}</p>
                      </div>

                      {isLoading ? (
                        <div className="mt-8 flex flex-col gap-3">
                           <div className="flex items-center justify-between text-sm font-medium">
                              <span className={round.iconColor}>Initializing session...</span>
                              <span className="text-slate-500 animate-pulse">Wait</span>
                           </div>
                           <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${round.color} animate-[pulse_1.5s_ease-in-out_infinite] w-[80%] rounded-full`} />
                           </div>
                        </div>
                      ) : (
                         <div className={`mt-8 flex items-center justify-between font-bold text-sm tracking-wide opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 ${round.iconColor}`}>
                            <span>Select Round</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
         )}
      </div>
    </div>
  );
};

export default ResumeUpload;
