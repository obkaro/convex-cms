import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "./convex"),
      "~": path.resolve(__dirname, "../admin/src"),
      // CSS paths FIRST (most specific) - Vite matches greedily
      "convex-cms/admin/index.css": path.resolve(__dirname, "../admin/src/index.css"),
      // Subpath exports
      "convex-cms/admin/src": path.resolve(__dirname, "../admin/src"),
      "convex-cms/admin": path.resolve(__dirname, "../admin/src/embed/index.tsx"),
      "convex-cms/react": path.resolve(__dirname, "../src/react/index.ts"),
      "convex-cms/roles": path.resolve(__dirname, "../src/component/roles.ts"),
      "convex-cms/types": path.resolve(__dirname, "../src/client/types.ts"),
      "convex-cms/config": path.resolve(__dirname, "../src/client/config.ts"),
      // Main package LAST
      "convex-cms": path.resolve(__dirname, "../src/client/index.ts"),
    },
  },
  optimizeDeps: {
    include: [
      "use-sync-external-store",
      "use-sync-external-store/shim",
      "use-sync-external-store/shim/with-selector",
      "@tanstack/react-store",
      "@radix-ui/react-use-is-hydrated",
    ],
  },
});
