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
      "~": path.resolve(__dirname, "./node_modules/convex-cms/admin/src"),
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
