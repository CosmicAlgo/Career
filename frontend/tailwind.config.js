/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Terminal dark theme - Bloomberg style
        terminal: {
          bg: '#0a0a0f',
          panel: '#111118',
          border: '#1e1e2e',
          grid: '#1a1a24',
        },
        // Amber accent (primary)
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          glow: 'rgba(251, 191, 36, 0.3)',
        },
        // Green accent (positive)
        terminal: {
          green: '#22c55e',
          'green-dim': '#16a34a',
          'green-glow': 'rgba(34, 197, 94, 0.3)',
        },
        // Red accent (negative)
        terminal: {
          red: '#ef4444',
          'red-dim': '#dc2626',
          'red-glow': 'rgba(239, 68, 68, 0.3)',
        },
        // Text colors
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#64748b',
          accent: '#fbbf24',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderWidth: {
        'grid': '1px',
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.15)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
