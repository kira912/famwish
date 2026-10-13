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
          50: '#fff1f3',
          100: '#ffe4e8',
          200: '#fecdd6',
          300: '#fda4b4',
          400: '#fb718d',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c051e',
        },
        xmas: {
          50: '#fdf2f2',
          100: '#fde2e2',
          200: '#fbcaca',
          300: '#f8a5a5',
          400: '#f27171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#631717',
          950: '#3a0c0c',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
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
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif']
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 12px 28px -6px rgba(15, 23, 42, 0.1), 0 4px 12px -2px rgba(15, 23, 42, 0.05)',
        'elevated': '0 20px 40px -12px rgba(15, 23, 42, 0.15)',
        'glow': '0 8px 24px -4px rgba(225, 29, 72, 0.25)',
        'glow-gold': '0 8px 24px -4px rgba(202, 138, 4, 0.25)',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'scale-up': 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        scaleUp: {
          'from': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' },
        }
      }
    }
  }
}
