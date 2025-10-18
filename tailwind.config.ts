import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Apple-style color palette
        background: '#000000',
        surface: '#1c1c1e',
        'surface-elevated': '#2c2c2e',
        'surface-secondary': '#3a3a3c',
        primary: '#0a84ff',
        'primary-hover': '#0071e3',
        secondary: '#5e5ce6',
        success: '#30d158',
        warning: '#ff9f0a',
        error: '#ff453a',
        text: {
          primary: '#ffffff',
          secondary: '#98989d',
          tertiary: '#636366',
        },
        border: '#38383a',
        'border-light': '#48484a',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        'apple-sm': '8px',
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'apple': '0 4px 16px rgba(0, 0, 0, 0.16)',
        'apple-lg': '0 8px 32px rgba(0, 0, 0, 0.24)',
        'apple-focus': '0 0 0 4px rgba(10, 132, 255, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config

