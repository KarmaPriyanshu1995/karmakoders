import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        scanner: {
          bg: "var(--scanner-bg)",
          elevated: "var(--scanner-bg-elevated)",
          surface: "var(--scanner-surface)",
          raised: "var(--scanner-surface-raised)",
          brand: "var(--scanner-brand)",
          "brand-hover": "var(--scanner-brand-hover)",
          "brand-soft": "var(--scanner-brand-soft)",
          "brand-label": "var(--scanner-brand-label)",
          "on-brand": "var(--scanner-on-brand)",
          critical: "var(--scanner-critical)",
          high: "var(--scanner-high)",
          medium: "var(--scanner-medium)",
          low: "var(--scanner-low)",
          info: "var(--scanner-info)",
          success: "var(--scanner-success)",
          warning: "var(--scanner-warning)",
        },
      },
      boxShadow: {
        scanner: "var(--scanner-shadow)",
      },
      fontFamily: {
        mono: ["var(--scanner-font-mono)"],
      },
      keyframes: {
        "grade-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "grade-in": "grade-in 0.45s ease-out both",
        "fade-up": "fade-up 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
