import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useAuthFetch } from "./useAuthFetch";
import { API_BASE_URL } from "../config";

const ApiKeyContext = createContext();

export const ApiKeyProvider = ({ children }) => {
  const { isSignedIn } = useAuth();
  const authFetch = useAuthFetch();
  const [keysList, setKeysList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    if (!isSignedIn) {
      setKeysList([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/settings/keys`);
      if (response.ok) {
        const data = await response.json();
        setKeysList(data.keys || []);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, authFetch]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const hasKeys = keysList.length > 0;

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
