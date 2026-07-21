import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom') || (id.includes('/react/') || id.includes('/react-dom/'))) {
              return 'react-vendor'
            }
            if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('immer')) {
              return 'redux-vendor'
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor'
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'chart-vendor'
            }
            if (id.includes('framer-motion')) {
              return 'motion-vendor'
            }
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
              return 'form-vendor'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
