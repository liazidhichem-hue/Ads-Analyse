import type { Config } from "tailwindcss"
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { fontFamily: { sans: ["Inter", "sans-serif"] } } },
  plugins: [],
} satisfies Config
