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
      // Resolve admin package's internal aliases when importing from admin source
      "~": path.resolve(__dirname, "../admin/src"),
    },
  },
});
