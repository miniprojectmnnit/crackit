import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApiKey } from "../auth/ApiKeyContext";
import { motion } from "framer-motion";
import { Key } from "lucide-react";

export const KeyProtectedRoute = ({ children }) => {
  const { hasKeys, isLoading } = useApiKey();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="p-4 bg-cyan-500/10 rounded-full border border-cyan-500/20"
        >
          <Key className="w-8 h-8 text-cyan-400" />
        </motion.div>
        <p className="text-slate-400 font-medium animate-pulse">Verifying API Credentials...</p>
      </div>
    );
  }

  // If no keys, redirect to home with a prompt parameter
  if (!hasKeys) {
    return <Navigate to="/?showKeyPrompt=true" state={{ from: location }} replace />;
  }

  return children;
};
