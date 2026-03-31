import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5 backdrop-blur-md">
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

        {/* Navigation Links */}
        <nav className="flex items-center gap-8">
          <SignedIn>
            <Link to="/resume-upload" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Resume Interview</Link>
            <Link to="/feed" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">History</Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link to="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Sign In</Link>
            <Link 
              to="/sign-up" 
              className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:from-emerald-500/30 hover:to-cyan-500/30 transition-all"
            >
              Get Started
            </Link>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
