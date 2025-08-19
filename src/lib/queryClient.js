import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// Fixed API URL configuration for both localhost and 127.0.0.1
const getApiUrl = () => {
  // In development, use the proxy (recommended to avoid CORS issues)
  if (import.meta.env.DEV) {
    // Empty string uses the same origin, handled by Vite proxy
    return "";
  }

  // In production or if you need direct calls
  return import.meta.env.VITE_API_URL || "http://localhost:3001";
};

const API_BASE_URL = getApiUrl();

// Enhanced error class for better error handling
export class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

export async function apiRequest(method, url, data = null, options = {}) {
  // Merge default config with custom options
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // CRITICAL: Always include credentials for sessions
    ...options,
  };

  // Add data to request body if provided
  if (data) {
    config.body = JSON.stringify(data);
  }

  // Handle special cases for different request types
  if (options.isFormData) {
    // Remove Content-Type header for FormData (browser will set it with boundary)
    delete config.headers["Content-Type"];
    config.body = data; // data should be FormData object
  }

  // Build full URL - handle both proxy and direct calls
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  console.log(`🔄 API Request: ${method} ${fullUrl}`, {
    credentials: config.credentials,
    origin: window.location.origin,
    hasData: !!data,
  });

  try {
    const response = await fetch(fullUrl, config);

    console.log(`✅ API Response: ${response.status} ${response.statusText}`, {
      url: fullUrl,
      hasCookies: !!document.cookie,
    });

    // Handle different response types
    let responseData;
    const contentType = response.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (parseError) {
      // If response parsing fails, create a generic error data object
      responseData = {
        message: `Failed to parse response: ${parseError.message}`,
        status: response.status,
        statusText: response.statusText,
      };
    }

    if (!response.ok) {
      // Enhanced error logging for debugging
      console.error(`❌ API Error: ${response.status}`, {
        url: fullUrl,
        method,
        status: response.status,
        responseData,
        origin: window.location.origin,
      });

      // Create detailed error message
      const errorMessage =
        responseData?.message ||
        responseData?.error ||
        `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, responseData);
    }

    // Return the response object with additional methods for flexibility
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      // Convenience method to get data directly
      json: () => responseData,
    };
  } catch (error) {
    // Enhanced error logging
    console.error(`💥 API Request Failed:`, {
      url: fullUrl,
      method,
      error: error.message,
      type: error.name,
      origin: window.location.origin,
    });

    // Handle network errors and other fetch failures
    if (error instanceof ApiError) {
      throw error; // Re-throw API errors as-is
    }

    // Handle CORS errors specifically
    if (
      error.name === "TypeError" &&
      (error.message.includes("fetch") ||
        error.message.includes("CORS") ||
        error.message.includes("Failed to fetch"))
    ) {
      const corsError = new ApiError(
        `Network/CORS error: Unable to connect to the server. Please check your connection and CORS configuration. Origin: ${window.location.origin}`,
        0,
        {
          originalError: error.message,
          origin: window.location.origin,
          targetUrl: fullUrl,
          advice: "If using 127.0.0.1, try localhost instead, or vice versa",
        }
      );

      throw corsError;
    }

    // Handle other errors
    throw new ApiError(`Request failed: ${error.message}`, 0, {
      originalError: error.message,
      origin: window.location.origin,
    });
  }
}

// Convenience methods for different HTTP verbs
export const api = {
  get: (url, options = {}) => apiRequest("GET", url, null, options),
  post: (url, data, options = {}) => apiRequest("POST", url, data, options),
  put: (url, data, options = {}) => apiRequest("PUT", url, data, options),
  patch: (url, data, options = {}) => apiRequest("PATCH", url, data, options),
  delete: (url, options = {}) => apiRequest("DELETE", url, null, options),
};

// Enhanced default fetcher for React Query with better error handling
queryClient.setQueryDefaults(["default"], {
  queryFn: async ({ queryKey, signal }) => {
    const [url, params] = queryKey;

    // Add query parameters if provided
    const urlWithParams = params
      ? `${url}?${new URLSearchParams(params).toString()}`
      : url;

    const response = await apiRequest("GET", urlWithParams, null, {
      signal, // Support for query cancellation
    });

    return response.data;
  },
});

// Helper function for mutations
export function createMutation(mutationFn, options = {}) {
  return {
    mutationFn,
    onError: (error) => {
      console.error("Mutation error:", error);

      // Enhanced error handling with debugging info
      if (error.status === 401) {
        console.warn("🔒 Unauthorized access - session may have expired", {
          origin: window.location.origin,
          cookies: document.cookie ? "present" : "missing",
        });

        // Handle unauthorized - redirect to login
        handleAuthError(error);
      } else if (error.status === 403) {
        console.warn("🚫 Access forbidden - CORS or permissions issue", {
          origin: window.location.origin,
          error: error.response,
        });
      } else if (error.status >= 500) {
        console.error("🔥 Server error occurred", {
          status: error.status,
          message: error.message,
        });
      } else if (error.status === 0) {
        console.error("🌐 Network/CORS error - check server and CORS config", {
          origin: window.location.origin,
          advice: error.response?.advice,
        });
      }

      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error);
      }
    },
    ...options,
  };
}

// Example usage functions for your auth endpoints
export const authApi = {
  // Google login with enhanced error handling
  googleLogin: (googleData) => {
    console.log("🔐 Attempting Google login", {
      hasAccessToken: !!googleData.access_token,
      hasIdToken: !!googleData.id_token,
      origin: window.location.origin,
    });
    return api.post("/api/auth/google", googleData);
  },

  // Session validation
  validateSession: () => {
    console.log("🔍 Validating session", {
      origin: window.location.origin,
      cookies: document.cookie ? "present" : "missing",
    });
    return api.get("/api/auth/validate");
  },

  // Logout
  logout: () => {
    console.log("👋 Logging out", {
      origin: window.location.origin,
    });
    return api.post("/api/auth/logout");
  },

  // Get current user
  getCurrentUser: () => {
    console.log("👤 Getting current user", {
      origin: window.location.origin,
      cookies: document.cookie ? "present" : "missing",
    });
    return api.get("/api/auth/me");
  },
};

// Enhanced utility function to handle authentication errors globally
let isHandlingAuthError = false;

export function handleAuthError(error) {
  // Prevent recursive calls if we're already handling an auth error
  if (isHandlingAuthError) {
    console.log("Auth error already being handled, skipping...");
    return;
  }

  console.error("🔒 Authentication error:", {
    status: error.status,
    message: error.message,
    origin: window.location.origin,
  });

  if (error.status === 401 || error.status === 403) {
    // Set flag to prevent recursive calls
    isHandlingAuthError = true;

    // Clear any stored auth data
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_user_info");

    // Clear all React Query cache
    queryClient.clear();

    // Show user-friendly message
    console.warn("Session expired. Please log in again.");

    // Redirect to login or show login modal
    // You might want to use your router instead of window.location
    if (window.location.pathname !== "/login") {
      // Use setTimeout to ensure all state updates are processed before redirect
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  }
}

// Utility function to reset auth error handling flags
export function resetAuthErrorHandling() {
  isHandlingAuthError = false;
  console.log("Auth error handling flags reset");
}

// Debug utility to check current session status
export const debugSession = async () => {
  console.log("🔍 Session Debug Info:", {
    origin: window.location.origin,
    hostname: window.location.hostname,
    port: window.location.port,
    cookies: document.cookie,
    apiBaseUrl: API_BASE_URL,
    isDev: import.meta.env.DEV,
  });

  try {
    const response = await api.get("/api/auth/validate");
    console.log("✅ Session is valid:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Session validation failed:", error);
    return null;
  }
};

// Request interceptor for adding auth tokens (if needed)
export function addAuthToken(token) {
  queryClient.setMutationDefaults(["authenticated"], {
    mutationFn: async (variables) => {
      const { method, url, data, ...options } = variables;
      return apiRequest(method, url, data, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    },
  });
}

// Response interceptor for handling common responses
queryClient.setMutationDefaults(["auth"], {
  onSuccess: (data, variables, context) => {
    console.log("✅ Auth mutation successful", { data });
    // Invalidate auth-related queries on successful auth mutations
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["auth"] });
    queryClient.invalidateQueries({ queryKey: ["session"] });
  },
  onError: (error) => {
    console.error("❌ Auth mutation failed", { error });
    handleAuthError(error);
  },
});

// Utility to test API connectivity
export const testApiConnection = async () => {
  console.log("🧪 Testing API connection...");

  try {
    // Test if we can reach the health endpoint
    const healthUrl = API_BASE_URL ? `${API_BASE_URL}/health` : "/health";
    const response = await fetch(healthUrl, {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API connection successful:", data);
      return { success: true, data };
    } else {
      console.error("❌ API health check failed:", response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.error("💥 API connection test failed:", error);
    return { success: false, error: error.message };
  }
};

export default queryClient;
