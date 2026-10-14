/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vetor: {
          bg: '#f7f6f2',
          paper: '#ffffff',
          ink: '#23302d',
          muted: '#687570',
          line: '#e5e9e4',
          green: '#376c5c',
          'green-dark': '#285347',
          'green-soft': '#eaf3ed',
          lilac: '#eeebf8',
          'lilac-ink': '#63548c',
          sand: '#f7efe1',
          'sand-ink': '#8d6536',
          'red-soft': '#fff0ed',
          'red-ink': '#8e4438',
        }
      },
      borderRadius: {
        'vetor': '22px',
      },
      boxShadow: {
        'vetor': '0 8px 28px rgba(32, 48, 42, .055)',
      }
    },
  },
  plugins: [],
}
