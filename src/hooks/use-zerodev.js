import { useState, useCallback } from 'react';
import { zeroDevWallet } from '@/lib/zerodev';
import { useAuth } from '@/contexts/auth-context';

export function useZeroDev() {
  const [smartAccount, setSmartAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, updateUserWallet } = useAuth();

  const connect = useCallback(async () => {
    if (!user) {
      throw new Error("User must be authenticated first");
    }

    setIsConnecting(true);
    try {
      // Create smart wallet using user's Google ID as owner
      const walletAddress = await zeroDevWallet.createSmartAccount(user.googleId);
      
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

  const sendGaslessTransaction = useCallback(async (to, amount) => {
    try {
      const txHash = await zeroDevWallet.sendGaslessTransaction(to, amount);
      return txHash;
    } catch (error) {
      console.error("Error sending gasless transaction:", error);
      throw error;
    }
  }, []);

  const sendBatchTransaction = useCallback(async (to, amount) => {
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
  }, []);

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