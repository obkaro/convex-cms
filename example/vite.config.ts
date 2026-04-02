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
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@convex", replacement: path.resolve(__dirname, "./convex") },
      { find: "~", replacement: path.resolve(__dirname, "../admin/src") },
      { find: /^convex-cms\/admin\/index\.css$/, replacement: path.resolve(__dirname, "../admin/src/index.css") },
      { find: /^convex-cms\/admin\/globals\.css$/, replacement: path.resolve(__dirname, "../admin/src/styles/globals.css") },
      { find: /^convex-cms\/admin\/theme\.css$/, replacement: path.resolve(__dirname, "../admin/src/styles/theme.css") },
      { find: /^convex-cms\/admin\/tailwind-config\.css$/, replacement: path.resolve(__dirname, "../admin/src/styles/tailwind-config.css") },
      { find: /^convex-cms\/admin\/embed-theme\.css$/, replacement: path.resolve(__dirname, "../admin/src/embed/theme.css") },
      { find: /^convex-cms\/admin\/src$/, replacement: path.resolve(__dirname, "../admin/src") },
      { find: /^convex-cms\/admin$/, replacement: path.resolve(__dirname, "../admin/src/embed/index.tsx") },
      { find: /^convex-cms$/, replacement: path.resolve(__dirname, "../src/client/index.ts") },
    ],
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
