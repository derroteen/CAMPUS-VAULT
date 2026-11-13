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
        slate: {
          950: "#05070D",
          900: "#0B1020",
          800: "#141B33",
          700: "#1F2847",
        },
        sky: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        forest: "#2556E8",
        sunflower: "#F97316",
        "warm-bg": "#05070D",
        charcoal: "#E8ECFF",
        leaf: "#60A5FA",
        coral: "#3B82F6",
      },
    },
  },
  plugins: [],
};
export default config;
