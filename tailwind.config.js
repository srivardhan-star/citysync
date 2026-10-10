/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Purple Brand System
        brand: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7', // Secondary lavender
          600: '#9333EA',
          700: '#7C3AED', // Primary purple
          800: '#6B21A8',
          900: '#581C87',
          950: '#3B0764',
          primary: '#7C3AED',
          lavender: '#A855F7',
          pink: '#F472B6',
        },
        navy: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B', // Surface / Card
          900: '#0F172A', // Main dark background
          950: '#080D1A',
        },
        civic: {
          primary: '#7C3AED',
          secondary: '#A855F7',
          accent: '#F472B6',
          lavender: '#A855F7',
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        },
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          elevated: '#273549',
          border: '#334155',
          text: '#F8FAFC',
          muted: '#94A3B8',
          accent: '#A855F7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        notifEntrance: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-slide-in': 'fadeSlideIn 0.2s ease-out both',
        'fade-in': 'fadeIn 0.15s ease-out both',
        'scale-in': 'scaleIn 0.18s ease-out both',
        'slide-down': 'slideDown 0.2s ease-out both',
        'notif-entrance': 'notifEntrance 0.22s ease-out both',
      },
    },
  },
  plugins: [],
}
