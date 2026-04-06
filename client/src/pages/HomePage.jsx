import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthFetch } from "../auth/useAuthFetch";
import { useAuth } from "@clerk/clerk-react";
import { useApiKey } from "../auth/ApiKeyContext";
import {
  FileText,
  Users,
  Sparkles,
  BrainCircuit,
  Target, ArrowRight, Zap, Upload, MessageSquare, BarChart3, CheckCircle2, Trash2, Plus, Key,
  Download, FolderOpen, Puzzle, Settings, Chrome
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { motion } from "framer-motion";

/* ─── Particle Background ─── */
const ParticleField = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.4 + 0.1,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(0,212,255,${p.opacity}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, -80, -30, -100, 0],
            x: [0, 20, -15, 10, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};



/* ─── Main Home Component ─── */
const Home = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isSignedIn } = useAuth();
  const [hoveredCard, setHoveredCard] = useState(null);
  
  const [searchParams] = useSearchParams();
  const { keysList, fetchKeys, hasKeys } = useApiKey();
  
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [apiKeysStatus, setApiKeysStatus] = useState('');
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const apiKeySectionRef = React.useRef(null);

  useEffect(() => {
    if (searchParams.get('showKeyPrompt')) {
      apiKeySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchParams]);

  const handleAddKey = async () => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }
    // Auto-generate name if not provided
    const nameToSave = newKeyName.trim() || `Groq Key ${new Date().toLocaleDateString()}`;
    
    if (!newKeyValue.trim()) {
      setApiKeysStatus('Key Value is required.');
      setTimeout(() => setApiKeysStatus(''), 4000);
      return;
    }
    
    setApiKeysStatus('Saving...');
    try {
      const response = await authFetch(`${API_BASE_URL}/api/settings/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToSave, value: newKeyValue.trim() }),
      });
      if (response.ok) {
        setApiKeysStatus('Key securely saved!');
        setNewKeyName('');
        setNewKeyValue('');
        fetchKeys();
        setTimeout(() => setApiKeysStatus(''), 4000);
      } else {
        setApiKeysStatus('Failed to securely save key.');
      }
    } catch (error) {
      setApiKeysStatus('Error saving key.');
    }
  };

  const handleDeleteKey = async (name) => {
    try {
      setApiKeysStatus('Deleting...');
      const response = await authFetch(`${API_BASE_URL}/api/settings/keys/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setApiKeysStatus('Key deleted.');
        fetchKeys();
        setTimeout(() => setApiKeysStatus(''), 4000);
      } else {
        setApiKeysStatus('Failed to delete key.');
      }
    } catch (error) {
      setApiKeysStatus('Error deleting key.');
    }
  };
  const handleStartInterview = () => {
    // If user has keys in their wallet, proceed
    if (hasKeys || (newKeyValue.trim().startsWith('gsk_'))) {
      navigate("/resume-upload");
      return;
    }

    // Otherwise, scroll to the API key section
    apiKeySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setAlertMessage("Please enter your Groq API key before starting the interview.");
    setShowValidationAlert(true);
    
    // Auto-hide alert after 5 seconds
    setTimeout(() => {
      setShowValidationAlert(false);
    }, 5000);
  };

  // Removed redundant cards as they are already featured in Hero CTAs

  const steps = [
    {
      number: "01",
      title: "Upload Your Resume",
      description: "Our AI parses your skills, experience, and career goals to craft the perfect interview.",
      icon: Upload,
      color: "from-[#00d4ff] to-[#0066ff]",
    },
    {
      number: "02",
      title: "Face the AI Interviewer",
      description: "Engage in a real-time, adaptive conversation that simulates a live technical interview.",
      icon: MessageSquare,
      color: "from-[#a855f7] to-[#6d28d9]",
    },
    {
      number: "03",
      title: "Get Detailed Analytics",
      description: "Receive comprehensive scoring, feedback, and improvement roadmaps after every session.",
      icon: BarChart3,
      color: "from-[#f59e0b] to-[#ea580c]",
    },
  ];



  /* ─── Animation Variants ─── */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="w-full relative bg-[#030508] text-slate-200 overflow-hidden font-body min-h-screen scan-line-overlay">
      {/* ── Particle Field ── */}
      <ParticleField />

      {/* ── Ambient Background Orbs ── */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12], rotate: [0, 60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] bg-[#00d4ff]/15 rounded-full blur-[180px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[5%] right-[-8%] w-[45vw] h-[45vw] bg-[#a855f7]/15 rounded-full blur-[180px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.14, 0.06] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] bg-[#f59e0b]/10 rounded-full blur-[150px] pointer-events-none"
      />

      {/* ── Validation Alert Popup ── */}
      {showValidationAlert && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-[#0f111a] border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)] p-4 rounded-2xl backdrop-blur-2xl flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <Key className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm">Action Required</h4>
              <p className="text-slate-400 text-xs leading-relaxed">{alertMessage}</p>
            </div>
            <button 
              onClick={() => setShowValidationAlert(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-500 rotate-45" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-28 md:pt-52 md:pb-40 px-6">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/8 mb-12 backdrop-blur-xl neon-border"
            >
              <Sparkles className="w-4 h-4 text-[#00d4ff] animate-pulse" />
              <span className="text-sm font-semibold tracking-widest text-[#00d4ff]/90 uppercase font-body">
                Next-Gen AI Interview Engine
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter mb-8 leading-[0.95] font-display"
            >
              <span className="text-white">Ace Every</span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #00d4ff 0%, #a855f7 40%, #f59e0b 70%, #00d4ff 100%)",
                  backgroundSize: "200% auto",
                  animation: "text-shimmer 4s linear infinite",
                }}
              >
                Interview
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto mb-16 leading-relaxed font-light font-body"
            >
              Master every stage of the technical interview with{" "}
              <span className="text-[#00d4ff] font-medium">dynamic AI simulations</span>{" "}
              that adapt to your resume, career goals, and skill level in real time.
            </motion.p>

            {/* ── API KEY CONFIGURATION (MOVED ABOVE START BUTTON) ── */}
            <section id="api-keys-section" ref={apiKeySectionRef} className="container mx-auto px-0 max-w-5xl relative z-10 mb-16 mt-12 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-[#0f111a]/90 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] border border-cyan-500/30 shadow-[0_0_60px_rgba(0,212,255,0.1)] relative overflow-hidden"
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 to-[#a855f7]/5 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start">
                  
                  {/* Left: How to get a key */}
                  <div className="lg:w-3/5">
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 mb-6">
                       <Zap className="w-4 h-4 text-amber-400" />
                       <span className="text-xs font-bold tracking-widest text-amber-400 uppercase font-body">Pro Tip</span>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
                      Bring Your Own <span className="text-[#00d4ff]">API Keys</span>
                    </h2>
                    
                    <p className="text-slate-400 text-base leading-relaxed mb-8 font-body font-light">
                      Since CrackIt relies on powerful AI models with strict rate limits, you might occasionally face slowdowns or availability issues if our default quotas are exhausted. 
                      You can prevent this by providing your own <span className="text-white font-medium">free Groq API keys</span> to serve as a robust fallback queue.
                    </p>
                    
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                        How to Get a Free Groq API Key:
                      </h3>
                      <ol className="space-y-4">
                        {[
                          { text: "Go to the Groq Cloud Console.", link: "https://console.groq.com/" },
                          { text: "Sign up or log in to your free account." },
                          { text: "Navigate to the API Keys section in the sidebar." },
                          { text: "Click Create API Key, give it a name, and copy the secret key." },
                          { text: "Paste it here! You can add multiple keys for maximum stability." }
                        ].map((step, i) => (
                          <li key={i} className="flex gap-4 text-base text-slate-400 items-start group">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs mt-0.5">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">
                              {step.link ? (
                                <>Go to the <a href={step.link} target="_blank" rel="noreferrer" className="text-[#00d4ff] hover:underline font-semibold decoration-cyan-500/30 underline-offset-4">Groq Cloud Console</a>.</>
                              ) : step.text}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Right: The Form */}
                  <div className="lg:w-2/5 flex flex-col w-full bg-white/[0.02] border border-white/5 p-6 md:p-8 rounded-3xl backdrop-blur-sm self-stretch">
                    <div className="flex items-center justify-between mb-6">
                      <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Key className="w-4 h-4 text-cyan-400" />
                        Secure Key Wallet
                      </label>
                      {keysList.length > 0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    
                    {/* Existing Keys List */}
                    {isSignedIn && keysList.length > 0 && (
                      <div className="flex flex-col gap-3 mb-6 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {keysList.map((keyObj, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-[#0A0D14] border border-white/5 px-4 py-3 rounded-xl hover:border-cyan-500/40 transition-all group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-xs group-hover:bg-cyan-500/20">
                                {keyObj.name.substring(0, 1).toUpperCase()}
                              </div>
                              <div className="flex flex-col overflow-hidden text-left">
                                <span className="text-xs font-bold text-slate-200 truncate">{keyObj.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono tracking-tighter truncate opacity-60">Masked for security</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteKey(keyObj.name)} 
                              className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Delete Key"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Key Form */}
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="space-y-2">
                        <span className="text-xs uppercase font-bold text-slate-500 ml-1 tracking-wider">Label</span>
                        <input
                          type="text"
                          placeholder="e.g. My Personal Key"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          className="w-full bg-[#030508] text-cyan-50 rounded-xl p-4 border border-white/10 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] text-base transition-all placeholder:text-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs uppercase font-bold text-slate-500 ml-1 tracking-wider">API Key</span>
                        <input
                          type="password"
                          placeholder="gsk_..."
                          value={newKeyValue}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          className="w-full bg-[#030508] text-cyan-50 rounded-xl p-4 border border-white/10 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] font-mono text-base transition-all placeholder:text-slate-700"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddKey}
                      disabled={isSignedIn && (!newKeyValue.trim() || apiKeysStatus === 'Saving...')}
                      className="w-full py-5 rounded-xl font-bold text-base text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 group relative overflow-hidden"
                      style={{ 
                        background: "linear-gradient(135deg, #00d4ff, #0066ff)",
                        boxShadow: "0 6px 25px rgba(0,212,255,0.3)"
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {apiKeysStatus === 'Saving...' ? 'Encrypting...' : (isSignedIn ? 'Add to Secure Wallet' : 'Sign In to Save')}
                        {isSignedIn ? <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </button>
                    
                    {apiKeysStatus && apiKeysStatus !== 'Saving...' && (
                      <p className={`mt-4 text-xs font-bold text-center ${apiKeysStatus.includes('Error') || apiKeysStatus.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {apiKeysStatus}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </section>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-5"
            >
              <motion.button
                onClick={handleStartInterview}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="group w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-lg text-white relative overflow-hidden transition-shadow duration-500"
                style={{
                  background: "linear-gradient(135deg, #00d4ff, #0066ff)",
                  boxShadow: "0 0 30px rgba(0,212,255,0.3), 0 0 60px rgba(0,212,255,0.1)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-3 font-display">
                  Start Interviewing
                  <ArrowRight className="group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0066ff] to-[#a855f7] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>

              <motion.button
                onClick={() => navigate("/feed")}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl font-semibold text-slate-300 hover:bg-white/10 hover:text-white hover:border-[#00d4ff]/30 transition-all duration-300 flex items-center justify-center gap-3 group font-display"
              >
                <BrainCircuit className="w-5 h-5 text-slate-400 group-hover:text-[#00d4ff] transition-colors duration-300" />
                View Dashboard
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030508] to-transparent pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════════════
          CHROME EXTENSION INSTALLATION
      ═══════════════════════════════════════════════ */}
      <section className="container mx-auto px-6 max-w-5xl relative z-10 mb-32 border-t border-white/5 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-6">
            <Chrome className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Beta Feature</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Get the <span className="text-[#00d4ff]">Extension</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Install our Chrome extension to analyze articles and coding problems directly in your browser.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Illustration/Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Puzzle className="w-40 h-40 text-cyan-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-4">Why use the extension?</h3>
              <ul className="space-y-4">
                {[
                  "Scan coding problems on LeetCode/GFG",
                  "Summarize and extract questions from articles",
                  "Directly launch interviews from any tab",
                  "Automatic context syncing with your dashboard"
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
                <strong>Note:</strong> We are currently in manual distribution while we prepare for the Chrome Web Store.
              </div>
            </div>
          </motion.div>

          {/* Right: Steps */}
          <div className="space-y-6">
            {[
              {
                icon: Download,
                title: "Download & Extract",
                text: (
                  <div className="flex flex-col gap-2">
                    <span>Download our extension .zip file and extract it to find the '.output' folder.</span>
                    <a 
                      href="/chrome-mv3.zip" 
                      download 
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold w-fit hover:bg-cyan-500/20 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Download .zip
                    </a>
                  </div>
                )
              },
              {
                icon: Settings,
                title: "Enable Developer Mode",
                text: "Open 'chrome://extensions/' in Chrome and toggle 'Developer mode' in the top-right corner."
              },
              {
                icon: FolderOpen,
                title: "Load Unpacked",
                text: "Click 'Load unpacked' and select the '.output' folder from your extraction."
              },
              {
                icon: Chrome,
                title: "Ready to Use",
                text: "The CrackIt icon will now appear in your extensions. Pin it for quick access!"
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 group"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/40 group-hover:bg-cyan-500/5 transition-all">
                  <step.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1 font-display tracking-tight">{step.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════ */}
      <section className="container mx-auto px-6 max-w-5xl relative z-10 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            How It <span className="text-[#a855f7]">Works</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Three simple steps to interview mastery.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[60px] left-[16.67%] right-[16.67%] h-[1px]">
            <motion.div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(90deg, #00d4ff, #a855f7, #f59e0b)",
                opacity: 0.3,
              }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5 }}
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.2 }}
              className="flex flex-col items-center text-center relative"
            >
              {/* Step circle */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-[120px] h-[120px] rounded-full flex items-center justify-center mb-8 relative"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255,255,255,0.04) 0%, transparent 70%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Outer glow ring */}
                <div
                  className={`absolute inset-[-2px] rounded-full bg-gradient-to-br ${step.color} opacity-20 blur-sm`}
                />
                <div className="relative flex flex-col items-center">
                  <step.icon className="w-8 h-8 text-white/80 mb-1" />
                  <span className="text-xs font-bold text-white/40 tracking-widest font-display">
                    {step.number}
                  </span>
                </div>
              </motion.div>

              {/* Text */}
              <h3 className="text-xl font-bold text-white mb-3 font-display tracking-tight">
                {step.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[260px] font-body">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>



      {/* Redundant CTA BANNER removed */}

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-6 md:mb-0">
            <div
              className="p-2 rounded-lg"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0066ff)",
                boxShadow: "0 0 15px rgba(0,212,255,0.4)",
              }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-white tracking-wider text-base font-display">
              CRACKIT AI
            </span>
          </div>
          <p className="font-medium text-slate-600 tracking-wide text-sm font-body">
            © {new Date().getFullYear()} CrackIt Infrastructure. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;