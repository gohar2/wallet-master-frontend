// Mock ZeroDev implementation - replace with actual ZeroDev SDK integration
export class ZeroDevWallet {
  constructor() {
    this.projectId = import.meta.env.VITE_ZERODEV_PROJECT_ID || "";
    this.smartAccount = null;

    if (!this.projectId) {
      console.warn("ZeroDev Project ID not configured");
    }
  }

  async createSmartAccount(ownerAddress) {
    // TODO: Replace with actual ZeroDev SDK integration
    // This is a mock implementation

    try {
      // Mock wallet creation - replace with actual ZeroDev implementation
      const mockWalletAddress = `0x${Math.random()
        .toString(16)
        .slice(2, 42)
        .padStart(40, "0")}`;

      this.smartAccount = {
        address: mockWalletAddress,
        owner: ownerAddress,
      };

      return mockWalletAddress;
    } catch (error) {
      console.error("Error creating smart account:", error);
      throw new Error("Failed to create smart wallet");
    }
  }

  async sendGaslessTransaction(
    to,
    amount,
    tokenAddress = null,
    smartAccountOverride = null
  ) {
    const currentSmartAccount = smartAccountOverride || this.smartAccount;

    if (!currentSmartAccount) {
      throw new Error("Smart account not initialized");
    }

    // Validate required parameters
    if (!to || !amount) {
      throw new Error(
        "Transaction validation failed: to: Path `to` is required., amount: Path `amount` is required."
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      throw new Error("Invalid recipient address format");
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    try {
      // TODO: Replace with actual ZeroDev gasless transaction
      // Mock implementation
      console.log("Sending gasless transaction:", {
        to,
        amount,
        tokenAddress,
        smartAccount: currentSmartAccount.address,
      });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay

      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      console.log("Transaction successful:", mockTxHash);
      return mockTxHash;
    } catch (error) {
      console.error("Error sending gasless transaction:", error);
      throw new Error("Failed to send transaction");
    }
  }

  async sendBatchTransaction(operations, smartAccountOverride = null) {
    const currentSmartAccount = smartAccountOverride || this.smartAccount;

    if (!currentSmartAccount) {
      throw new Error("Smart account not initialized");
    }

    // Validate operations array
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      throw new Error(
        "Transaction validation failed: operations: Path `operations` is required and must be a non-empty array."
      );
    }

    // Validate each operation has required fields
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (!operation.to) {
        throw new Error(
          `Transaction validation failed: operations[${i}].to: Path \`to\` is required.`
        );
      }
      if (!operation.data) {
        throw new Error(
          `Transaction validation failed: operations[${i}].data: Path \`data\` is required.`
        );
      }
    }

    try {
      // TODO: Replace with actual ZeroDev batch transaction
      // Mock implementation
      console.log("Sending batch transaction:", {
        operations,
        smartAccount: currentSmartAccount.address,
      });
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate network delay

      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      console.log("Batch transaction successful:", mockTxHash);
      return mockTxHash;
    } catch (error) {
      console.error("Error sending batch transaction:", error);
      throw new Error("Failed to send batch transaction");
    }
  }

  getSmartAccountAddress() {
    return this.smartAccount?.address || null;
  }

  isConnected() {
    return !!this.smartAccount;
  }

  disconnect() {
    this.smartAccount = null;
  }
}

export const zeroDevWallet = new ZeroDevWallet();
