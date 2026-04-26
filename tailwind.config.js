/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: '#0a0a0f',
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
      },
    },
  },
  plugins: [],
}
