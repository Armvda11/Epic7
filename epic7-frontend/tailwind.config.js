export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        backgroundZoom: 'backgroundZoom 12s infinite alternate ease-in-out',
        glowEffect: 'glowEffect 1.5s infinite alternate ease-in-out',
      },
      keyframes: {
        backgroundZoom: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        glowEffect: {
          '0%': { boxShadow: '0 0 5px rgba(255,255,255,0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(255,255,255,0.6)' },
        },
      },
    },
  },
  plugins: [],
};
