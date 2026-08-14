import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      'lucide-react',
      '@tanstack/react-query',
      'react-router-dom',
      'axios',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [
      'framer-motion'
    ],
    force: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['192.168.0.119', 'localhost', '.local', '127.0.0.1'],
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
