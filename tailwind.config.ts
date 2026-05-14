import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Apple-style color palette (legacy — admin/technician)
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

        // Selvacore design system (theme-aware, CSS-variable-backed)
        brand: 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'brand-tint': 'var(--brand-tint)',
        ink: 'var(--ink)',
        soft: 'var(--soft)',
        paper: 'var(--paper)',
        'off-paper': 'var(--off-paper)',
        hairline: 'var(--hairline)',
        warn: 'var(--warn)',
        'warn-tint': 'var(--warn-tint)',
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'var(--font-jetbrains-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
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
        'sc-sm': 'var(--radius-sm)',
        'sc-md': 'var(--radius-md)',
        'sc-full': 'var(--radius-full)',
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'apple': '0 4px 16px rgba(0, 0, 0, 0.16)',
        'apple-lg': '0 8px 32px rgba(0, 0, 0, 0.24)',
        'apple-focus': '0 0 0 4px rgba(10, 132, 255, 0.3)',
        'sc-sm': 'var(--shadow-sm)',
        'sc-lg': 'var(--shadow-lg)',
        'sc-focus': '0 0 0 3px var(--brand-tint)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 200ms ease-in forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 220ms ease-out',
        'slide-out-right': 'slideOutRight 200ms ease-in forwards',
        'scale-in': 'scaleIn 0.2s ease-out',
        'success-pop': 'successPop 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'star-pop': 'starPop 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        successPop: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        starPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config

