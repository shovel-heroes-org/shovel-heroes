import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // Security headers for development
    // Production headers should be set at web server level (nginx/apache)
    headers: {
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy":
        "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
      // CSP with frame-ancestors for development (production should use web server headers)
      "Content-Security-Policy":
        "frame-ancestors 'self'; default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:3001 http://localhost:8787 http://localhost:8788 https:; font-src 'self' https:; base-uri 'self'; form-action 'self';",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});
