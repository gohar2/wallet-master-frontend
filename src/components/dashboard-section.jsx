import React, { useEffect } from "react";
import { UserInfoCard } from "./user-info-card";
import { TokenTransferCard } from "./token-transfer-card";
import { BatchedActionsCard } from "./batched-actions-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/auth-context";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";

export function DashboardSection() {
  const { user, sessionValidated, isLoading } = useAuth();
  const { connect, isConnecting, isConnected, authErrorHandled } = useWeb3();
  const { toast } = useToast();

  useEffect(() => {
    // Don't do anything if still loading or session not validated
    if (isLoading || !sessionValidated) {
      console.log("⏳ Waiting for session validation...", {
        isLoading,
        sessionValidated,
      });
      return;
    }

    // Prevent auto-connect if there's an authentication error being handled
    if (authErrorHandled) {
      console.log("🚫 Skipping auto-connect due to authentication error");
      return;
    }

    // Only attempt wallet creation if user is authenticated and session is validated
    if (user && !user.walletAddress && !isConnected && !isConnecting) {
      console.log(
        "🔗 Attempting wallet creation for validated user:",
        user.email
      );

      connect().catch((error) => {
        console.error("❌ Auto-connect failed:", error);

        // Only show toast if it's not an authentication error
        if (
          !error.message.includes("HTTP 401") &&
          !error.message.includes("Session expired") &&
          !error.message.includes("Authentication error being handled") &&
          !error.message.includes("User must be authenticated first")
        ) {
          toast({
            title: "Wallet creation failed",
            description: "Could not create smart wallet. Please try again.",
            variant: "destructive",
          });
        } else {
          console.log(
            "🔒 Auth error during wallet creation - handled by global error handler"
          );
        }
      });
    } else if (!user && sessionValidated) {
      console.log("👤 No authenticated user found after session validation");
    }
  }, [
    user,
    isConnected,
    isConnecting,
    connect,
    toast,
    authErrorHandled,
    sessionValidated,
    isLoading,
  ]);

  // Show loading state while session is being validated
  if (isLoading || !sessionValidated) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" size="lg" />
          <p className="text-gray-600 font-medium">
            {isLoading
              ? "Validating session..."
              : "Session validation complete"}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while connecting wallet
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" size="lg" />
          <p className="text-gray-600 font-medium">
            Creating your smart wallet...
          </p>
        </div>
      </div>
    );
  }

  // Show message if no user is authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-gray-600 font-medium mb-4">
            Please log in to access your wallet
          </p>
          <p className="text-gray-500 text-sm">
            Your session has expired or you need to authenticate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserInfoCard />

      <div className="grid lg:grid-cols-2 gap-6">
        <TokenTransferCard />
        <BatchedActionsCard />
      </div>
    </div>
  );
}
