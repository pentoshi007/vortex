/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyber Professional Palette
        background: {
          DEFAULT: '#0B1120', // Deep Slate
          lighter: '#151E2E',
          darker: '#050914',
        },
        surface: {
          DEFAULT: '#1E293B',
          hover: '#334155',
          active: '#475569',
        },
        primary: {
          DEFAULT: '#00E5FF', // Electric Cyan
          hover: '#33EBFF',
          active: '#00B8CC',
          glow: 'rgba(0, 229, 255, 0.5)',
        },
        secondary: {
          DEFAULT: '#2563EB', // Deep Blue
          hover: '#3B82F6',
          active: '#1D4ED8',
        },
        accent: {
          DEFAULT: '#F43F5E', // Neon Red/Pink for threats
          hover: '#FB7185',
        },
        // Semantic Colors
        success: '#10B981', // Neon Green
        warning: '#F59E0B', // Amber
        error: '#EF4444',   // Red
        info: '#3B82F6',    // Blue

        // Severity specific
        severity: {
          info: '#3b82f6',
          low: '#10b981',
          medium: '#f59e0b',
          high: '#f43f5e',
          critical: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'], // For IOCs
      },
      boxShadow: {
        'neon': '0 0 5px theme("colors.primary.DEFAULT"), 0 0 20px theme("colors.primary.glow")',
        'neon-hover': '0 0 10px theme("colors.primary.DEFAULT"), 0 0 30px theme("colors.primary.glow")',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'cyber-grid': "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px -10px theme("colors.primary.DEFAULT")' },
          'to': { boxShadow: '0 0 20px 5px theme("colors.primary.glow")' },
        }
      },
    },
  },
  plugins: [],
}
