/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce8ff',
          500: '#3b6ef5',
          600: '#2d5de0',
          700: '#2149b8',
          900: '#0f2260',
        },
      },
    },
  },
  plugins: [],
}