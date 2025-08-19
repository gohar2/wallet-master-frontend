// @/lib/google-auth.js

export class GoogleAuth {
  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    this.redirectUri =
      import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
      `${window.location.origin}/auth/callback`;

    if (!this.clientId) {
      console.warn("Google Client ID not configured");
    }

    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", resolve);
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Google Identity Services"))
        );
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => setTimeout(resolve, 100);
      script.onerror = () =>
        reject(new Error("Failed to load Google Identity Services"));

      document.head.appendChild(script);
    });
  }

  async initializeGoogleIdentity() {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        await this.loadGoogleScript();

        if (!window.google || !window.google.accounts) {
          throw new Error(
            "Google Identity Services not available after loading"
          );
        }

        this.isInitialized = true;
      } catch (error) {
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async signIn() {
    if (!this.clientId) {
      throw new Error("Google Client ID not configured");
    }

    try {
      await this.initializeGoogleIdentity();

      // Use OAuth2 popup approach for better reliability
      return new Promise((resolve, reject) => {
        if (!window.google.accounts.oauth2) {
          reject(new Error("Google OAuth2 not available"));
          return;
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: "openid email profile",
          callback: async (response) => {
            try {
              if (response.error) {
                reject(new Error(`OAuth error: ${response.error}`));
                return;
              }

              if (!response.access_token) {
                reject(new Error("No access token received"));
                return;
              }

              // Get user info using the access token
              const userInfo = await this.getUserInfo(response.access_token);

              const authResponse = {
                access_token: response.access_token,
                id_token: null,
                token_type: response.token_type || "Bearer",
                expires_in: response.expires_in,
                scope: response.scope,
                user: userInfo,
              };

              // Store tokens
              localStorage.setItem(
                "google_access_token",
                response.access_token
              );
              // No extra tokeninfo call; id_token is not required for backend
              localStorage.setItem(
                "google_user_info",
                JSON.stringify(userInfo)
              );

              resolve(authResponse);
            } catch (error) {
              console.error("OAuth callback error:", error);
              reject(new Error("Failed to process authentication response"));
            }
          },
          error_callback: (error) => {
            console.error("OAuth error:", error);

            let errorMessage = "Authentication failed";

            if (error.type === "popup_closed") {
              errorMessage = "Sign-in popup was closed. Please try again.";
            } else if (error.type === "popup_blocked") {
              errorMessage =
                "Sign-in popup was blocked. Please allow popups and try again.";
            } else if (error.type === "access_denied") {
              errorMessage =
                "Access was denied. Please check your Google account permissions.";
            } else if (error.type === "invalid_client") {
              errorMessage =
                "Google authentication is not properly configured.";
            } else {
              errorMessage = `Authentication error: ${
                error.message || error.type || "Unknown error"
              }`;
            }

            reject(new Error(errorMessage));
          },
        });

        // Request access token without forcing consent each time.
        // This avoids extra screens and flicker, while still allowing 2FA when required by Google.
        client.requestAccessToken();
      });
    } catch (error) {
      console.error("Error in signIn:", error);

      // Handle specific initialization errors
      if (error.message.includes("Failed to load")) {
        throw new Error(
          "Unable to load Google Sign-In. Please check your internet connection and try again."
        );
      } else if (error.message.includes("not available")) {
        throw new Error(
          "Google Sign-In is not available. Please refresh the page and try again."
        );
      }

      throw error;
    }
  }

  async getUserInfo(accessToken) {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      const userInfo = await response.json();

      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || "Unknown User",
        picture: userInfo.picture || "",
        verified_email: userInfo.verified_email || false,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        locale: userInfo.locale,
      };
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw new Error("Failed to fetch user information");
    }
  }

  // Removed getIdToken to avoid extra network roundtrips that cause UI jitter during 2FA

  signOut() {
    try {
      // Revoke the token if available
      const accessToken = localStorage.getItem("google_access_token");
      if (accessToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
          console.log("Token revoked");
        });
      }
    } catch (error) {
      console.warn("Error revoking token:", error);
    }

    // Clear stored data
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("google_user_info");
  }

  isSignedIn() {
    const token = localStorage.getItem("google_access_token");
    return !!token;
  }

  getCurrentUser() {
    try {
      const userInfo = localStorage.getItem("google_user_info");
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  getAccessToken() {
    return localStorage.getItem("google_access_token");
  }

  getIdToken() {
    return localStorage.getItem("google_id_token");
  }
}

// Create and export a singleton instance
export const googleAuth = new GoogleAuth();
