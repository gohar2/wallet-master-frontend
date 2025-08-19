// @/components/login-section.jsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Wallet, AlertCircle, CheckCircle } from "lucide-react";
import { googleAuth } from "@/lib/google-auth";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export function LoginSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setDebugInfo(null);

    try {
      // Step 1: Authenticate with Google
      toast({
        title: "Connecting to Google...",
        description: "Please complete the sign-in process in the popup window.",
      });

      const authResponse = await googleAuth.signIn();

      setDebugInfo({
        step: "Google auth successful",
        hasAccessToken: !!authResponse.access_token,
        hasIdToken: !!authResponse.id_token,
        userEmail: authResponse.user?.email,
      });

      // Step 2: Send tokens to backend
      toast({
        title: "Authenticating...",
        description: "Verifying your credentials with our server.",
      });

      await login(authResponse.access_token, authResponse.id_token);

      // Step 3: Success
      toast({
        title: "Successfully logged in!",
        description: "Your smart wallet is being created...",
        duration: 5000,
      });

      setDebugInfo((prev) => ({
        ...prev,
        step: "Login successful",
        backendAuth: true,
      }));
    } catch (error) {
      console.error("Login error:", error);

      setDebugInfo((prev) => ({
        ...prev,
        step: "Error occurred",
        error: error.message,
      }));

      let errorTitle = "Login failed";
      let errorDescription = "Please try again or check your connection.";

      // Handle specific error types
      if (error.message) {
        const message = error.message.toLowerCase();

        if (
          message.includes("popup was closed") ||
          message.includes("popup_closed")
        ) {
          errorTitle = "Sign-in Cancelled";
          errorDescription =
            "The Google sign-in window was closed. Please try again and complete the sign-in process.";
        } else if (
          message.includes("popup was blocked") ||
          message.includes("popup_blocked")
        ) {
          errorTitle = "Popup Blocked";
          errorDescription =
            "Your browser blocked the sign-in popup. Please allow popups for this site and try again.";
        } else if (
          message.includes("origin is not allowed") ||
          message.includes("unauthorized")
        ) {
          errorTitle = "Authorization Error";
          errorDescription =
            "This website is not authorized for Google Sign-In. Please contact support.";
        } else if (message.includes("invalid or expired google token")) {
          errorTitle = "Authentication Error";
          errorDescription =
            "Your Google session has expired. Please sign in to Google again.";
        } else if (message.includes("access denied")) {
          errorTitle = "Access Denied";
          errorDescription =
            "Google has denied access. Please check your account permissions and try again.";
        } else if (message.includes("google authentication service error")) {
          errorTitle = "Google Service Error";
          errorDescription =
            "Google's authentication service is experiencing issues. Please try again later.";
        } else if (message.includes("invalid request data")) {
          errorTitle = "Invalid Request";
          errorDescription =
            "There was an issue with the authentication request. Please try again.";
        } else if (message.includes("database error")) {
          errorTitle = "Service Unavailable";
          errorDescription =
            "Our service is temporarily unavailable. Please try again in a few minutes.";
        } else if (message.includes("google client id not configured")) {
          errorTitle = "Configuration Error";
          errorDescription =
            "Google authentication is not properly configured. Please contact support.";
        } else if (
          message.includes("network") ||
          message.includes("fetch") ||
          message.includes("connection")
        ) {
          errorTitle = "Connection Error";
          errorDescription =
            "Unable to connect to our servers. Please check your internet connection and try again.";
        } else if (message.includes("cors")) {
          errorTitle = "Connection Error";
          errorDescription =
            "There's a configuration issue preventing sign-in. Please try refreshing the page.";
        } else if (message.includes("failed to load google")) {
          errorTitle = "Google Services Error";
          errorDescription =
            "Unable to load Google Sign-In. Please check your internet connection and try again.";
        } else if (message.includes("timeout")) {
          errorTitle = "Request Timeout";
          errorDescription =
            "The request took too long. Please check your connection and try again.";
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to test Google auth setup
  const testGoogleSetup = async () => {
    try {
      await googleAuth.loadGoogleScript();
      toast({
        title: "Google Setup Test",
        description: "Google Identity Services loaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Google Setup Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="text-center py-16">
      <Card className="max-w-md mx-auto shadow-card">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center">
              <Wallet className="text-white text-2xl w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600">
              Sign in with Google to create your smart wallet and start making
              gasless transactions
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-200 hover:border-google hover:shadow-md text-gray-700 hover:text-google"
            variant="outline"
          >
            {isLoading ? (
              <LoadingSpinner className="mr-3" size="sm" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" className="mr-3">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="font-medium">
              {isLoading ? "Connecting..." : "Continue with Google"}
            </span>
          </Button>

          {/* Debug section - only show in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Debug Info
                </span>
                <Button
                  onClick={testGoogleSetup}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Test Google Setup
                </Button>
              </div>

              {debugInfo && (
                <div className="text-left space-y-2">
                  <div className="flex items-center gap-2">
                    {debugInfo.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                      Step: {debugInfo.step}
                    </span>
                  </div>

                  {debugInfo.hasAccessToken !== undefined && (
                    <div className="text-xs text-gray-600">
                      Access Token: {debugInfo.hasAccessToken ? "✓" : "✗"}
                    </div>
                  )}

                  {debugInfo.hasIdToken !== undefined && (
                    <div className="text-xs text-gray-600">
                      ID Token: {debugInfo.hasIdToken ? "✓" : "✗"}
                    </div>
                  )}

                  {debugInfo.userEmail && (
                    <div className="text-xs text-gray-600">
                      Email: {debugInfo.userEmail}
                    </div>
                  )}

                  {debugInfo.error && (
                    <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                      Error: {debugInfo.error}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                Client ID:{" "}
                {googleAuth.clientId
                  ? `${googleAuth.clientId.substring(0, 20)}...`
                  : "Not configured"}
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            <p>
              By connecting, you agree to create a smart wallet powered by
              ZeroDev
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
