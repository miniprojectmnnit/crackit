import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Sparkles, BrainCircuit, Target, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    const handleCardClick = (route) => {
        navigate(route);
    };

    // Removed the "Coding Extension" card, keeping the two functional features.
    const cards = [
        {
            id: "resume",
            title: "Simulate Interview",
            description: "Upload your resume and practice a personalized, AI-driven technical mock interview curated specifically to your exact profile and skills.",
            icon: <FileText className="h-8 w-8" />,
            route: "/resume-upload",
            delay: 0.1,
            color: "from-blue-500 to-indigo-600",
            hoverGlow: "group-hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]",
            iconColor: "text-indigo-400"
        },
        {
            id: "feed",
            title: "Performance History",
            description: "Track your progress. Review full conversational transcripts, AI feedback, score breakdowns, and growth analytics across all sessions.",
            icon: <Users className="h-8 w-8" />,
            route: "/feed",
            delay: 0.2,
            color: "from-emerald-400 to-cyan-500",
            hoverGlow: "group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]",
            iconColor: "text-emerald-400"
        },
    ];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <div className="w-full relative pb-20 bg-[#030508] text-slate-200 overflow-hidden font-sans min-h-screen">
            {/* Massive Background Glow Entities */}
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15], rotate: [0, 90, 0] }} 
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none"
            />
            <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} 
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[10%] right-[-5%] w-[40vw] h-[40vw] bg-cyan-600/20 rounded-full blur-[150px] pointer-events-none"
            />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 md:pt-48 md:pb-36 px-6">
                <div className="container mx-auto max-w-5xl text-center relative z-10">
                    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                        
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-10 shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-md">
                            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                            <span className="text-sm font-semibold tracking-wide text-indigo-200 uppercase">State-of-the-Art Mock Interviews</span>
                        </motion.div>
                        
                        <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
                            Ace Your Next Interview <br className="hidden md:block" />
                            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">Without the Stress</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto mb-14 leading-relaxed font-light">
                            Master every stage of the technical interview process with dynamic, real-time AI simulations that adapt to your resume and career goals.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button 
                                onClick={() => navigate('/resume-upload')}
                                className="group w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                   Start Interviewing <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </button>
                            <button 
                                onClick={() => navigate('/feed')}
                                className="w-full sm:w-auto px-10 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all content-center flex items-center justify-center gap-3 group"
                            >
                                <BrainCircuit className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" /> View Dashboard
                            </button>
                        </motion.div>

                    </motion.div>
                </div>
            </section>

            {/* Features Section - Transformed to a beautiful 2-column layout */}
            <section className="container mx-auto px-6 max-w-5xl relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {cards.map((card) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.7, delay: card.delay, ease: "easeOut" }}
                            className={`rounded-3xl p-1 relative overflow-hidden group cursor-pointer bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-xl ${card.hoverGlow} transition-all duration-500 transform hover:-translate-y-2`}
                            onMouseEnter={() => setHoveredCard(card.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            onClick={() => handleCardClick(card.route)}
                        >
                            {/* Inner Card Content */}
                            <div className="bg-[#0A0D14]/90 h-full w-full rounded-[23px] p-10 relative overflow-hidden flex flex-col">
                                {/* Top Gradient Bleed */}
                                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${card.color} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />
                                
                                <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/5 shadow-inner flex flex-shrink-0 items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 ${card.iconColor}`}>
                                    {card.icon}
                                </div>
                                
                                <h3 className="text-3xl font-extrabold mb-4 text-white group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 group-hover:bg-clip-text transition-all tracking-tight">
                                    {card.title}
                                </h3>
                                
                                <p className="text-slate-400 text-lg leading-relaxed flex-1">
                                    {card.description}
                                </p>
                                
                                {/* Removed the arbitrary Learn More button link for an integrated invisible arrow */}
                                <div className={`mt-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300 ${card.iconColor}`}>
                                    <div className="p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                                      <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Ambient Background Glow */}
                                <div className={`absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 blur-[60px] transition-opacity duration-700 pointer-events-none rounded-full`} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-40 border-t border-white/5 pt-12 pb-12 text-center text-slate-500 text-sm relative z-10">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center gap-3 mb-6 md:mb-0">
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                           <Target className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-200 tracking-wider text-base">CRACKIT AI</span>
                    </div>
                    <p className="font-medium text-slate-500 tracking-wide">© {new Date().getFullYear()} CrackIt Infrastructure. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;