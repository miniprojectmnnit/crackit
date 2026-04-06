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
import { ProtectedRoute } from "./components/ProtectedRoute";
import { KeyProtectedRoute } from "./components/KeyProtectedRoute";
import { ApiKeyProvider } from "./auth/ApiKeyContext";
import SignInPage from "./auth/SignInPage";
import SignUpPage from "./auth/SignUpPage";
import FeedbackPage from "./pages/FeedbackPage";
import ExtensionAuth from "./pages/ExtensionAuth";

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ApiKeyProvider>
        <div className="relative min-h-screen flex flex-col bg-[#030303] text-zinc-50 font-sans selection:bg-cyan-500/30">
        {/* Animated Background Mesh Settings */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-cyan-900/10 via-emerald-900/5 to-transparent pointer-events-none" />

        <Navbar />

        <main className="flex-1 w-full flex flex-col relative z-10">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* Protected Routes */}
            <Route path="/interviewsimulation" element={<ProtectedRoute><InterviewSimulation /></ProtectedRoute>} />
            <Route path="/interview-room/:sessionId" element={<ProtectedRoute><KeyProtectedRoute><InterviewRoom /></KeyProtectedRoute></ProtectedRoute>} />
            <Route path="/resume-upload" element={<ProtectedRoute><KeyProtectedRoute><ResumeUpload /></KeyProtectedRoute></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />
            <Route path="/report/:sessionId" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />
            <Route path="/interview-report/:sessionId" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />

            {/* Feedback Page */}
            <Route path="/feedback" element={<FeedbackPage />} />

            {/* Extension Auth Bridge */}
            <Route path="/extension-auth" element={<ProtectedRoute><ExtensionAuth /></ProtectedRoute>} />

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
     </ApiKeyProvider>
    </ThemeProvider>
  );
};

export default App;