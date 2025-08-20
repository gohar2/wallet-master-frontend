import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Send } from "lucide-react";
import { useZeroDev } from "@/hooks/use-zerodev"; // Changed from useWeb3 to useZeroDev
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function TokenTransferCard() {
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
  });

  // Use the fixed useZeroDev hook instead of useWeb3
  const {
    sendGaslessTransaction,
    isConnected,
    isConnecting,
    smartAccount,
    getCurrentSmartAccount,
  } = useZeroDev();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async (data) => {
      if (!user) throw new Error("User not authenticated");

      // Check for smart account more reliably
      const currentSmartAccount = getCurrentSmartAccount();
      if (!currentSmartAccount) {
        throw new Error(
          "Smart account not available. Please wait for wallet creation to complete."
        );
      }

      console.log(
        "🚀 Starting transfer with smart account:",
        currentSmartAccount
      );

      // Create transaction record
      const transactionResponse = await apiRequest(
        "POST",
        "/api/transactions",
        {
          userId: user.id,
          type: "transfer",
          recipient: data.recipient,
          amount: data.amount,
          tokenSymbol: "USDC",
        }
      );

      const transaction = transactionResponse.data;

      // Check if transaction was created successfully
      if (!transaction || !transaction._id) {
        throw new Error("Failed to create transaction record");
      }

      try {
        console.log("💸 Sending gasless transaction...");
        // Send gasless transaction
        const txHash = await sendGaslessTransaction(
          data.recipient,
          data.amount
        );

        if (!txHash) {
          throw new Error("Transaction failed - no hash returned");
        }

        // Update transaction with success
        await apiRequest("PATCH", `/api/transactions/${transaction._id}`, {
          status: "completed",
          hash: txHash,
        });

        return { transaction, txHash };
      } catch (error) {
        console.error("❌ Transaction failed:", error);
        // Update transaction with failure
        if (transaction && transaction._id) {
          await apiRequest("PATCH", `/api/transactions/${transaction._id}`, {
            status: "failed",
            error:
              error instanceof Error ? error.message : "Transaction failed",
          });
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Transfer successful!",
        description: "Your gasless USDC transfer has been completed.",
      });
      setFormData({ recipient: "", amount: "" });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "transactions"],
      });
    },
    onError: (error) => {
      console.error("🚨 Transfer mutation error:", error);
      toast({
        title: "Transfer failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.recipient || !formData.amount) {
      toast({
        title: "Invalid input",
        description: "Please enter both recipient address and amount.",
        variant: "destructive",
      });
      return;
    }

    // More reliable connection check
    const currentSmartAccount = getCurrentSmartAccount();
    if (!currentSmartAccount && !isConnecting) {
      toast({
        title: "Wallet not ready",
        description:
          "Please wait for your smart wallet to be created or try refreshing.",
        variant: "destructive",
      });
      return;
    }

    console.log("📋 Form submitted with data:", formData);
    console.log("🔗 Smart account status:", {
      isConnected,
      isConnecting,
      smartAccount,
      currentSmartAccount,
    });

    transferMutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // More sophisticated connection status
  const getConnectionStatus = () => {
    if (isConnecting) return "connecting";
    if (getCurrentSmartAccount()) return "connected";
    return "disconnected";
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Send className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Gasless Transfer
            </h3>
            <p className="text-sm text-gray-600">
              Send USDC without paying gas fees
            </p>
            {/* Debug info - remove in production */}
            <p className="text-xs text-gray-400 mt-1">
              Status: {connectionStatus} | Wallet:{" "}
              {getCurrentSmartAccount()?.address
                ? `${getCurrentSmartAccount().address.slice(0, 6)}...`
                : "None"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="recipientAddress"
              className="text-sm font-medium text-gray-700 mb-2"
            >
              Recipient Address
            </Label>
            <Input
              id="recipientAddress"
              type="text"
              placeholder="0x..."
              value={formData.recipient}
              onChange={(e) => handleInputChange("recipient", e.target.value)}
              className="font-mono text-sm"
              disabled={transferMutation.isPending}
            />
          </div>

          <div>
            <Label
              htmlFor="transferAmount"
              className="text-sm font-medium text-gray-700 mb-2"
            >
              Amount (USDC)
            </Label>
            <div className="relative">
              <Input
                id="transferAmount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                disabled={transferMutation.isPending}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm font-medium">USDC</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={
              transferMutation.isPending || connectionStatus === "disconnected"
            }
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium"
          >
            {transferMutation.isPending ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Sending Transfer...
              </>
            ) : connectionStatus === "connecting" ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Connecting Wallet...
              </>
            ) : connectionStatus === "disconnected" ? (
              "Wallet Not Connected"
            ) : (
              "Send Transfer"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
