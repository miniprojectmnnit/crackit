import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { MessageSquare } from "lucide-react";

/* ─── Stylish Nav Button with icon, glow & animated underline ─── */
const NavButton = ({ to, icon, label, active, glowColor }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group"
    >
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className={`
          relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          border transition-all duration-300 overflow-hidden cursor-pointer
          ${active
            ? `bg-white/[0.08] border-cyan-500/40 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]`
            : `bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12]`
          }
        `}
      >
        {/* Hover shimmer sweep */}
        <span
          className={`
            absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent
            transition-transform duration-500 ease-out
            ${hovered ? "translate-x-full" : "-translate-x-full"}
          `}
        />

        {/* Soft glow on hover */}
        {hovered && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute inset-0 rounded-xl blur-lg ${glowColor} pointer-events-none`}
          />
        )}

        {/* Icon */}
        <span className={`relative z-10 transition-colors duration-300 ${active ? "text-cyan-400" : "text-zinc-500 group-hover:text-cyan-400"}`}>
          {icon}
        </span>

        {/* Label */}
        <span className="relative z-10">{label}</span>

        {/* Active dot indicator */}
        {active && (
          <motion.span
            layoutId="activeNavDot"
            className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
          />
        )}
      </motion.div>
    </Link>
  );
};

const Navbar = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-500 ${
        scrolled
          ? "bg-[#030508]/90 backdrop-blur-2xl border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
          : "glass border-white/5 backdrop-blur-md"
      }`}
    >
      {/* Top accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo – PRESERVED: do NOT modify */}
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
        <nav className="flex items-center gap-3">
          <SignedIn>
            {/* ── Stylish Nav Buttons ── */}
            <NavButton
              to="/resume-upload"
              active={isActive("/resume-upload")}
              glowColor="bg-emerald-500/10"
              label="Resume Interview"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              }
            />

            <NavButton
              to="/feed"
              active={isActive("/feed")}
              glowColor="bg-violet-500/10"
              label="History"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />

            <NavButton
              to="/feedback"
              active={isActive("/feedback")}
              glowColor="bg-cyan-500/10"
              label="Feedback"
              icon={<MessageSquare className="w-4 h-4" />}
            />

            {/* Vertical separator */}
            <div className="w-[1px] h-7 bg-gradient-to-b from-transparent via-zinc-600/60 to-transparent mx-1" />

            {/* User avatar with glow ring */}
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <div className="ring-2 ring-cyan-500/20 hover:ring-cyan-400/40 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.1)] hover:shadow-[0_0_18px_rgba(6,182,212,0.25)]">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                    },
                  }}
                />
              </div>
            </motion.div>
          </SignedIn>

          <SignedOut>
            <NavButton
              to="/sign-in"
              active={isActive("/sign-in")}
              glowColor="bg-cyan-500/10"
              label="Sign In"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              }
            />
            <NavButton
              to="/feedback"
              active={isActive("/feedback")}
              glowColor="bg-cyan-500/10"
              label="Feedback"
              icon={<MessageSquare className="w-4 h-4" />}
            />
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
