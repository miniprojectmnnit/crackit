import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useAuthFetch } from "./useAuthFetch";
import { API_BASE_URL } from "../config";

const ApiKeyContext = createContext();

export const ApiKeyProvider = ({ children }) => {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const authFetch = useAuthFetch();
  const [keysList, setKeysList] = useState([]);
  const [isKeysLoading, setIsKeysLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    if (!isSignedIn) {
      console.log("[ApiKeyContext] 🔍 Skip fetch: Not Signed In");
      setKeysList([]);
      setIsKeysLoading(false);
      return;
    }

    try {
      console.log("[ApiKeyContext] 📡 Fetching Keys...");
      setIsKeysLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/settings/keys`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[ApiKeyContext] ✅ Keys loaded: ${data.keys?.length || 0}`);
        setKeysList(data.keys || []);
      } else {
        console.warn(`[ApiKeyContext] ⚠️ Failed to load keys: ${response.status}`);
      }
    } catch (error) {
      console.error("[ApiKeyContext] ❌ Error fetching API keys:", error);
    } finally {
      setIsKeysLoading(false);
    }
  }, [isSignedIn, authFetch]);

  useEffect(() => {
    console.log(`[ApiKeyContext] 🔄 State update: isAuthLoaded=${isAuthLoaded}, isSignedIn=${isSignedIn}`);
    
    if (!isAuthLoaded) return;

    if (!isSignedIn) {
      // Small safety: if auth is loaded and not signed in, set keys loading to false
      setIsKeysLoading(false);
      return;
    }

    fetchKeys();
  }, [isAuthLoaded, isSignedIn, fetchKeys]);

  const hasKeys = keysList.length > 0;
  const isLoading = !isAuthLoaded || isKeysLoading;

  // Debug log final state for this render cycle
  // console.log(`[ApiKeyContext] Render: isLoading=${isLoading}, hasKeys=${hasKeys}`);

  return (
    <ApiKeyContext.Provider value={{ keysList, hasKeys, isLoading, fetchKeys }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error("useApiKey must be used within an ApiKeyProvider");
  }
  return context;
};
