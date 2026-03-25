import React from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";
import { InterviewSimulation, InterviewHistory } from "./pages";
import ResumeUpload from "./pages/ResumeUpload/ResumeUpload";
import InterviewReport from "./pages/Report/InterviewReport";
import InterviewRoom from "./pages/InterviewRoom/InterviewRoom";

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="relative min-h-screen flex flex-col bg-[#030303] text-zinc-50 font-sans selection:bg-cyan-500/30">
        {/* Animated Background Mesh Settings */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-cyan-900/10 via-emerald-900/5 to-transparent pointer-events-none" />

        <Navbar />

        <main className="flex-1 w-full flex flex-col relative z-10">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />

            {/* Protected Routes */}
            <Route path="/interviewsimulation" element={<InterviewSimulation />} />
            <Route path="/interview-room/:sessionId" element={<InterviewRoom />} />
            <Route path="/resume-upload" element={<ResumeUpload />} />
            <Route path="/feed" element={<InterviewHistory />} />
            <Route path="/report/:sessionId" element={<InterviewReport />} />
            <Route path="/interview-report/:sessionId" element={<InterviewReport />} />

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;