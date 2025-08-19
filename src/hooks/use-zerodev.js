import { useState, useCallback, useEffect } from "react";
import { zeroDevWallet } from "@/lib/zerodev";
import { useAuth } from "@/contexts/auth-context";

export function useZeroDev() {
  const [smartAccount, setSmartAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, updateUserWallet } = useAuth();

  // Auto-reconnect if user has wallet address but smartAccount state is null
  useEffect(() => {
    if (user?.walletAddress && !smartAccount && !isConnecting) {
      // User has a wallet address but smartAccount state is not set
      // Reconnect to restore the smart account state
      setSmartAccount({
        address: user.walletAddress,
        owner: user.googleId,
      });
    }
  }, [user, smartAccount, isConnecting]);

  const connect = useCallback(async () => {
    if (!user) {
      throw new Error("User must be authenticated first");
    }

    // If user already has a wallet address, just restore the state
    if (user.walletAddress) {
      setSmartAccount({
        address: user.walletAddress,
        owner: user.googleId,
      });
      return user.walletAddress;
    }

    setIsConnecting(true);
    try {
      // Create smart wallet using user's Google ID as owner
      const walletAddress = await zeroDevWallet.createSmartAccount(
        user.googleId
      );

      // Update user with wallet address
      await updateUserWallet(walletAddress);

      setSmartAccount({
        address: walletAddress,
        owner: user.googleId,
      });

      return walletAddress;
    } catch (error) {
      console.error("Error connecting to ZeroDev:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [user, updateUserWallet]);

  const disconnect = useCallback(() => {
    zeroDevWallet.disconnect();
    setSmartAccount(null);
  }, []);

  const sendGaslessTransaction = useCallback(
    async (to, amount) => {
      // Ensure we have a smart account before sending transaction
      if (!smartAccount && user?.walletAddress) {
        // Auto-reconnect if needed
        setSmartAccount({
          address: user.walletAddress,
          owner: user.googleId,
        });
      }

      if (!smartAccount) {
        throw new Error(
          "Smart account not initialized. Please connect your wallet first."
        );
      }

      try {
        const txHash = await zeroDevWallet.sendGaslessTransaction(to, amount);
        return txHash;
      } catch (error) {
        console.error("Error sending gasless transaction:", error);
        throw error;
      }
    },
    [smartAccount, user]
  );

  const sendBatchTransaction = useCallback(
    async (to, amount) => {
      // Ensure we have a smart account before sending transaction
      if (!smartAccount && user?.walletAddress) {
        // Auto-reconnect if needed
        setSmartAccount({
          address: user.walletAddress,
          owner: user.googleId,
        });
      }

      if (!smartAccount) {
        throw new Error(
          "Smart account not initialized. Please connect your wallet first."
        );
      }

      try {
        // Mock batch operations - approve + transfer
        const operations = [
          {
            to: "0x", // Mock USDC contract address
            data: "0x", // Mock approve function call data
          },
          {
            to: "0x", // Mock USDC contract address
            data: "0x", // Mock transfer function call data
          },
        ];

        const txHash = await zeroDevWallet.sendBatchTransaction(operations);
        return txHash;
      } catch (error) {
        console.error("Error sending batch transaction:", error);
        throw error;
      }
    },
    [smartAccount, user]
  );

  return {
    smartAccount,
    isConnected: !!smartAccount || !!user?.walletAddress,
    isConnecting,
    connect,
    disconnect,
    sendGaslessTransaction,
    sendBatchTransaction,
  };
}
