import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

function isExternal(id: string): boolean {
  return (
    id === "react" ||
    id.startsWith("react/") ||
    id === "react-dom" ||
    id.startsWith("react-dom/") ||
    id === "convex" ||
    id.startsWith("convex/") ||
    id === "convex-cms" ||
    id.startsWith("convex-cms/")
  );
}

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../admin-dist/embed"),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/embed/index.tsx"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: (id) => isExternal(String(id)),
    },
  },
});
