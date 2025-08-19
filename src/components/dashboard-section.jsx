import React, { useEffect } from "react";
import { UserInfoCard } from "./user-info-card";
import { TokenTransferCard } from "./token-transfer-card";
import { BatchedActionsCard } from "./batched-actions-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/auth-context";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";

export function DashboardSection() {
  const { user } = useAuth();
  const { connect, isConnecting, isConnected } = useWeb3();
  const { toast } = useToast();

  useEffect(() => {
    // Auto-connect smart wallet if user doesn't have one
    if (user && !user.walletAddress && !isConnected && !isConnecting) {
      connect().catch((error) => {
        console.error("Auto-connect failed:", error);
        toast({
          title: "Wallet creation failed",
          description: "Could not create smart wallet. Please try again.",
          variant: "destructive",
        });
      });
    }
  }, [user, isConnected, isConnecting, connect, toast]);

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
