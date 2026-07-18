import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        night: "#111827",
        ember: "#f97316",
        mana: "#14b8a6",
        quest: "#7c3aed",
        parchment: "#f8fafc"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(17, 24, 39, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
