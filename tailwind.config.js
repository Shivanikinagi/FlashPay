/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./frontend-utils/**/*.{js,jsx}",
    "./*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
        blue: {
          400: '#60a5fa',
          500: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      backdropBlur: {
        xl: '24px',
      },
    },
  },
  plugins: [],
}
