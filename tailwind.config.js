/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink:  '#1a0a2e',
          glow: '#c8ff00',
        },
      },
      animation: {
        'float-glow': 'float-glow 3s ease-in-out infinite',
      },
      keyframes: {
        'float-glow': {
          '0%, 100%': { transform: 'scale(1)',    boxShadow: '0 0 20px rgba(200,255,0,0.4)' },
          '50%':       { transform: 'scale(1.08)', boxShadow: '0 0 42px rgba(200,255,0,0.85)' },
        },
      },
    },
  },
  plugins: [],
}
