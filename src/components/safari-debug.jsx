// @/components/safari-debug.jsx

import React, { useState, useEffect } from "react";
import { safariUtils } from "@/lib/safari-compatibility";

export function SafariDebug() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show debug info in development and if it's Safari
    if (import.meta.env.DEV && safariUtils.isSafari()) {
      setIsVisible(true);
      updateDebugInfo();
    }
  }, []);

  const updateDebugInfo = () => {
    const info = {
      isSafari: safariUtils.isSafari(),
      isPrivateBrowsing: safariUtils.isPrivateBrowsing(),
      userAgent: navigator.userAgent,
      localStorage: (() => {
        try {
          localStorage.setItem("test", "test");
          localStorage.removeItem("test");
          return "available";
        } catch (e) {
          return "unavailable";
        }
      })(),
      sessionStorage: (() => {
        try {
          sessionStorage.setItem("test", "test");
          sessionStorage.removeItem("test");
          return "available";
        } catch (e) {
          return "unavailable";
        }
      })(),
      cookies: document.cookie ? "present" : "missing",
      googleIdentity: safariUtils.googleAuth.isGoogleLoaded()
        ? "loaded"
        : "not loaded",
      origin: window.location.origin,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      timestamp: new Date().toISOString(),
    };

    setDebugInfo(info);
  };

  const testLocalStorage = () => {
    try {
      const testKey = "safari_test_" + Date.now();
      const testValue = "test_value_" + Date.now();

      // Test setItem
      const setResult = safariUtils.safeLocalStorage.setItem(
        testKey,
        testValue
      );

      // Test getItem
      const getResult = safariUtils.safeLocalStorage.getItem(testKey);

      // Test removeItem
      const removeResult = safariUtils.safeLocalStorage.removeItem(testKey);

      alert(`localStorage Test Results:
Set: ${setResult ? "SUCCESS" : "FAILED"}
Get: ${getResult === testValue ? "SUCCESS" : "FAILED"}
Remove: ${removeResult ? "SUCCESS" : "FAILED"}`);

      updateDebugInfo();
    } catch (error) {
      alert(`localStorage Test Failed: ${error.message}`);
    }
  };

  const testGoogleAuth = async () => {
    try {
      await safariUtils.googleAuth.waitForGoogle();
      alert("Google Identity Services loaded successfully!");
      updateDebugInfo();
    } catch (error) {
      alert(`Google Auth Test Failed: ${error.message}`);
    }
  };

  const clearAllStorage = () => {
    try {
      safariUtils.safeLocalStorage.clear();
      alert("All storage cleared successfully!");
      updateDebugInfo();
    } catch (error) {
      alert(`Storage Clear Failed: ${error.message}`);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#1a1a1a",
        color: "#fff",
        padding: "15px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        maxWidth: "400px",
        zIndex: 9999,
        border: "1px solid #333",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{ marginBottom: "10px", fontWeight: "bold", color: "#ff6b6b" }}
      >
        🦁 Safari Debug Panel
      </div>

      {debugInfo && (
        <div style={{ marginBottom: "15px" }}>
          <div>
            <strong>Browser:</strong> {debugInfo.isSafari ? "Safari" : "Other"}
          </div>
          <div>
            <strong>Private Mode:</strong>{" "}
            {debugInfo.isPrivateBrowsing ? "Yes" : "No"}
          </div>
          <div>
            <strong>localStorage:</strong> {debugInfo.localStorage}
          </div>
          <div>
            <strong>sessionStorage:</strong> {debugInfo.sessionStorage}
          </div>
          <div>
            <strong>Cookies:</strong> {debugInfo.cookies}
          </div>
          <div>
            <strong>Google Identity:</strong> {debugInfo.googleIdentity}
          </div>
          <div>
            <strong>Origin:</strong> {debugInfo.origin}
          </div>
          <div>
            <strong>Protocol:</strong> {debugInfo.protocol}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        <button
          onClick={updateDebugInfo}
          style={{
            background: "#4CAF50",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Refresh
        </button>

        <button
          onClick={testLocalStorage}
          style={{
            background: "#2196F3",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Test Storage
        </button>

        <button
          onClick={testGoogleAuth}
          style={{
            background: "#FF9800",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Test Google
        </button>

        <button
          onClick={clearAllStorage}
          style={{
            background: "#f44336",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Clear Storage
        </button>

        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: "#666",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Hide
        </button>
      </div>
    </div>
  );
}

export default SafariDebug;
