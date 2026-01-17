/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pve-blue': '#2a4a6d',
        'pve-dark': '#1a1a2e',
        'pve-accent': '#4a90d9',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
