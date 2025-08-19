// vite.config.js - Fixed for both localhost and 127.0.0.1
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
            });
            proxy.on("proxyRes", (proxyRes, req, res) => {
              console.log(
                `Proxy response: ${proxyRes.statusCode} for ${req.url}`
              );
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
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
    },
    define: {
      __API_URL__: JSON.stringify(process.env.VITE_API_URL),
      __NODE_ENV__: JSON.stringify(mode),
    },
    envPrefix: "VITE_",
  };
});
