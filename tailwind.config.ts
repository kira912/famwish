import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './app/components/**/*.{vue,js,ts,jsx,tsx}',
    './app/layouts/**/*.{vue,js,ts,jsx,tsx}',
    './app/pages/**/*.{vue,js,ts,jsx,tsx}',
    './app/app.vue'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e', // Rose festif
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c051e',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eecc',
          200: '#ecdd98',
          300: '#e0c65e',
          400: '#d7b032',
          500: '#bf9520',
          600: '#a37617',
          700: '#825616',
          800: '#6c4518',
          900: '#5a3818',
        },
        pine: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif']
      },
      boxShadow: {
        'glow': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
        'glow-gold': '0 0 25px -5px rgba(215, 176, 50, 0.3)',
        'soft': '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        shimmer: {
          'from': { backgroundPosition: '200% 0' },
          'to': { backgroundPosition: '-200% 0' },
        }
      }
    }
  }
}
