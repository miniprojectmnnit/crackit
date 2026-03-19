import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Code, Users, ChevronRight, Sparkles, BrainCircuit, Target } from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    const handleCardClick = (route) => {
        navigate(route);
    };

    const cards = [
        {
            id: "resume",
            title: "Resume Mock Interview",
            description: "Upload your resume and practice a personalized, AI-driven mock interview tailored to your skills.",
            icon: <FileText className="h-7 w-7" />,
            route: "/resume-upload",
            delay: 0.1
        },
        {
            id: "coding",
            title: "Coding Extension",
            description: "Use our Chrome extension to seamlessly extract coding questions from any platform and simulate real technical rounds.",
            icon: <Code className="h-7 w-7" />,
            route: "/", 
            delay: 0.2
        },
        {
            id: "feed",
            title: "Interview History",
            description: "Track your progress. Review full transcripts, AI feedback, and scores from all your past interviews.",
            icon: <Users className="h-7 w-7" />,
            route: "/feed",
            delay: 0.3
        },
    ];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div className="w-full relative pb-20">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden">
                {/* Floating Elements */}
                <motion.div 
                    animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }} 
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"
                />
                <motion.div 
                    animate={{ y: [0, 30, 0], opacity: [0.2, 0.5, 0.2] }} 
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
                />

                <div className="container mx-auto max-w-5xl text-center relative z-10">
                    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border-cyan-500/30">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-cyan-50">AI-Powered Interview Prep</span>
                        </motion.div>
                        
                        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                            Ace Your Next Interview <br className="hidden md:block" />
                            <span className="text-gradient text-glow">Step by Step</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                            Master every stage of the interview process with tailored, real-time mock sessions.
                            From resume scanning to system design and behavioral analysis.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={() => navigate('/resume-upload')}
                                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-bold text-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all transform hover:scale-105"
                            >
                                Start Mock Interview
                            </button>
                            <button 
                              onClick={() => navigate('/feed')}
                              className="w-full sm:w-auto px-8 py-4 rounded-full glass font-medium text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <BrainCircuit className="w-5 h-5" /> View Progress
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features/Rounds Section */}
            <section className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: card.delay }}
                            className={`glass-card rounded-2xl p-8 cursor-pointer relative overflow-hidden group`}
                            onMouseEnter={() => setHoveredCard(card.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            onClick={() => handleCardClick(card.route)}
                        >
                            {/* Inner Glow Effect on Hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                                {card.icon}
                            </div>
                            
                            <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-cyan-300 transition-colors">
                                {card.title}
                            </h3>
                            
                            <p className="text-zinc-400 leading-relaxed mb-8">
                                {card.description}
                            </p>
                            
                            <div className="mt-auto flex items-center gap-2 text-cyan-400 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                Learn more <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-32 border-t border-white/5 pt-12 text-center text-zinc-500 text-sm">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <Target className="w-5 h-5 text-emerald-400" />
                        <span className="font-semibold text-zinc-300">CrackIt AI</span>
                    </div>
                    <p>© {new Date().getFullYear()} CrackIt. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;