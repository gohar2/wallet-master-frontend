// @/lib/google-auth.js

import { safariUtils } from "@/lib/safari-compatibility";

export class GoogleAuth {
  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    this.initializationPromise = null;
  }

  async initializeGoogleIdentity() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      // Check if Google Identity Services is already loaded
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.oauth2
      ) {
        resolve();
        return;
      }

      // For Safari, wait for Google Identity Services to load
      if (safariUtils.isSafari()) {
        safariUtils.googleAuth.waitForGoogle().then(resolve).catch(reject);
        return;
      }

      // For other browsers, wait for the script to load
      const checkGoogle = () => {
        if (
          window.google &&
          window.google.accounts &&
          window.google.accounts.oauth2
        ) {
          resolve();
        } else {
          setTimeout(checkGoogle, 100);
        }
      };

      checkGoogle();
    });

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

              // Store tokens (Safari-compatible)
              safariUtils.safeLocalStorage.setItem(
                "google_access_token",
                response.access_token
              );
              safariUtils.safeLocalStorage.setItem(
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
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
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
      return userInfo;
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw new Error("Failed to get user information from Google");
    }
  }

  async signOut() {
    try {
      // Clear stored tokens (Safari-compatible)
      safariUtils.safeLocalStorage.removeItem("google_access_token");
      safariUtils.safeLocalStorage.removeItem("google_id_token");
      safariUtils.safeLocalStorage.removeItem("google_user_info");

      // Revoke the token if we have one
      const accessToken = safariUtils.safeLocalStorage.getItem(
        "google_access_token"
      );
      if (accessToken) {
        try {
          await fetch(
            `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
            {
              method: "POST",
            }
          );
        } catch (error) {
          console.warn("Failed to revoke Google token:", error);
        }
      }

      console.log("Successfully signed out of Google");
    } catch (error) {
      console.error("Error during Google sign out:", error);
      throw new Error("Failed to sign out of Google");
    }
  }

  // Check if user is currently signed in
  isSignedIn() {
    try {
      const accessToken = safariUtils.safeLocalStorage.getItem(
        "google_access_token"
      );
      return !!accessToken;
    } catch (error) {
      console.warn("Error checking sign-in status:", error);
      return false;
    }
  }

  // Get current user info
  getCurrentUser() {
    try {
      const userInfo = safariUtils.safeLocalStorage.getItem("google_user_info");
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.warn("Error getting current user:", error);
      return null;
    }
  }
}

// Create a singleton instance
export const googleAuth = new GoogleAuth();
