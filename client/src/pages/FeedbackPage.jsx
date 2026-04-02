import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Bug, Lightbulb, ArrowRight, MessageSquare, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";

const FeedbackPage = () => {
  const developerEmail = "ddk04112002@gmail.com";
  const [copied, setCopied] = useState(false);

  const feedbackOptions = [
    {
      title: "Report a Bug",
      description: "Found something that's not working? Let us know so we can fix it immediately.",
      icon: <Bug className="w-6 h-6 text-red-400" />,
      subject: "[CrackIt Bug Report]",
      body: "Please describe the bug:\n\nSteps to reproduce:\n1. \n2. \n\nExpected behavior:\n\nActual behavior:\n\n(Generated from CrackIt Feedback Page)",
      color: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/30",
    },
    {
      title: "Suggest a Feature",
      description: "Have an idea to make CrackIt even better? We'd love to hear your suggestions!",
      icon: <Lightbulb className="w-6 h-6 text-yellow-400" />,
      subject: "[CrackIt Feature Request]",
      body: "Describe your feature idea:\n\nHow would this help you?\n\n(Generated from CrackIt Feedback Page)",
      color: "from-yellow-500/20 to-amber-500/20",
      borderColor: "border-yellow-500/30",
    },
    {
      title: "General Feedback",
      description: "Just want to share your thoughts or say hi? We're all ears!",
      icon: <MessageSquare className="w-6 h-6 text-cyan-400" />,
      subject: "[CrackIt General Feedback]",
      body: "Your feedback:\n\n(Generated from CrackIt Feedback Page)",
      color: "from-cyan-500/20 to-blue-500/20",
      borderColor: "border-cyan-500/30",
    },
  ];

  const copyEmail = () => {
    navigator.clipboard.writeText(developerEmail);
    setCopied(true);
    toast.success("Email address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center mb-16 relative z-10"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Help Us Build the <span className="text-cyan-400">Future</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Your feedback is the fuel that drives CrackIt forward. Whether it's a bug, a feature request, or just a quick thought—we're listening.
        </p>

        {/* Email Copy Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3 backdrop-blur-md">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-300 font-mono text-sm">{developerEmail}</span>
            <button 
              onClick={copyEmail}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-500 hover:text-cyan-400"
              title="Copy Email"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full relative z-10">
        {feedbackOptions.map((option, index) => (
          <motion.div
            key={option.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`
              relative group p-8 rounded-3xl border ${option.borderColor}
              bg-gradient-to-br ${option.color} backdrop-blur-sm
              transition-all duration-300 flex flex-col items-start text-left
            `}
          >
            <div className="mb-6 p-4 rounded-2xl bg-black/40 ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
              {option.icon}
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
              {option.title}
            </h3>
            
            <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-grow">
              {option.description}
            </p>

            <a
              href={`mailto:${developerEmail}?subject=${encodeURIComponent(option.subject)}&body=${encodeURIComponent(option.body)}`}
              className="w-full flex items-center justify-between px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/5"
            >
              <span>Send Email</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
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
          <span>Direct Contact</span>
        </div>
        <div className="w-[1px] h-4 bg-zinc-800" />
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Mail className="w-4 h-4 text-cyan-500/60" />
          <span>Fast Responses</span>
        </div>
      </motion.div>
    </div>
  );
};

export default FeedbackPage;
