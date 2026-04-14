import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fuel: {
          orange: '#f97316',
          blue: '#38bdf8',
          green: '#22c55e',
          red: '#ef4444',
          amber: '#f59e0b',
        },
        dark: {
          900: '#0a0f1e',
          800: '#111827',
          700: '#1e293b',
          600: '#2d3748',
          500: '#4a5568',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0a0f1e 0%, #1a1040 50%, #0a1628 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' },
          to: { boxShadow: '0 0 40px rgba(249, 115, 22, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
