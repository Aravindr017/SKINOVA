/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4',
          400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E',
          800: '#115E59', 900: '#134E4A', 950: '#042F2E',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'scan': 'scan 2.5s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        'scan': { '0%': {top:'0%'}, '50%': {top:'95%'}, '100%': {top:'0%'} },
        'fade-up': { from:{opacity:'0',transform:'translateY(20px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        'scale-in': { from:{opacity:'0',transform:'scale(0.95)'}, to:{opacity:'1',transform:'scale(1)'} },
      }
    },
  },
  plugins: [],
}
