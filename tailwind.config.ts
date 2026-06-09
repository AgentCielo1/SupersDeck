import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f6",
          100: "#eeeeec",
          200: "#d8d8d4",
          400: "#8a8a83",
          600: "#5b5b56",
          800: "#2a2a28",
          900: "#1a1a18",
        },
        brand: {
          50: "#eef4ff",
          100: "#d9e5ff",
          400: "#5b8def",
          600: "#2f5fd6",
          800: "#1a3a8c",
        },
        warn: { 50: "#fff7e6", 600: "#b8730a", 800: "#7a4d05" },
        danger: { 50: "#fdecec", 600: "#c03030", 800: "#7d1d1d" },
        ok: { 50: "#e9f5ec", 600: "#2c8a45", 800: "#1a5a2b" },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
      },
      borderRadius: { xl2: "14px" },
    },
  },
  plugins: [],
};

export default config;
