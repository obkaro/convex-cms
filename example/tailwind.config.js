/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pale color palette for Tempo
        tempo: {
          // Primary slate blues
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Warm accent
        accent: {
          muted: "#f5f0eb",
          warm: "#e8ddd4",
          coral: "#d4a59a",
          rose: "#c9b1a1",
        },
        // Status colors (muted versions)
        status: {
          planned: "#94a3b8",
          progress: "#60a5fa",
          completed: "#86efac",
          feature: "#c4b5fd",
          improvement: "#93c5fd",
          fix: "#fcd34d",
          breaking: "#fca5a5",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
      },
      borderRadius: {
        none: "0",
      },
    },
  },
  plugins: [],
};
