import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed",
        "primary-light": "#a78bfa",
        "primary-dark": "#6d28d9",
        accent: "#db2777",
        "accent-light": "#f472b6",
        surface: "#ffffff",
        background: "#faf8ff",
        "text-primary": "#1e1b4b",
        "text-secondary": "#6b7280",
      },
      fontFamily: {
        sans: ["Cairo", "sans-serif"],
        display: ["Fredoka", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
