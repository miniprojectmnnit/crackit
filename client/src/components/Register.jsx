import { SignUp } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { Sparkles, Code } from "lucide-react";

export default function Register() {
    return (
        <div className="flex flex-1 w-full lg:min-h-[calc(100vh-4rem)] bg-[#030303]">
            {/* Left Side - Brand & Graphics */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-zinc-950/30 border-r border-white/5">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 via-[#030303] to-emerald-900/10 z-0" />
                
                {/* Floating animated orbs */}
                <motion.div 
                    animate={{ y: [0, 40, 0], opacity: [0.3, 0.6, 0.3] }} 
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
                />
                
                <div className="relative z-10 pt-8">
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                            Start your journey <br />
                            with <span className="text-gradient text-glow">CrackIt</span>
                        </h1>
                        <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
                            Join thousands of candidates who perfected their interview skills and landed their dream roles using our platform.
                        </p>
                    </motion.div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-4 mt-auto">
                    <div className="glass-card p-5 rounded-2xl">
                        <Code className="w-8 h-8 text-emerald-400 mb-3" />
                        <h3 className="text-lg text-white font-semibold mb-1">Technical Rounds</h3>
                        <p className="text-sm text-zinc-400">Master Data Structures and System Design.</p>
                    </div>
                    <div className="glass-card p-5 rounded-2xl">
                        <Sparkles className="w-8 h-8 text-cyan-400 mb-3" />
                        <h3 className="text-lg text-white font-semibold mb-1">Behavioral Scenarios</h3>
                        <p className="text-sm text-zinc-400">Ace leadership and culture-fit assessments.</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                {/* Mobile Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 to-transparent lg:hidden z-0 pointer-events-none" />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <span className="text-black font-bold text-2xl leading-none">C</span>
                        </div>
                    </div>
                    
                    <SignUp  
                        signInUrl="/login" 
                        forceRedirectUrl={'/dashboard'}
                        appearance={{
                            layout: {
                                socialButtonsPlacement: "bottom",
                            },
                            elements: {
                                rootBox: "w-full mx-auto",
                                card: "bg-zinc-900/60 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl w-full",
                                headerTitle: "text-2xl text-white font-bold",
                                headerSubtitle: "text-zinc-400",
                                socialButtonsBlockButton: "text-zinc-300 border-white/10 bg-white/5 hover:bg-white/10 transition-colors",
                                socialButtonsBlockButtonText: "text-white font-medium",
                                dividerLine: "bg-white/10",
                                dividerText: "text-zinc-500",
                                formFieldLabel: "text-zinc-300",
                                formFieldInput: "bg-zinc-950/50 border-white/10 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600",
                                formButtonPrimary: "bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-bold hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all",
                                footerActionText: "text-zinc-400",
                                footerActionLink: "text-cyan-400 hover:text-cyan-300",
                            }
                        }}
                    />
                </motion.div>
            </div>
        </div>
    )
}