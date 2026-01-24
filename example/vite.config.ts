import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../admin/src"),
      "convex-cms/admin": path.resolve(__dirname, "../admin/src/embed"),
      "convex-cms/react": path.resolve(__dirname, "../src/react/index.ts"),
      "convex-cms": path.resolve(__dirname, "../src/client/index.ts"),
      // Deduplicate React - ensure admin uses example's React instance
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
});
