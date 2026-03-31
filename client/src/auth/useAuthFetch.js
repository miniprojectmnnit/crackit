import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

export const useAuthFetch = () => {
  const { getToken } = useAuth();

  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    // console.log("[AUTH] Frontend Token exists");
    
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    // Only set application/json if the body is NOT FormData
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      console.error("Unauthorized request");
    }

    return response;
  }, [getToken]);

  return authFetch;
};
