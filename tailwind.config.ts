import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Warm dark "rustic" palette
        espresso: {
          950: "#15100c",
          900: "#1c1611",
          800: "#241d17",
          700: "#2c241d",
          600: "#382d24",
          500: "#4a3d31",
        },
        clay: {
          50: "#f8efe7",
          200: "#e3be9a",
          300: "#d9a87f",
          400: "#cf8f5f",
          500: "#c17a4b",
          600: "#a9663c",
          700: "#8a5230",
        },
        ember: {
          300: "#f0c08a",
          400: "#e6a85f",
          500: "#d98e3d",
        },
        cream: {
          100: "#f3ece1",
          200: "#ece3d6",
          300: "#dccfbd",
          400: "#bcaa93",
          500: "#9c8a74",
          600: "#7e6e5b",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 55px -15px rgba(217, 142, 61, 0.55)",
        "glow-lg": "0 0 90px -10px rgba(217, 142, 61, 0.5)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(40px, -50px) scale(1.12)" },
          "66%": { transform: "translate(-30px, 30px) scale(0.92)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-22px) rotate(3deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0%, 0%) rotate(0deg)", opacity: "0.5" },
          "50%": { transform: "translate(8%, -6%) rotate(8deg)", opacity: "0.8" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        blob: "blob 14s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        aurora: "aurora 18s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "spin-slow": "spin-slow 22s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
