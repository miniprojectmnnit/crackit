import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]"
          >
            <span className="text-black font-bold text-xl leading-none">C</span>
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            CrackIt
          </span>
        </Link>

        {/* Navigation Links (if needed in the future) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/resume-upload" className="text-lg font-medium text-zinc-400 hover:text-white transition-colors">Resume Interview</Link>
          <Link to="/feed" className="text-lg font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1">History feed</Link>
        </nav>


      </div>
    </header>
  );
};

export default Navbar;
