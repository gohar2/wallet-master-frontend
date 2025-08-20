import { useState, useCallback, useEffect, useRef } from "react";
import { zeroDevWallet } from "@/lib/zerodev";
import { useAuth } from "@/contexts/auth-context";

export function useZeroDev() {
  const [smartAccount, setSmartAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authErrorHandled, setAuthErrorHandled] = useState(false);
  const { user, updateUserWallet, sessionValidated } = useAuth();
  const authErrorRef = useRef(false);

  // Helper function to get current smart account from state or user data
  const getCurrentSmartAccount = useCallback(() => {
    if (smartAccount) return smartAccount;
    if (user?.walletAddress) {
      return { address: user.walletAddress, owner: user.googleId };
    }
    return null;
  }, [smartAccount, user]);

  // Auto-reconnect if user has wallet address but smartAccount state is null
  useEffect(() => {
    // Prevent auto-reconnect if we're handling an auth error or session not validated
    if (authErrorRef.current || authErrorHandled || !sessionValidated) {
      return;
    }

    if (user?.walletAddress && !smartAccount && !isConnecting) {
      // User has a wallet address but smartAccount state is not set
      // Reconnect to restore the smart account state
      console.log(
        "🔄 Auto-reconnecting to existing wallet:",
        user.walletAddress
      );
      setSmartAccount({
        address: user.walletAddress,
        owner: user.googleId,
      });
    }
  }, [user, smartAccount, isConnecting, authErrorHandled, sessionValidated]);

  const connect = useCallback(async () => {
    if (!user) {
      throw new Error("User must be authenticated first");
    }

    if (!sessionValidated) {
      throw new Error("Session validation required before wallet operations");
    }

    // Prevent connection if we're handling an auth error
    if (authErrorRef.current || authErrorHandled) {
      throw new Error(
        "Authentication error being handled. Please log in again."
      );
    }

    // If user already has a wallet address, just restore the state
    if (user.walletAddress) {
      console.log("🔗 Restoring existing wallet:", user.walletAddress);
      const restoredAccount = {
        address: user.walletAddress,
        owner: user.googleId,
      };
      setSmartAccount(restoredAccount);
      return user.walletAddress;
    }

    console.log("🔗 Creating new wallet for user:", user.email);
    setIsConnecting(true);
    try {
      // Create smart wallet using user's Google ID as owner
      const walletAddress = await zeroDevWallet.createSmartAccount(
        user.googleId
      );

      console.log("✅ Wallet created successfully:", walletAddress);

      // Update user with wallet address
      await updateUserWallet(walletAddress);

      const newAccount = {
        address: walletAddress,
        owner: user.googleId,
      };
      setSmartAccount(newAccount);

      return walletAddress;
    } catch (error) {
      console.error("❌ Error connecting to ZeroDev:", error);

      // Check if this is an authentication error
      if (
        error.message.includes("HTTP 401") ||
        error.message.includes("Session expired") ||
        error.message.includes("Authentication error being handled") ||
        error.message.includes("User must be authenticated first")
      ) {
        authErrorRef.current = true;
        setAuthErrorHandled(true);
        console.warn(
          "🔒 Authentication error detected, preventing further wallet operations"
        );
        // Don't throw the error again since it's already being handled
        return null;
      }

      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [user, updateUserWallet, authErrorHandled, sessionValidated]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting wallet");
    zeroDevWallet.disconnect();
    setSmartAccount(null);
    // Reset auth error flags on disconnect
    authErrorRef.current = false;
    setAuthErrorHandled(false);
  }, []);

  const ensureSmartAccount = useCallback(async () => {
    // Check auth conditions first
    if (authErrorRef.current || authErrorHandled || !sessionValidated) {
      throw new Error(
        "Authentication error being handled or session not validated. Please log in again."
      );
    }

    // Get current smart account
    let currentSmartAccount = getCurrentSmartAccount();

    if (!currentSmartAccount) {
      // No wallet found, try to connect
      console.log("🔗 No wallet found, connecting first...");
      const walletAddress = await connect();

      if (!walletAddress) {
        throw new Error("Failed to connect wallet");
      }

      currentSmartAccount = {
        address: walletAddress,
        owner: user.googleId,
      };
    }

    // Ensure state is in sync (but don't rely on it for immediate operations)
    if (!smartAccount && currentSmartAccount) {
      setSmartAccount(currentSmartAccount);
    }

    return currentSmartAccount;
  }, [
    getCurrentSmartAccount,
    authErrorHandled,
    sessionValidated,
    connect,
    user,
    smartAccount,
  ]);

  const sendGaslessTransaction = useCallback(
    async (to, amount) => {
      try {
        // Ensure we have a valid smart account
        const currentSmartAccount = await ensureSmartAccount();

        console.log("💸 Sending gasless transaction:", { to, amount });
        const txHash = await zeroDevWallet.sendGaslessTransaction(
          to,
          amount,
          null,
          currentSmartAccount
        );
        console.log("✅ Transaction successful:", txHash);
        return txHash;
      } catch (error) {
        console.error("❌ Error sending gasless transaction:", error);

        // Check if this is an authentication error
        if (
          error.message.includes("HTTP 401") ||
          error.message.includes("Session expired") ||
          error.message.includes("Authentication error being handled")
        ) {
          authErrorRef.current = true;
          setAuthErrorHandled(true);
          console.warn("🔒 Authentication error detected during transaction");
          // Don't throw the error again since it's already being handled
          return null;
        }

        throw error;
      }
    },
    [ensureSmartAccount]
  );

  const sendBatchTransaction = useCallback(
    async (to, amount) => {
      try {
        // Ensure we have a valid smart account
        const currentSmartAccount = await ensureSmartAccount();

        console.log("📦 Sending batch transaction:", { to, amount });
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

        const txHash = await zeroDevWallet.sendBatchTransaction(
          operations,
          currentSmartAccount
        );
        console.log("✅ Batch transaction successful:", txHash);
        return txHash;
      } catch (error) {
        console.error("❌ Error sending batch transaction:", error);

        // Check if this is an authentication error
        if (
          error.message.includes("HTTP 401") ||
          error.message.includes("Session expired") ||
          error.message.includes("Authentication error being handled")
        ) {
          authErrorRef.current = true;
          setAuthErrorHandled(true);
          console.warn(
            "🔒 Authentication error detected during batch transaction"
          );
          // Don't throw the error again since it's already being handled
          return null;
        }

        throw error;
      }
    },
    [ensureSmartAccount]
  );

  return {
    smartAccount,
    isConnected: !!getCurrentSmartAccount(),
    isConnecting,
    connect,
    disconnect,
    sendGaslessTransaction,
    sendBatchTransaction,
    authErrorHandled,
    getCurrentSmartAccount, // Expose this helper for debugging
  };
}
