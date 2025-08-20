// @/lib/safari-compatibility.js

// Safari compatibility utilities
export const safariUtils = {
  // Check if the current browser is Safari
  isSafari: () => {
    const userAgent = navigator.userAgent;
    return /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  },

  // Check if Safari is in private browsing mode
  isPrivateBrowsing: () => {
    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
      return false;
    } catch (e) {
      return true;
    }
  },

  // Safe localStorage operations for Safari
  safeLocalStorage: {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn("Safari localStorage getItem failed:", error);
        return null;
      }
    },

    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn("Safari localStorage setItem failed:", error);
        return false;
      }
    },

    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn("Safari localStorage removeItem failed:", error);
        return false;
      }
    },

    clear: () => {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.warn("Safari localStorage clear failed:", error);
        return false;
      }
    },
  },

  // Enhanced fetch for Safari with better error handling
  safariFetch: async (url, options = {}) => {
    const isSafari = safariUtils.isSafari();

    // Safari-specific headers and options
    const safariOptions = {
      ...options,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...options.headers,
      },
      // Safari sometimes has issues with credentials, so we're more explicit
      credentials: options.credentials || "include",
    };

    // Add Safari-specific timeout
    if (isSafari) {
      safariOptions.signal = AbortSignal.timeout(30000); // 30 second timeout
    }

    try {
      const response = await fetch(url, safariOptions);

      // Safari-specific response handling
      if (isSafari && !response.ok) {
        // Log more details for Safari debugging
        console.warn("Safari API Error:", {
          status: response.status,
          statusText: response.statusText,
          url: url,
          headers: Object.fromEntries(response.headers.entries()),
        });
      }

      return response;
    } catch (error) {
      // Safari-specific error handling
      if (isSafari) {
        console.error("Safari fetch error:", {
          error: error.message,
          url: url,
          options: safariOptions,
        });

        // Handle Safari-specific network errors
        if (error.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }

        if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError")
        ) {
          throw new Error(
            "Network connection failed. Please check your internet connection and try again."
          );
        }
      }

      throw error;
    }
  },

  // Safari-compatible session storage fallback
  sessionStorage: {
    getItem: (key) => {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.warn("Safari sessionStorage getItem failed:", error);
        return null;
      }
    },

    setItem: (key, value) => {
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn("Safari sessionStorage setItem failed:", error);
        return false;
      }
    },

    removeItem: (key) => {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn("Safari sessionStorage removeItem failed:", error);
        return false;
      }
    },
  },

  // Safari-compatible cookie operations
  cookies: {
    get: (name) => {
      try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
      } catch (error) {
        console.warn("Safari cookie get failed:", error);
        return null;
      }
    },

    set: (name, value, options = {}) => {
      try {
        let cookie = `${name}=${value}`;

        if (options.path) cookie += `; path=${options.path}`;
        if (options.domain) cookie += `; domain=${options.domain}`;
        if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
        if (options.secure) cookie += "; secure";
        if (options.sameSite) cookie += `; samesite=${options.sameSite}`;

        document.cookie = cookie;
        return true;
      } catch (error) {
        console.warn("Safari cookie set failed:", error);
        return false;
      }
    },

    remove: (name, options = {}) => {
      try {
        return safariUtils.cookies.set(name, "", {
          ...options,
          maxAge: -1,
        });
      } catch (error) {
        console.warn("Safari cookie remove failed:", error);
        return false;
      }
    },
  },

  // Safari-specific redirect handling
  redirect: (url) => {
    const isSafari = safariUtils.isSafari();

    if (isSafari) {
      // Safari sometimes has issues with immediate redirects
      // Use a small delay to ensure state is properly updated
      setTimeout(() => {
        window.location.href = url;
      }, 150);
    } else {
      window.location.href = url;
    }
  },

  // Safari-compatible Google OAuth handling
  googleAuth: {
    // Check if Google Identity Services is properly loaded in Safari
    isGoogleLoaded: () => {
      try {
        return !!(
          window.google &&
          window.google.accounts &&
          window.google.accounts.oauth2
        );
      } catch (error) {
        console.warn("Safari Google Identity Services check failed:", error);
        return false;
      }
    },

    // Wait for Google Identity Services to load in Safari
    waitForGoogle: (timeout = 10000) => {
      return new Promise((resolve, reject) => {
        if (safariUtils.googleAuth.isGoogleLoaded()) {
          resolve();
          return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (safariUtils.googleAuth.isGoogleLoaded()) {
            clearInterval(checkInterval);
            resolve();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(
              new Error("Google Identity Services failed to load in Safari")
            );
          }
        }, 100);
      });
    },
  },

  // Safari-specific debugging
  debug: () => {
    const isSafari = safariUtils.isSafari();
    const isPrivate = safariUtils.isPrivateBrowsing();

    console.log("🔍 Safari Debug Info:", {
      isSafari,
      isPrivateBrowsing: isPrivate,
      userAgent: navigator.userAgent,
      localStorage: (() => {
        try {
          localStorage.setItem("test", "test");
          localStorage.removeItem("test");
          return "available";
        } catch (e) {
          return "unavailable";
        }
      })(),
      sessionStorage: (() => {
        try {
          sessionStorage.setItem("test", "test");
          sessionStorage.removeItem("test");
          return "available";
        } catch (e) {
          return "unavailable";
        }
      })(),
      cookies: document.cookie ? "present" : "missing",
      googleIdentity: safariUtils.googleAuth.isGoogleLoaded()
        ? "loaded"
        : "not loaded",
    });
  },
};

export default safariUtils;
