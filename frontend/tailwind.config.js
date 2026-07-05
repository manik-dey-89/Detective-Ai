/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050508',
        surface: '#0c0c12',
        surfaceLight: '#12121a',
        primary: '#06b6d4', // Cyan
        primaryDark: '#0891b2',
        accent: '#3b82f6', // Blue
        evidence: '#f97316', // Orange for evidence highlights
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        text: '#e2e8f0',
        textMuted: '#94a3b8',
        border: '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'slide-left': 'slideLeft 0.5s ease-out',
        'slide-right': 'slideRight 0.5s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'glow-cyan': 'glowCyan 3s ease-in-out infinite alternate',
        'glow-evidence': 'glowEvidence 2.5s ease-in-out infinite alternate',
        'spin-slow': 'spin 120s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(6, 182, 212, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(6, 182, 212, 0.7), 0 0 80px rgba(6, 182, 212, 0.3)' },
        },
        glowCyan: {
          '0%': { 
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
            textShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
          },
          '100%': { 
            boxShadow: '0 0 50px rgba(6, 182, 212, 0.6), 0 0 100px rgba(59, 130, 246, 0.3)',
            textShadow: '0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)'
          },
        },
        glowEvidence: {
          '0%': { boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(249, 115, 22, 0.7)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
