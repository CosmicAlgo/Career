/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0f',
          panel: '#111118',
          border: '#1e1e2e',
          grid: '#1a1a24',
          green: '#22c55e',
          'green-dim': '#16a34a',
          red: '#ef4444',
          'red-dim': '#dc2626',
        },
        accent: {
          amber: '#fbbf24',
          'amber-dim': '#d97706',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.15)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        }
      },
      animation: {
        blink: 'blink 1s step-end infinite',
      }
    },
  },
  plugins: [],
}
