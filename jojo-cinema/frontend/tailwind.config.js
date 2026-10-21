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
          50: '#fff0f3',
          100: '#ffd6de',
          200: '#ffb3c1',
          300: '#ff7096',
          400: '#ff4d6d',
          500: '#e8193c',
          600: '#c4112e',
          700: '#9d0d25',
          800: '#7a0a1d',
          900: '#5c0815',
        },
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#273549',
          600: '#1e293b',
          700: '#1a2234',
          800: '#0f172a',
          900: '#0a0f1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
