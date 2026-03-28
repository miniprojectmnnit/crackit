import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle, Target, ArrowRight, Loader2, Award,
  Code2, Brain, Users, Cpu
} from 'lucide-react';

// ── Round definitions ──────────────────────────────────────────────────────────
const ROUNDS = [
  {
    id: "dsa",
    icon: Code2,
    title: "DSA Round",
    subtitle: "3 Questions (Easy → Hard)",
    description: "1 easy + 1 medium + 1 hard coding problem selected from a curated bank, matched to your skills.",
    color: "from-cyan-600 to-blue-700",
    border: "border-cyan-500/40",
    glow: "shadow-cyan-500/20",
    iconColor: "text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-400",
    badgeText: "Algorithmic Thinking"
  },
  {
    id: "resume",
    icon: FileText,
    title: "Resume-Based Round",
    subtitle: "10 Questions",
    description: "Deep-dive into your projects, technologies, and experiences. Questions generated directly from your resume.",
    color: "from-indigo-600 to-violet-700",
    border: "border-indigo-500/40",
    glow: "shadow-indigo-500/20",
    iconColor: "text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-400",
    badgeText: "Portfolio Deep-Dive"
  },
  {
    id: "system_design",
    icon: Cpu,
    title: "System Design Round",
    subtitle: "10 Questions",
    description: "Architecture and scalability questions tailored to your role and years of experience.",
    color: "from-orange-600 to-amber-700",
    border: "border-orange-500/40",
    glow: "shadow-orange-500/20",
    iconColor: "text-orange-400",
    badge: "bg-orange-500/10 text-orange-400",
    badgeText: "Scalability & Architecture"
  },
  {
    id: "hr",
    icon: Users,
    title: "HR Round",
    subtitle: "10 Questions",
    description: "Behavioral & situational questions. Company-specific questions scraped from real interview experiences.",
    color: "from-emerald-600 to-teal-700",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/20",
    iconColor: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400",
    badgeText: "Behavioral & Culture Fit"
  }
];

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState(null);
  const [context, setContext] = useState({ company: '', role: '', experience: '', focusArea: '' });
  const [startingRound, setStartingRound] = useState(null); // which round is loading
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResumeData(null);
      setContext({ company: '', role: '', experience: '', focusArea: '' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("user_id", localStorage.getItem("user_id") || "mock_user_123");
    try {
      const res = await fetch("http://localhost:5000/api/resume/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to process resume");
      setResumeData(await res.json());
    } catch (err) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContextChange = (e) => setContext(prev => ({ ...prev, [e.target.name]: e.target.value }));

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
          context
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
    <div className="min-h-screen bg-[#0F1117] text-white p-8 pt-24 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm px-4 py-1.5 rounded-full mb-4">
          <Brain size={14} /> AI-Powered Interview Prep
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent inline-block">
          AI Resume Analyzer
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Upload your resume to receive a personalized, structured technical interview tailored to your experience.
        </p>
      </div>

      {!resumeData ? (
        /* ── Upload Panel ─────────────────────────────────────────────────────── */
        <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col items-center">
          <div
            className="w-full max-w-2xl border-2 border-dashed border-[#3A3F58] hover:border-indigo-500 transition-all duration-300 rounded-xl p-16 flex flex-col items-center justify-center bg-[#13151D] cursor-pointer group"
            onClick={() => document.getElementById('resume-upload').click()}
          >
            <input type="file" id="resume-upload" className="hidden" accept=".pdf,.txt" onChange={handleFileChange} />
            <div className="bg-indigo-500/10 p-4 rounded-2xl mb-5 group-hover:bg-indigo-500/20 transition-colors">
              <Upload size={40} className="text-indigo-400" />
            </div>
            {file ? (
              <div className="text-center">
                <p className="text-xl font-semibold text-white mb-1">{file.name}</p>
                <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-semibold text-white mb-2">Click to browse or drag & drop</p>
                <p className="text-gray-400 text-sm">Supports PDF and TXT</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 text-red-400 bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20 w-full max-w-2xl">{error}</div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className={`mt-6 px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 w-full max-w-sm transition-all shadow-lg ${
              !file || isProcessing
                ? 'bg-[#2A2E3D] text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-500/25 cursor-pointer hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={20} /> Analyzing Document...</>
            ) : (
              <>Analyze Resume <ArrowRight size={20} /></>
            )}
          </button>
        </div>
      ) : (
        /* ── Post-Upload Panel ────────────────────────────────────────────────── */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Resume summary */}
          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#2A2E3D]">
              <div className="bg-green-500/20 p-3 rounded-full text-green-400">
                <CheckCircle size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Resume Analyzed Successfully</h2>
                <p className="text-gray-400">{resumeData.candidate_info?.name || "Candidate"}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="text-indigo-400" size={20} /> Technical Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resumeData.technical_skills?.map((skill, idx) => (
                    <span key={idx} className="bg-[#2A2E3D] text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">{skill}</span>
                  ))}
                </div>
              </div>
              {resumeData.projects?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="text-blue-400" size={20} /> Projects Detected
                  </h3>
                  <div className="space-y-2">
                    {resumeData.projects.slice(0, 3).map((proj, idx) => (
                      <div key={idx} className="bg-[#13151D] px-4 py-2 rounded-lg border border-[#2A2E3D] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                        <span className="text-gray-300 text-sm font-medium">{proj.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Context form */}
          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Target className="text-pink-400" size={20} /> Target Details (Optional but Recommended)
            </h3>
            <p className="text-sm text-gray-400 mb-6">Tell us your target role and company — questions will be tailored accordingly.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "company", label: "Target Company", placeholder: "e.g., Google, Stripe" },
                { name: "role", label: "Target Role", placeholder: "e.g., Frontend Engineer" },
                { name: "experience", label: "Years of Experience", placeholder: "e.g., 2", type: "number" },
                { name: "focusArea", label: "Focus Areas", placeholder: "e.g., System Design, React" }
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={context[field.name]}
                    onChange={handleContextChange}
                    placeholder={field.placeholder}
                    min={field.type === "number" ? "0" : undefined}
                    className="w-full bg-[#13151D] border border-[#2A2E3D] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Round Selection Cards */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Choose Your Interview Round</h2>
            <p className="text-gray-400 text-center mb-8">Select the type of interview you want to practice.</p>

            {error && (
              <div className="mb-6 text-red-400 bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20">{error}</div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              {ROUNDS.map((round) => {
                const Icon = round.icon;
                const isLoading = startingRound === round.id;
                const isDisabled = !!startingRound;
                return (
                  <button
                    key={round.id}
                    onClick={() => handleStartRound(round.id)}
                    disabled={isDisabled}
                    className={`group relative bg-[#1A1D27] border ${round.border} rounded-2xl p-6 text-left transition-all duration-300 shadow-lg ${round.glow}
                      ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl cursor-pointer'}
                    `}
                  >
                    {/* Gradient top bar */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${round.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start gap-4">
                      <div className={`bg-[#13151D] p-3 rounded-xl border border-[#2A2E3D] group-hover:border-current transition-colors ${round.iconColor}`}>
                        {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Icon size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white">{round.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${round.badge} flex-shrink-0`}>
                            {round.badgeText}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-400 mb-2">{round.subtitle}</p>
                        <p className="text-sm text-gray-500 leading-relaxed">{round.description}</p>
                      </div>
                    </div>

                    {isLoading && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                        <div className={`h-1 flex-1 rounded-full bg-[#13151D] overflow-hidden`}>
                          <div className={`h-full bg-gradient-to-r ${round.color} animate-pulse w-2/3`} />
                        </div>
                        Setting up your {round.title}...
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
