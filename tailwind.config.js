/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1B4332',
        secondary: '#40916C',
        accent: '#74C69D',
        mintBg: '#F0FFF4',
        textPrimary: '#1A1A2E',
        textSecondary: '#4A5568',
        warningColor: '#F6AD55',
        dangerColor: '#FC8181',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
