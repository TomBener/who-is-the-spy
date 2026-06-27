/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black surfaces (warm-neutral, NOT blue). Depth comes from hairline
        // borders, not gradients.
        noir: {
          950: '#0a0a0b',
          900: '#0f0f11',
          850: '#151517',
          800: '#1b1b1f',
          700: '#2a2a30', // hairline borders
          600: '#3c3c44',
          500: '#52525b',
        },
        // Interrogation-lamp amber — the single hot accent.
        amber: {
          DEFAULT: '#f5a623',
          300: '#f9c662',
          400: '#f7b84b',
          500: '#f5a623',
          600: '#d2860f',
          700: '#9c6309',
        },
        // Alert red — used sparingly (eliminate / spy reveal).
        alert: {
          DEFAULT: '#d6453d',
          400: '#e0635c',
          500: '#d6453d',
          600: '#b3322b',
        },
        // Warm off-white "paper" text + muted tiers.
        paper: {
          DEFAULT: '#ece8df',
          dim: '#9a968c',
          faint: '#6b6862',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"',
          '"Microsoft YaHei"', '"Segoe UI"', 'Roboto', 'sans-serif',
        ],
        // The dossier voice. System mono → universal, fast, works offline / in CN.
        mono: [
          'ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas',
          '"Liberation Mono"', '"PingFang SC"', 'monospace',
        ],
      },
      // Sharp. Override the soft defaults so nothing reads "pillowy".
      borderRadius: {
        none: '0px', sm: '2px', DEFAULT: '2px', md: '3px',
        lg: '4px', xl: '4px', '2xl': '5px', '3xl': '6px', full: '9999px',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(0,0,0,0.5), 0 18px 40px -24px rgba(0,0,0,0.95)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.7) rotate(-14deg)' },
          '55%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-7deg)' },
        },
        flicker: {
          '0%,18%,22%,25%,53%,57%,100%': { opacity: '1' },
          '20%,24%,55%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'stamp-in': 'stamp-in 0.35s cubic-bezier(0.2,1.1,0.3,1) both',
        flicker: 'flicker 1.8s steps(1,end) 1',
      },
    },
  },
  plugins: [],
};
