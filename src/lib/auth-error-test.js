// @/lib/auth-error-test.js

import {
  apiRequest,
  handleAuthError,
  resetAuthErrorHandling,
} from "./queryClient";

// Test utility to verify auth error handling
export const authErrorTest = {
  // Simulate a 401 error to test the handling
  test401Error: async () => {
    console.log("🧪 Testing 401 error handling...");

    try {
      // This should trigger a 401 error
      await apiRequest("GET", "/api/test-unauthorized");
    } catch (error) {
      console.log("✅ 401 error caught and handled");
      return true;
    }

    return false;
  },

  // Test that subsequent API calls are blocked
  testBlockedCalls: async () => {
    console.log("🧪 Testing blocked API calls after auth error...");

    const results = [];

    try {
      // Try multiple API calls - they should all be blocked
      await apiRequest("GET", "/api/test1");
      results.push("FAILED: First call should have been blocked");
    } catch (error) {
      if (error.message.includes("Authentication error being handled")) {
        results.push("✅ First call correctly blocked");
      } else {
        results.push("❌ First call blocked with wrong error");
      }
    }

    try {
      await apiRequest("GET", "/api/test2");
      results.push("FAILED: Second call should have been blocked");
    } catch (error) {
      if (error.message.includes("Authentication error being handled")) {
        results.push("✅ Second call correctly blocked");
      } else {
        results.push("❌ Second call blocked with wrong error");
      }
    }

    try {
      await apiRequest("GET", "/api/test3");
      results.push("FAILED: Third call should have been blocked");
    } catch (error) {
      if (error.message.includes("Authentication error being handled")) {
        results.push("✅ Third call correctly blocked");
      } else {
        results.push("❌ Third call blocked with wrong error");
      }
    }

    return results;
  },

  // Reset the auth error state
  reset: () => {
    console.log("🔄 Resetting auth error state...");
    resetAuthErrorHandling();
  },

  // Run a complete test
  runCompleteTest: async () => {
    console.log("🚀 Starting complete auth error test...");

    // Test 1: Trigger 401 error
    const test1Result = await authErrorTest.test401Error();
    console.log("Test 1 result:", test1Result ? "PASSED" : "FAILED");

    // Wait a bit for the error handling to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Test 2: Verify subsequent calls are blocked
    const test2Results = await authErrorTest.testBlockedCalls();
    console.log("Test 2 results:", test2Results);

    // Test 3: Reset and verify calls work again
    authErrorTest.reset();
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      // This should work now that we've reset
      await apiRequest("GET", "/api/auth/validate");
      console.log("✅ Test 3: API calls work after reset");
    } catch (error) {
      console.log("❌ Test 3: API calls still blocked after reset");
    }

    console.log("🏁 Complete auth error test finished");
  },
};

// Development-only test function
if (import.meta.env.DEV) {
  // Add to window for easy testing in console
  window.authErrorTest = authErrorTest;
  console.log("🧪 Auth error test utility available at window.authErrorTest");
  console.log("Usage: await window.authErrorTest.runCompleteTest()");
}
