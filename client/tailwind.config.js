/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#102C46',
        turquoise: '#168B9A',
        purple: '#8059C5',
        gold: '#D6A343',
        bg: '#F6F8FC',
        ink: '#172B3A',
      },
      fontFamily: {
        arabic: ['Tajawal', 'Cairo', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
