import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // redirige les appels HTTP REST
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // redirige les WebSockets STOMP (/ws)
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    }
  },
  build: {
    sourcemap: false,  // Disable source maps completely for production builds
  },
  server: {
    proxy: {
      // redirige les appels HTTP REST
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // redirige les WebSockets STOMP (/ws)
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: {
        errors: true,
        warnings: false,  // Don't show warnings in the overlay
      },
    },
  }
})

