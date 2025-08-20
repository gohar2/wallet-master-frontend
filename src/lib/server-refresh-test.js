// @/lib/server-refresh-test.js

import { apiRequest } from "./queryClient";

// Test utility to verify server refresh handling
export const serverRefreshTest = {
  // Simulate server refresh scenario
  simulateServerRefresh: async () => {
    console.log("🧪 Simulating server refresh scenario...");

    try {
      // This should work if session is valid
      const response = await apiRequest("GET", "/api/auth/validate");
      console.log("✅ Session is valid:", response.data);
      return { valid: true, data: response.data };
    } catch (error) {
      console.log(
        "❌ Session validation failed (expected after server refresh):",
        error.message
      );
      return { valid: false, error: error.message };
    }
  },

  // Test wallet creation after server refresh
  testWalletCreationAfterRefresh: async (connectFunction) => {
    console.log("🧪 Testing wallet creation after server refresh...");

    try {
      // Try to create wallet
      const result = await connectFunction();
      console.log("✅ Wallet creation successful:", result);
      return { success: true, result };
    } catch (error) {
      console.log("❌ Wallet creation failed (expected):", error.message);
      return { success: false, error: error.message };
    }
  },

  // Test session validation flow
  testSessionValidationFlow: async () => {
    console.log("🧪 Testing session validation flow...");

    const steps = [];

    // Step 1: Check if we can validate session
    try {
      const response = await apiRequest("GET", "/api/auth/validate");
      steps.push("✅ Step 1: Session validation successful");
    } catch (error) {
      steps.push(`❌ Step 1: Session validation failed - ${error.message}`);
    }

    // Step 2: Check if user data is available
    try {
      const userResponse = await apiRequest("GET", "/api/auth/me");
      steps.push("✅ Step 2: User data available");
    } catch (error) {
      steps.push(`❌ Step 2: User data not available - ${error.message}`);
    }

    // Step 3: Check if wallet operations are blocked
    try {
      await apiRequest("GET", "/api/test-wallet-operation");
      steps.push("❌ Step 3: Wallet operations should be blocked");
    } catch (error) {
      if (error.message.includes("Authentication error being handled")) {
        steps.push("✅ Step 3: Wallet operations correctly blocked");
      } else {
        steps.push(`❌ Step 3: Unexpected error - ${error.message}`);
      }
    }

    return steps;
  },

  // Run complete server refresh test
  runCompleteTest: async (connectFunction) => {
    console.log("🚀 Starting complete server refresh test...");

    const results = {
      sessionValidation: null,
      walletCreation: null,
      validationFlow: null,
    };

    // Test 1: Session validation
    results.sessionValidation = await serverRefreshTest.simulateServerRefresh();

    // Test 2: Wallet creation (if session is valid)
    if (results.sessionValidation.valid) {
      results.walletCreation =
        await serverRefreshTest.testWalletCreationAfterRefresh(connectFunction);
    } else {
      results.walletCreation = { success: false, error: "Session not valid" };
    }

    // Test 3: Session validation flow
    results.validationFlow =
      await serverRefreshTest.testSessionValidationFlow();

    console.log("📊 Server refresh test results:", results);
    return results;
  },

  // Check current session status
  checkSessionStatus: () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const cookies = document.cookie;

    console.log("🔍 Current session status:", {
      hasUserInStorage: !!user,
      userEmail: user?.email,
      hasCookies: !!cookies,
      cookieCount: cookies.split(";").length,
      timestamp: new Date().toISOString(),
    });

    return {
      hasUserInStorage: !!user,
      userEmail: user?.email,
      hasCookies: !!cookies,
      cookieCount: cookies.split(";").length,
    };
  },
};

// Development-only test function
if (import.meta.env.DEV) {
  // Add to window for easy testing in console
  window.serverRefreshTest = serverRefreshTest;
  console.log(
    "🧪 Server refresh test utility available at window.serverRefreshTest"
  );
  console.log("Usage: await window.serverRefreshTest.runCompleteTest()");
}
