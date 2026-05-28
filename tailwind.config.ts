import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        deep: "#0B0F19",
        surface: "#111827",
        card: "#1F2937",
        brand: "#2563EB",
        cyan: "#06B6D4",
        soft: "#F8FAFC",
        muted: "#64748B",
        online: "#22C55E",
        offline: "#EF4444",
        warning: "#F59E0B"
      },
      boxShadow: {
        glow: "0 0 40px rgba(37, 99, 235, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
