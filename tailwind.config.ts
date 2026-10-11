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
          950: "#050816",
          900: "#0a1128",
          800: "#18213f",
          700: "#252f55",
        },
        sky: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        forest: "#2556E8",
        sunflower: "#7C3AED",
        "warm-bg": "#050816",
        charcoal: "#E8ECFF",
        leaf: "#0891B2",
        coral: "#3B6CF6",
      },
    },
  },
  plugins: [],
};
export default config;
