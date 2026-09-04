/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#F7F2E8",
          outer: "#EFE9DC",
          card: "#FFFFFF",
          muted: "#EDE6D8",
          darker: "#E5DDD0"
        },
        ink: {
          DEFAULT: "#181818",
          dark: "#111111",
          secondary: "#6F6A63",
          light: "#A39E96",
          border: "#181818"
        },
        pastel: {
          pink: "#F1B5D7",
          yellow: "#F3D85A",
          green: "#B4C88C",
          blue: "#AFC7E8",
          purple: "#C7ADD9"
        },
        brand: {
          app: "var(--bg-app)",
          sidebar: "var(--bg-sidebar)",
          card: "var(--bg-card)",
          active: "var(--text-active)",
          muted: "var(--text-muted)",
          accent: "var(--accent-color)",
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
