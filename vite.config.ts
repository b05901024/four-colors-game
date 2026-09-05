import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/four-colors-game/',
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
