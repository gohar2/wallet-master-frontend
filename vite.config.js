// vite.config.js - Fixed for both localhost and 127.0.0.1 with Safari compatibility
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  console.log("🔧 Building for mode:", mode);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true, // Allow access from both localhost and 127.0.0.1
      // Remove the specific host constraint that was causing issues

      // Add Safari-specific headers
      headers: {
        "Cross-Origin-Embedder-Policy": "unsafe-none",
        "Cross-Origin-Opener-Policy": "unsafe-none",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },

      // Proxy API calls during development to avoid CORS
      proxy: {
        "/api": {
          target: process.env.VITE_API_URL || "http://localhost:3001", // Make sure this matches your backend port
          changeOrigin: true,
          secure: false,
          credentials: "include", // Important for session cookies
          headers: {
            // Ensure proper headers are forwarded
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods":
              "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-Requested-With",
          },
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.log(" Proxy error:", err);
            });
            proxy.on("proxyReq", (proxyReq, req, res) => {
              console.log(
                ` Proxying: ${req.method} ${req.url} to ${options.target}`
              );
              // Ensure cookies are forwarded
              if (req.headers.cookie) {
                proxyReq.setHeader("cookie", req.headers.cookie);
              }
              // Add Safari-specific headers
              proxyReq.setHeader("Cache-Control", "no-cache");
              proxyReq.setHeader("Pragma", "no-cache");
            });
            proxy.on("proxyRes", (proxyRes, req, res) => {
              console.log(
                `Proxy response: ${proxyRes.statusCode} for ${req.url}`
              );
              // Add Safari-specific response headers
              proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
              proxyRes.headers["Access-Control-Allow-Origin"] =
                req.headers.origin || "*";
              proxyRes.headers["Cache-Control"] =
                "no-cache, no-store, must-revalidate";
              proxyRes.headers["Pragma"] = "no-cache";
              proxyRes.headers["Expires"] = "0";
            });
          },
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
      rollupOptions: {
        output: {
          // Safari-specific optimizations
          manualChunks: {
            vendor: ["react", "react-dom"],
            google: ["https://accounts.google.com/gsi/client"],
          },
        },
      },
    },
    define: {
      // Add Safari detection for build-time optimizations
      __SAFARI_COMPAT__: JSON.stringify(true),
    },
  };
});
