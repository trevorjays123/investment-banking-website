/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a56db',
          dark: '#1e40af',
          light: '#3b82f6'
        },
        gold: {
          DEFAULT: '#d4a853',
          light: '#f0c674',
          dark: '#b8923f'
        },
        dark: {
          DEFAULT: '#0a192f',
          secondary: '#112240'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif']
      }
    },
  },
  plugins: [],
}
