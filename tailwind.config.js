/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#45f3ff",
        secondary: "#9d4edd",
        accent: "#f72585",
        background: "#0b0c10",
        surface: "rgba(30, 32, 40, 0.6)",
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
