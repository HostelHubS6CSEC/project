import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/project/',
  build: {
    chunkSizeWarningLimit: 1000 // increase limit (in KB)
  }
})
