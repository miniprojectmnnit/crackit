import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2, Brain, Users, Cpu, Briefcase, Sparkles, Building2,
  FileText, Upload, CheckCircle, ArrowRight, Award, Loader2, Target
} from 'lucide-react';
import { useAuthFetch } from '../../auth/useAuthFetch';
import companyList from '../../data/companies.json';
import { API_BASE_URL } from '../../config';
import SearchableCompanySelect from '../../components/SearchableCompanySelect';

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
  const authFetch = useAuthFetch();

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
  //Its purpose is to take the file the user selected, send it to your server, and then update the UI with the AI-parsed results.
  const handleSubmitSetup = async () => {
    if (!file) {
      setError("Please upload your resume to proceed.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    const formData = new FormData();
    formData.append("resume", file);

    // We implicitly hold the context in state

    try {
      const res = await authFetch(`${API_BASE_URL}/api/resume/upload`, {
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

  //initialize a session and then move the user into the actual interview room.
  const handleStartRound = async (roundId) => {
    if (!resumeData?._id) return;
    setStartingRound(roundId);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: resumeData._id,
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
                  <SearchableCompanySelect
                    value={context.company}
                    options={companyList}
                    onChange={handleContextChange}
                    placeholder="Select Target Company"
                  />
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
                className={`bg-[#0D1017]/80 backdrop-blur-2xl border-2 border-dashed shadow-2xl rounded-3xl p-8 md:p-12 flex-1 flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden cursor-pointer ${file ? 'border-indigo-500/50 bg-indigo-950/10' : 'border-slate-800 hover:border-indigo-500/60 hover:bg-[#11141D]'
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

                <div className={`p-5 rounded-2xl mb-6 shadow-xl transition-all duration-300 ${file ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-slate-800/80 group-hover:bg-indigo-600 group-hover:shadow-indigo-500/30'
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
                className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${!file || isProcessing
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
            <div className="relative rounded-3xl overflow-hidden">
              {/* ── Outer animated gradient border ── */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-indigo-500/20 opacity-60" />
              <div className="absolute inset-[1px] rounded-3xl bg-[#0A0E16]/98" />

              <div className="relative p-8 md:p-10">
                {/* ── Header Row ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/[0.06]">
                  <div className="flex items-center gap-5">
                    {/* Animated success icon with pulse ring */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-400/20 rounded-2xl animate-ping opacity-30" style={{ animationDuration: '2s' }} />
                      <div className="relative bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 text-white">
                        <CheckCircle size={32} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-extrabold tracking-tight mb-1">
                        <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">Resume Analyzed</span>
                      </h2>
                      <p className="text-emerald-400/80 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                        Candidate: <span className="text-white font-semibold">{resumeData.candidate_info?.name || "Ready to proceed"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Context info with icons */}
                  <div className="flex flex-col items-start gap-2.5 text-sm">
                    <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-300">
                      <Briefcase size={14} className="text-indigo-400 flex-shrink-0" />
                      <span className="text-slate-500">Target:</span>
                      <span className="text-white font-semibold">{context.role || 'Not Specified'}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-300">
                      <Building2 size={14} className="text-cyan-400 flex-shrink-0" />
                      <span className="text-slate-500">Company:</span>
                      <span className="text-white font-semibold">{context.company || 'Not Specified'}</span>
                    </div>
                  </div>
                </div>

                {/* ── Skills & Projects Grid ── */}
                <div className="grid md:grid-cols-2 gap-8">

                  {/* ── Extracted Skills Panel ── */}
                  <div className="group relative rounded-2xl overflow-hidden">
                    {/* Panel gradient border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[1px] rounded-2xl bg-[#0D1119]" />

                    <div className="relative p-6">
                      <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
                        <div className="relative p-2.5 bg-indigo-500/15 rounded-xl border border-indigo-500/20 group-hover:border-indigo-400/40 transition-colors duration-300">
                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 16px rgba(99,102,241,0.15)' }} />
                          <FileText className="text-indigo-400 relative z-10" size={18} />
                        </div>
                        <span className="group-hover:text-indigo-200 transition-colors duration-300">Extracted Skills</span>
                        {resumeData.technical_skills?.length > 0 && (
                          <span className="ml-auto text-xs font-semibold text-indigo-400/60 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                            {resumeData.technical_skills.length} found
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                        {resumeData.technical_skills?.length ? resumeData.technical_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="skill-tag relative bg-[#161B2E] border border-indigo-500/15 text-indigo-200 px-4 py-2 rounded-full text-sm font-semibold tracking-wide
                              hover:bg-indigo-500/15 hover:border-indigo-400/40 hover:text-white hover:scale-105 hover:shadow-[0_0_16px_rgba(99,102,241,0.15)]
                              transition-all duration-300 cursor-default"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            {skill}
                          </span>
                        )) : <span className="text-slate-500 italic">No specific technical skills extracted.</span>}
                      </div>
                    </div>
                  </div>

                  {/* ── Key Projects Panel ── */}
                  <div className="group relative rounded-2xl overflow-hidden">
                    {/* Panel gradient border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[1px] rounded-2xl bg-[#0D1119]" />

                    <div className="relative p-6">
                      <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
                        <div className="relative p-2.5 bg-cyan-500/15 rounded-xl border border-cyan-500/20 group-hover:border-cyan-400/40 transition-colors duration-300">
                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 16px rgba(6,182,212,0.15)' }} />
                          <Award className="text-cyan-400 relative z-10" size={18} />
                        </div>
                        <span className="group-hover:text-cyan-200 transition-colors duration-300">Key Portfolios / Projects</span>
                      </h3>
                      <div className="space-y-3">
                        {resumeData.projects?.length ? resumeData.projects.slice(0, 3).map((proj, idx) => (
                          <div
                            key={idx}
                            className="group/proj relative bg-[#111827]/80 px-5 py-4 rounded-xl border border-white/[0.05] flex items-center gap-4
                              hover:border-cyan-500/30 hover:bg-[#111827] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
                              transition-all duration-300 cursor-default"
                          >
                            {/* Animated accent dot */}
                            <div className="relative flex-shrink-0">
                              <div className="w-2.5 h-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                              <div className="absolute inset-0 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }} />
                            </div>
                            <span className="text-slate-200 font-medium truncate group-hover/proj:text-white transition-colors duration-300">{proj.name}</span>
                            {/* Hover arrow */}
                            <ArrowRight size={14} className="ml-auto text-slate-600 opacity-0 group-hover/proj:opacity-100 group-hover/proj:translate-x-1 transition-all duration-300 flex-shrink-0" />
                          </div>
                        )) : <span className="text-slate-500 italic">No projects extracted.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Round Grid */}
            <div className="grid md:grid-cols-2 gap-7 relative">
              {ROUNDS.map((round, index) => {
                const Icon = round.icon;
                const isLoading = startingRound === round.id;
                const isDisabled = !!startingRound;
                return (
                  <button
                    key={round.id}
                    onClick={() => handleStartRound(round.id)}
                    disabled={isDisabled}
                    className={`round-card group relative bg-[#0A0E16]/95 backdrop-blur-xl rounded-3xl p-8 text-left transition-all duration-500 transform overflow-hidden
                      ${isDisabled && !isLoading ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                      ${!isDisabled ? 'hover:-translate-y-3 hover:scale-[1.015] cursor-pointer' : ''}
                      ${isLoading ? 'scale-[1.02] border-white/20' : ''}
                    `}
                    style={{
                      animationDelay: `${index * 120}ms`,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* ── Animated neon border glow ── */}
                    <div
                      className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}
                      style={{
                        background: `linear-gradient(135deg, ${round.id === 'dsa' ? 'rgba(6,182,212,0.25)' : round.id === 'resume' ? 'rgba(99,102,241,0.25)' : round.id === 'system_design' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}, transparent 60%)`,
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at bottom right, ${round.id === 'dsa' ? 'rgba(6,182,212,0.12)' : round.id === 'resume' ? 'rgba(99,102,241,0.12)' : round.id === 'system_design' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'}, transparent 70%)`,
                      }}
                    />

                    {/* ── Holographic shimmer sweep ── */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                      <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent group-hover:translate-x-[400%] transition-transform duration-1000 ease-in-out" />
                    </div>

                    {/* ── Top accent line with glow ── */}
                    <div className={`absolute top-0 inset-x-0 h-[2px] rounded-t-3xl bg-gradient-to-r ${round.color} opacity-30 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className={`absolute top-0 inset-x-6 h-[1px] rounded-full bg-gradient-to-r ${round.color} opacity-0 group-hover:opacity-60 blur-sm transition-opacity duration-500`} />

                    {/* ── Floating corner particles ── */}
                    <div className={`absolute top-4 right-4 w-1 h-1 rounded-full bg-gradient-to-r ${round.color} opacity-0 group-hover:opacity-60 transition-all duration-700 group-hover:translate-y-[-4px] group-hover:translate-x-[2px]`} />
                    <div className={`absolute bottom-6 left-6 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${round.color} opacity-0 group-hover:opacity-40 transition-all duration-1000 group-hover:translate-y-[-6px]`} />
                    <div className={`absolute top-1/2 right-8 w-0.5 h-0.5 rounded-full bg-gradient-to-r ${round.color} opacity-0 group-hover:opacity-50 transition-all duration-700 delay-200 group-hover:translate-y-[-8px]`} />

                    {/* ── Card glow shadow ── */}
                    <div
                      className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-xl -z-10"
                      style={{
                        background: round.id === 'dsa' ? 'rgba(6,182,212,0.08)' : round.id === 'resume' ? 'rgba(99,102,241,0.08)' : round.id === 'system_design' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                      }}
                    />

                    <div className="flex flex-col h-full relative z-10 w-full">
                      <div className="flex items-center justify-between mb-6">
                        {/* ── Glowing icon container ── */}
                        <div className={`relative p-4 rounded-2xl bg-black/50 border border-white/[0.06] group-hover:border-white/[0.12] transition-all duration-500 flex-shrink-0 ${round.iconColor}`}>
                          {/* Icon glow halo */}
                          <div
                            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{
                              boxShadow: round.id === 'dsa' ? '0 0 24px rgba(6,182,212,0.2)' : round.id === 'resume' ? '0 0 24px rgba(99,102,241,0.2)' : round.id === 'system_design' ? '0 0 24px rgba(245,158,11,0.2)' : '0 0 24px rgba(16,185,129,0.2)',
                            }}
                          />
                          {isLoading ? <Loader2 size={28} className="animate-spin relative z-10" /> : <Icon size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />}
                        </div>

                        {/* ── Animated badge ── */}
                        <span className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full ${round.badge} flex-shrink-0 ml-2 group-hover:scale-105 transition-transform duration-300`}>
                          {round.badgeText}
                        </span>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white tracking-tight mb-2 group-hover:translate-x-1.5 transition-transform duration-300">{round.title}</h3>
                        <p className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide group-hover:text-slate-300 transition-colors duration-300">{round.subtitle}</p>
                        <p className="text-slate-500 leading-relaxed font-medium text-sm md:text-base group-hover:text-slate-400 transition-colors duration-500">{round.description}</p>
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
                        <div className={`mt-8 flex items-center justify-between font-bold text-sm tracking-wide transition-all duration-500 ${round.iconColor}`}
                          style={{ opacity: 0, transform: 'translateY(8px)' }}
                        >
                          <span className="group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 opacity-0 translate-y-2 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${round.color} shadow-lg animate-pulse`} />
                            Start This Round
                          </span>
                          <ArrowRight size={18} className="group-hover:translate-x-2 group-hover:opacity-100 opacity-0 transition-all duration-500 delay-100" />
                        </div>
                      )}
                    </div>

                    {/* ── Bottom border accent ── */}
                    <div className={`absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r ${round.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
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
