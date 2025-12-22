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
        cozy: {
          latte: "#F5E6D3",
          amber: "#F5DCC5", // WCAG AA: ~7:1 contrast with cozy-dim
          rose: "#FADDE0", // WCAG AA: ~7:1 contrast with cozy-dim
          warm: "#FEF3E8", // WCAG AA: ~9:1 contrast with cozy-dim
          dim: "#2A1F1A",
        },
      },
      borderRadius: {
        "2xl": "1.5rem",
      },
      boxShadow: {
        cozy: "0 4px 20px rgba(0, 0, 0, 0.1)",
        soft: "0 2px 10px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;

