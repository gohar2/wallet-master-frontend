// @/contexts/auth-context.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { apiRequest, resetAuthErrorHandling } from "@/lib/queryClient";
import { googleAuth } from "@/lib/google-auth";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHandlingAuthError, setIsHandlingAuthError] = useState(false);
  const authErrorHandledRef = useRef(false);

  useEffect(() => {
    // Check for existing auth state in localStorage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("user");
      }
    }

    // Validate cookie-based session with the server
    (async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/validate");
        const data = response.data;
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (e) {
        // Network or 401/403 cause apiRequest to throw
        setUser(null);
        localStorage.removeItem("user");
        console.warn("Auth validate failed:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (accessToken, idToken) => {
    setIsLoading(true);
    try {
      // Reset auth error handling flags on successful login
      resetAuthErrorHandling();
      setIsHandlingAuthError(false);
      authErrorHandledRef.current = false;

      // Prepare the request payload
      const requestData = {
        access_token: accessToken,
      };

      // Include ID token if available
      if (idToken) {
        requestData.id_token = idToken;
      }

      const response = await apiRequest(
        "POST",
        "/api/auth/google",
        requestData
      );

      const userData = response.data;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Login error:", error);

      // Enhanced error handling with more specific messages
      let enhancedError = error;

      if (error.message) {
        // Handle network/fetch errors
        if (
          error.message.includes("fetch") ||
          error.message.includes("NetworkError")
        ) {
          enhancedError = new Error(
            "Unable to connect to our servers. Please check your internet connection and try again."
          );
        }
        // Handle CORS errors
        else if (error.message.includes("CORS")) {
          enhancedError = new Error(
            "Connection error. Please try refreshing the page and signing in again."
          );
        }
        // Handle timeout errors
        else if (error.message.includes("timeout")) {
          enhancedError = new Error(
            "Request timed out. Please check your connection and try again."
          );
        }
        // Handle HTTP error responses
        else if (error.message.includes("HTTP")) {
          try {
            // Extract status code from error message
            const statusMatch = error.message.match(/HTTP (\d+)/);
            const status = statusMatch ? parseInt(statusMatch[1]) : null;

            switch (status) {
              case 400:
                enhancedError = new Error(
                  "Invalid request data. Please try signing in again."
                );
                break;
              case 401:
                enhancedError = new Error(
                  "Invalid or expired Google token. Please sign in to Google again."
                );
                break;
              case 403:
                enhancedError = new Error(
                  "Access denied by Google. Please check your account permissions and try again."
                );
                break;
              case 404:
                enhancedError = new Error(
                  "Authentication service not found. Please contact support."
                );
                break;
              case 429:
                enhancedError = new Error(
                  "Too many login attempts. Please wait a moment and try again."
                );
                break;
              case 500:
              case 502:
              case 503:
              case 504:
                enhancedError = new Error(
                  "Our service is temporarily unavailable. Please try again in a few minutes."
                );
                break;
              default:
                // Try to extract error message from response body
                if (error.response && error.response.message) {
                  enhancedError = new Error(error.response.message);
                } else {
                  enhancedError = new Error(
                    "Authentication failed. Please try again."
                  );
                }
            }
          } catch (parseError) {
            enhancedError = new Error(
              "Authentication failed. Please try again."
            );
          }
        }
        // Handle specific backend error messages
        else if (error.message.includes("Invalid or expired Google token")) {
          enhancedError = new Error(
            "Your Google session has expired. Please sign in to Google again."
          );
        } else if (error.message.includes("Access denied by Google")) {
          enhancedError = new Error(
            "Google has denied access. Please check your account permissions and try again."
          );
        } else if (
          error.message.includes("Google authentication service error")
        ) {
          enhancedError = new Error(
            "Google's authentication service is experiencing issues. Please try again later."
          );
        } else if (error.message.includes("Database error")) {
          enhancedError = new Error(
            "Our service is temporarily unavailable. Please try again in a few minutes."
          );
        } else if (error.message.includes("Google Client ID not configured")) {
          enhancedError = new Error(
            "Google authentication is not properly configured. Please contact support."
          );
        }
      }

      throw enhancedError;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserWallet = async (walletAddress) => {
    if (!user) throw new Error("No user logged in");

    // Prevent recursive calls if we're already handling an auth error
    if (isHandlingAuthError || authErrorHandledRef.current) {
      throw new Error(
        "Authentication error being handled. Please log in again."
      );
    }

    try {
      const response = await apiRequest(
        "PATCH",
        `/api/users/${user.id}/wallet`,
        {
          walletAddress,
        }
      );

      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error("Update wallet error:", error);

      // Enhanced error handling for wallet updates
      if (error.message.includes("HTTP 404")) {
        throw new Error("User not found. Please log in again.");
      } else if (error.message.includes("HTTP 400")) {
        throw new Error("Invalid wallet address. Please check and try again.");
      } else if (error.message.includes("HTTP 401")) {
        // Set flag to prevent recursive calls
        setIsHandlingAuthError(true);
        authErrorHandledRef.current = true;

        // Clear user data and redirect to login
        setUser(null);
        localStorage.removeItem("user");

        // Show user-friendly message and redirect
        console.warn("Session expired. Redirecting to login...");

        // Use setTimeout to ensure state updates are processed before redirect
        setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }, 100);

        throw new Error("Session expired. Please log in again.");
      } else if (error.message.includes("HTTP 403")) {
        throw new Error("You don't have permission to update this wallet.");
      } else if (
        error.message.includes("fetch") ||
        error.message.includes("NetworkError")
      ) {
        throw new Error(
          "Connection error. Please check your internet and try again."
        );
      } else {
        throw new Error("Failed to update wallet. Please try again.");
      }
    }
  };

  // Check if user session is still valid
  const validateSession = async () => {
    if (!user) return false;

    // Prevent recursive calls if we're already handling an auth error
    if (isHandlingAuthError || authErrorHandledRef.current) {
      return false;
    }

    try {
      await apiRequest("GET", "/api/auth/validate");
      return true;
    } catch (error) {
      console.warn("Session validation failed:", error);
      // If validation fails, clear user data
      await logout();
      return false;
    }
  };

  // Refresh user data from server
  const refreshUser = async () => {
    // Prevent recursive calls if we're already handling an auth error
    if (isHandlingAuthError || authErrorHandledRef.current) {
      throw new Error(
        "Authentication error being handled. Please log in again."
      );
    }

    try {
      const response = await apiRequest("GET", `/api/auth/me`);
      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      if (error.message.includes("HTTP 401")) {
        // Set flag to prevent recursive calls
        setIsHandlingAuthError(true);
        authErrorHandledRef.current = true;
        await logout();
      }
      throw error;
    }
  };

  const logout = async () => {
    // Revoke Google token if possible and clear all local storage
    try {
      googleAuth.signOut();
    } catch (e) {
      console.warn("googleAuth signOut failed:", e);
    }

    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (e) {
      console.warn("Server logout failed:", e);
    }

    setUser(null);
    setIsHandlingAuthError(false);
    authErrorHandledRef.current = false;
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("localStorage.clear failed:", e);
    }

    // Optional: Redirect to home page after logout
    // window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUserWallet,
        validateSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
