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
        navy: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
          950: '#1e2a5e',
        },
        civic: {
          primary: '#1e3a5f',
          secondary: '#2d5986',
          accent: '#0ea5e9',
          teal: '#0d9488',
          bg: '#f0f4f8',
          card: '#ffffff',
          border: '#e2e8f0',
        },
        dark: {
          bg: '#111827',
          surface: '#1f2937',
          elevated: '#27364a',
          border: '#374151',
          text: '#f9fafb',
          muted: '#9ca3af',
          accent: '#38bdf8',
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

