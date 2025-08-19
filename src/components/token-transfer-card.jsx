import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Send } from "lucide-react";
import { useWeb3 } from "@/contexts/web3-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function TokenTransferCard() {
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
  });

  const { sendGaslessTransaction, isConnected } = useWeb3();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async (data) => {
      if (!user) throw new Error("User not authenticated");
      if (!isConnected)
        throw new Error(
          "Smart account not connected. Please wait for wallet creation to complete."
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

      try {
        // Send gasless transaction
        const txHash = await sendGaslessTransaction(
          data.recipient,
          data.amount
        );

        // Update transaction with success
        await apiRequest("PATCH", `/api/transactions/${transaction.id}`, {
          status: "success",
          hash: txHash,
        });

        return { transaction, txHash };
      } catch (error) {
        // Update transaction with failure
        await apiRequest("PATCH", `/api/transactions/${transaction.id}`, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Transaction failed",
        });
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

    if (!isConnected) {
      toast({
        title: "Wallet not ready",
        description: "Please wait for your smart wallet to be created.",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
            disabled={transferMutation.isPending || !isConnected}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium"
          >
            {transferMutation.isPending ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Sending Transfer...
              </>
            ) : !isConnected ? (
              "Connecting Wallet..."
            ) : (
              "Send Transfer"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
