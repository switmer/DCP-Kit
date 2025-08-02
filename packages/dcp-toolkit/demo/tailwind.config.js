/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe', 
          500: '#3b82f6',
          900: '#1e3a8a'
        },
        accent: '#10b981',
        danger: '#ef4444'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        '5xl': ['3rem', { lineHeight: '1' }]
      }
    }
  },
  plugins: []
}