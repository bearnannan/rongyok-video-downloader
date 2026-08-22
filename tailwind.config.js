/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#080b11",
          surface: "rgba(13, 19, 33, 0.75)",
          card: "rgba(18, 26, 45, 0.65)",
          border: "rgba(0, 229, 255, 0.18)",
          borderGlow: "rgba(0, 229, 255, 0.45)",
          neonCyan: "#00e5ff",
          neonAmber: "#ffb300",
          neonGreen: "#00e676",
          neonRose: "#ff1744",
          neonPurple: "#7c4dff",
          textMuted: "#94a3b8",
          textBright: "#f8fafc",
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 12px rgba(0, 229, 255, 0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 24px rgba(0, 229, 255, 0.8))' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
