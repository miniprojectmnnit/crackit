import React from "react";
import { motion } from "framer-motion";
import { Bug, Lightbulb, MessageSquare, Send, ShieldCheck, Mail } from "lucide-react";

const FeedbackPage = () => {
  const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLScF0DbYawQGv1v_z08mxA_EkgGNkuhN4BRWQSQhofM-VpdNJw/viewform?usp=sf_link";

  const feedbackOptions = [
    {
      title: "Report a Bug",
      description: "Found something that's not working? Let us know so we can fix it immediately.",
      icon: <Bug className="w-8 h-8 text-red-400" />,
      color: "from-red-500/10 to-orange-500/10",
      borderColor: "border-red-500/20",
      glowColor: "shadow-red-500/20",
    },
    {
      title: "Suggest a Feature",
      description: "Have an idea to make CrackIt even better? We'd love to hear your suggestions!",
      icon: <Lightbulb className="w-8 h-8 text-yellow-400" />,
      color: "from-yellow-500/10 to-amber-500/10",
      borderColor: "border-yellow-500/20",
      glowColor: "shadow-yellow-500/20",
    },
    {
      title: "General Feedback",
      description: "Just want to share your thoughts or say hi? We're all ears!",
      icon: <MessageSquare className="w-8 h-8 text-cyan-400" />,
      color: "from-cyan-500/10 to-blue-500/10",
      borderColor: "border-cyan-500/20",
      glowColor: "shadow-cyan-500/20",
    },
  ];

  const handleRedirect = () => {
    window.open(googleFormUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden bg-[#030303]">
      {/* Background Decor */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center mb-16 relative z-10"
      >
         <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6 inline-block"
        >
          Developer Support
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent tracking-tight">
          Shape the Future of <span className="text-cyan-400">CrackIt</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Your feedback directly impacts our roadmap. Select an option below to fill out our official feedback form.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full relative z-10">
        {feedbackOptions.map((option, index) => (
          <motion.div
            key={option.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={handleRedirect}
            className={`
              relative group p-8 rounded-[2rem] border ${option.borderColor}
              bg-[#0a0a0a]/60 backdrop-blur-xl cursor-pointer
              transition-all duration-500 flex flex-col items-center text-center
              hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${option.glowColor}
            `}
          >
            {/* Top glow line */}
            <div className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full`} />

            <div className={`
              mb-8 p-6 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 
              group-hover:scale-110 group-hover:bg-white/[0.06] transition-all duration-500
              flex items-center justify-center
            `}>
              {option.icon}
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
              {option.title}
            </h3>
            
            <p className="text-zinc-500 text-sm leading-relaxed mb-8 group-hover:text-zinc-400 transition-colors">
              {option.description}
            </p>

            <div className="mt-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] border border-white/5 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300 font-bold text-sm text-zinc-300">
              <span>Open Form</span>
              <Send className="w-3.5 h-3.5" />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 flex items-center gap-8 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md relative z-10"
      >
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
          <span>Verified Form</span>
        </div>
        <div className="w-[1px] h-4 bg-zinc-800" />
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Mail className="w-4 h-4 text-cyan-500/60" />
          <span>Active Monitoring</span>
        </div>
      </motion.div>
    </div>
  );
};

export default FeedbackPage;
