import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        forest: "#1B4332",
        sunflower: "#FFD23F",
        "warm-bg": "#FFFBF5",
        charcoal: "#1B1730",
        leaf: "#2FA66A",
        coral: "#FF6B5B",
      },
    },
  },
  plugins: [],
};
export default config;
