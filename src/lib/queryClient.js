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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
    credentials: "include",
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

  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, config);

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
    // Handle network errors and other fetch failures
    if (error instanceof ApiError) {
      throw error; // Re-throw API errors as-is
    }

    // Handle network/CORS/fetch errors
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new ApiError(
        "Network error: Unable to connect to the server. Please check your connection and try again.",
        0,
        { originalError: error.message }
      );
    }

    // Handle other errors
    throw new ApiError(`Request failed: ${error.message}`, 0, {
      originalError: error.message,
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

      // You can add global error handling here
      if (error.status === 401) {
        // Handle unauthorized - maybe redirect to login
        console.warn("Unauthorized access - consider redirecting to login");
      } else if (error.status === 403) {
        // Handle forbidden
        console.warn("Access forbidden");
      } else if (error.status >= 500) {
        // Handle server errors
        console.error("Server error occurred");
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
  // Google login
  googleLogin: (googleData) => api.post("/api/auth/google", googleData),

  // Regular login
  login: (credentials) => api.post("/api/auth/login", credentials),

  // Logout
  logout: () => api.post("/api/auth/logout"),

  // Get current user
  getCurrentUser: () => api.get("/api/auth/me"),

  // Refresh token
  refreshToken: () => api.post("/api/auth/refresh"),
};

// Utility function to handle authentication errors globally
export function handleAuthError(error) {
  if (error.status === 401) {
    // Clear any stored auth data
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_user_info");

    // Redirect to login or show login modal
    window.location.href = "/login";
  }
}

// Request interceptor for adding auth tokens
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
    // Invalidate auth-related queries on successful auth mutations
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["auth"] });
  },
  onError: handleAuthError,
});

export default queryClient;
