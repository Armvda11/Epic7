// tailwind.config.js
module.exports = {
  darkMode: 'class', // 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // pour accentuer encore plus l'effet glow sur les barres de vie faibles
boxShadow: {
  healthGlow: '0 0 10px rgba(255, 0, 0, 0.6)',
},
      animation: {
        backgroundZoom: 'backgroundZoom 12s infinite alternate ease-in-out',
        glowEffect: 'glowEffect 1.5s infinite alternate ease-in-out',
        shake: "shake 0.4s ease-in-out",
        fall: 'fall 4s linear forwards',
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        backgroundZoom: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        glowEffect: {
          '0%': { boxShadow: '0 0 5px rgba(255,255,255,0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(255,255,255,0.6)' },
        },
        fall: {
          '0%': { transform: 'translateY(-100px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0' },
        },
      },
      colors: {
        primary: {
          light: '#f4f4fc',
          DEFAULT: '#332c56',
          dark: '#1e1e2e',
        },
        accent: '#a855f7',
      },
    },
  },
  plugins: [],
};
