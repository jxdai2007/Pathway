import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ucla: {
          blue: '#2774AE',
          darkblue: '#003B5C',
          navy: '#00233B',
          gold: '#FFD100',
          darkgold: '#E8B80E',
        },
        paper: {
          DEFAULT: '#F7F3EC',
          2: '#F1EADD',
          3: '#EADFCB',
        },
        cream: '#FDFAF3',
        ink: {
          DEFAULT: '#1B1F2A',
          2: '#3C4253',
          3: '#6B7286',
          4: '#9CA2B5',
        },
        line: {
          DEFAULT: '#E4DCCB',
          2: '#EFE8D9',
        },
        urgent: {
          DEFAULT: '#C0462B',
          bg: '#FCECE6',
        },
        success: '#2E7D5B',
        branch: {
          blue: '#2774AE',
          gold: '#E8B80E',
          slate: '#6B7286',
        },
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h1: ['22px', { lineHeight: '1.2' }],
        h2: ['17px', { lineHeight: '1.3' }],
        body: ['14px', { lineHeight: '1.5' }],
        meta: ['12.5px', { lineHeight: '1.4' }],
        tiny: ['11.5px', { lineHeight: '1.3' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '22px',
      },
      boxShadow: {
        lift: '0 1px 2px rgba(80,60,30,.05), 0 12px 32px -16px rgba(80,60,30,.16)',
        panel: '0 1px 2px rgba(80,60,30,.06), 0 30px 80px -30px rgba(80,60,30,.22)',
        card: '0 1px 2px rgba(80,60,30,.04), 0 4px 12px -4px rgba(80,60,30,.10)',
      },
    },
  },
};
export default config;
