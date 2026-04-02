import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthFetch } from "../auth/useAuthFetch";
import { useAuth } from "@clerk/clerk-react";
import {
  FileText,
  Users,
  Sparkles,
  BrainCircuit,
  Target,
  ArrowRight,
  Zap,
  Upload,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Trash2,
  Plus,
  Key
} from "lucide-react";
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
  
  const [keysList, setKeysList] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [apiKeysStatus, setApiKeysStatus] = useState('');

  const fetchKeys = async () => {
    try {
      const response = await authFetch('http://localhost:5000/api/settings/keys');
      if (response.ok) {
        const data = await response.json();
        setKeysList(data.keys || []);
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (!isSignedIn) return;
    fetchKeys();
  }, [isSignedIn, authFetch]);

  const handleAddKey = async () => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      setApiKeysStatus('Name and Key Value are required.');
      setTimeout(() => setApiKeysStatus(''), 4000);
      return;
    }
    
    setApiKeysStatus('Saving...');
    try {
      const response = await authFetch('http://localhost:5000/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), value: newKeyValue.trim() }),
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
      const response = await authFetch(`http://localhost:5000/api/settings/keys/${encodeURIComponent(name)}`, {
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
  const cards = [
    {
      id: "resume",
      title: "Simulate Interview",
      description:
        "Upload your resume and practice a personalized, AI-driven technical mock interview curated specifically to your exact profile and skills.",
      icon: <FileText className="h-8 w-8" />,
      route: "/resume-upload",
      delay: 0.1,
      gradient: "from-[#00d4ff] to-[#0066ff]",
      glowColor: "rgba(0, 212, 255, 0.4)",
      iconColor: "text-[#00d4ff]",
    },
    {
      id: "feed",
      title: "Performance History",
      description:
        "Track your progress. Review full conversational transcripts, AI feedback, score breakdowns, and growth analytics across all sessions.",
      icon: <Users className="h-8 w-8" />,
      route: "/feed",
      delay: 0.2,
      gradient: "from-[#a855f7] to-[#6d28d9]",
      glowColor: "rgba(168, 85, 247, 0.4)",
      iconColor: "text-[#a855f7]",
    },
  ];

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

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-5"
            >
              <motion.button
                onClick={() => navigate("/resume-upload")}
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
          API KEY CONFIGURATION
      ═══════════════════════════════════════════════ */}
      <section id="api-keys-section" className="container mx-auto px-6 max-w-5xl relative z-10 mb-32 mt-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-[#0f111a] p-8 md:p-12 rounded-3xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 to-[#a855f7]/5 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start">
            
            {/* Left: How to get a key */}
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 mb-6">
                 <Zap className="w-4 h-4 text-amber-400" />
                 <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">Pro Tip</span>
              </div>
              <h2 className="text-3xl font-extrabold font-display text-white tracking-tight mb-4">
                Bring Your Own <span className="text-[#00d4ff]">API Keys</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 font-body">
                Since CrackIt relies on powerful AI models with strict rate limits, you might occasionally face slowdowns or availability issues if our default quotas are exhausted. 
                You can prevent this by providing your own free Groq API keys to serve as a robust fallback queue.
              </p>
              
              <h3 className="text-lg font-bold text-white mb-3">How to Get a Free Groq API Key:</h3>
              <ol className="list-decimal pl-5 text-sm text-slate-400 space-y-3">
                <li>Go to the <a href="https://console.groq.com/" target="_blank" rel="noreferrer" className="text-[#00d4ff] hover:underline whitespace-nowrap font-medium">Groq Cloud Console</a>.</li>
                <li>Sign up or log in to your free account.</li>
                <li>Navigate to the <strong>API Keys</strong> section in the sidebar.</li>
                <li>Click <strong>Create API Key</strong>, give it a name, and copy the secret key.</li>
                <li>Paste it here! You can add multiple keys separated by commas or newlines.</li>
              </ol>
            </div>

            {/* Right: The Form */}
            <div className="md:w-1/2 flex flex-col w-full">
              <label className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                Your Secure Key Wallet <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">Zero-Knowledge Encrypted</span>
              </label>
              
              {/* Existing Keys List */}
              {isSignedIn && keysList.length > 0 && (
                <div className="flex flex-col gap-3 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {keysList.map((keyObj, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#0A0D14] border border-white/10 p-3 rounded-xl hover:border-cyan-500/30 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Key className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-200 truncate">{keyObj.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono tracking-widest">{keyObj.value}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteKey(keyObj.name)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Key Form */}
              <div className="flex flex-col gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Key Name (e.g. Personal Project)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={apiKeysStatus === 'Saving...'}
                  className="w-full bg-[#0A0D14] text-cyan-50 rounded-xl p-3 border border-white/10 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] text-sm shadow-inner"
                />
                <input
                  type="text"
                  placeholder="Secret Key (gsk_...)"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  disabled={apiKeysStatus === 'Saving...'}
                  className="w-full bg-[#0A0D14] text-cyan-50 rounded-xl p-3 border border-white/10 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] font-mono text-sm shadow-inner"
                />
              </div>

              <button
                onClick={handleAddKey}
                disabled={isSignedIn && (!newKeyName.trim() || !newKeyValue.trim() || apiKeysStatus === 'Saving...')}
                className="w-full px-8 py-4 rounded-xl font-bold text-base text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                style={{
                  background: "linear-gradient(135deg, #00d4ff, #0066ff)",
                  boxShadow: "0 0 20px rgba(0,212,255,0.2)",
                }}
              >
                {apiKeysStatus === 'Saving...' ? 'Saving...' : (isSignedIn ? 'Add to Secure Wallet' : 'Sign In to Save Keys')}
                {isSignedIn ? <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
              
              {apiKeysStatus && apiKeysStatus !== 'Saving...' && (
                <p className={`mt-4 text-sm font-medium text-center ${apiKeysStatus.includes('Error') || apiKeysStatus.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {apiKeysStatus}
                </p>
              )}
            </div>
            
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURE CARDS
      ═══════════════════════════════════════════════ */}
      <section className="container mx-auto px-6 max-w-5xl relative z-10 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Core <span className="text-[#00d4ff]">Modules</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Two powerful tools designed to transform your interview preparation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {cards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.7,
                delay: card.delay,
                ease: "easeOut",
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl relative overflow-hidden group cursor-pointer holographic-shimmer"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                transition: "box-shadow 0.5s ease, border-color 0.5s ease",
              }}
              onMouseEnter={(e) => {
                setHoveredCard(card.id);
                e.currentTarget.style.boxShadow = `0 0 60px -15px ${card.glowColor}`;
                e.currentTarget.style.borderColor = `${card.glowColor}`;
              }}
              onMouseLeave={(e) => {
                setHoveredCard(null);
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
              onClick={() => navigate(card.route)}
            >
              {/* Top accent line */}
              <div
                className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${card.gradient} opacity-40 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="bg-[#0A0D14]/80 h-full w-full p-10 md:p-12 relative overflow-hidden flex flex-col backdrop-blur-sm">
                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${card.iconColor} group-hover:scale-110 transition-all duration-500`}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow:
                      hoveredCard === card.id
                        ? `0 0 30px -5px ${card.glowColor}`
                        : "none",
                    transition: "box-shadow 0.5s ease, transform 0.5s ease",
                  }}
                >
                  {card.icon}
                </div>

                {/* Title */}
                <h3 className="text-3xl font-extrabold mb-4 text-white tracking-tight font-display group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300"
                  style={hoveredCard === card.id ? {
                    backgroundImage: `linear-gradient(135deg, white, ${card.glowColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  } : {}}
                >
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-lg leading-relaxed flex-1 font-body">
                  {card.description}
                </p>

                {/* Arrow */}
                <div
                  className={`mt-8 flex justify-end opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 ${card.iconColor}`}
                >
                  <div
                    className="p-3 rounded-full backdrop-blur-sm"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>

                {/* Corner glow */}
                <div
                  className={`absolute bottom-0 right-0 w-56 h-56 opacity-0 group-hover:opacity-15 blur-[80px] transition-opacity duration-700 pointer-events-none rounded-full bg-gradient-to-br ${card.gradient}`}
                />
              </div>
            </motion.div>
          ))}
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



      {/* ═══════════════════════════════════════════════
          CTA BANNER
      ═══════════════════════════════════════════════ */}
      <section className="container mx-auto px-6 max-w-5xl relative z-10 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(168,85,247,0.08) 50%, rgba(245,158,11,0.05) 100%)",
            }}
          />
          <div className="absolute inset-0 border border-white/8 rounded-3xl" />

          {/* Animated pulse */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 py-16 md:py-20 px-8 md:px-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <CheckCircle2 className="w-10 h-10 text-[#00d4ff] mx-auto mb-6 opacity-60" />
              <h2 className="text-3xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-5">
                Ready to <span className="text-[#00d4ff]">Crack</span> Your Next Interview?
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 font-body">
                Join thousands of engineers who landed their dream roles using AI-powered preparation.
              </p>
              <motion.button
                onClick={() => navigate("/resume-upload")}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="px-12 py-5 rounded-2xl font-bold text-lg text-white font-display relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, #00d4ff, #a855f7)",
                  boxShadow:
                    "0 0 40px rgba(0,212,255,0.3), 0 0 80px rgba(168,85,247,0.15)",
                }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  Begin Your Journey
                  <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7] to-[#f59e0b] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </section>

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