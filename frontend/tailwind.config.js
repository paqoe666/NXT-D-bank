/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- Вот это включает темную тему!
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}