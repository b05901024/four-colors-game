/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-red': '#E74C3C',
        'game-blue': '#3498DB',
        'game-green': '#2ECC71',
        'game-yellow': '#F1C40F',
      }
    },
  },
  plugins: [],
}
