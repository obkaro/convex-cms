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
      "convex-cms/react": path.resolve(__dirname, "../src/react/index.ts"),
      "convex-cms": path.resolve(__dirname, "../src/client/index.ts"),
    },
  },
});
