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
          <Link to="/resume-upload" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Resume Interview</Link>
          <Link to="/feed" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1">History feed</Link>
        </nav>

        {/* User / Auth section */}
        <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-4 py-2">
              Login
            </Link>
            <Link 
              to="/register" 
              className="text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors px-4 py-2 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              Get Started
            </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
