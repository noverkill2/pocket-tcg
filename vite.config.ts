import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // expõe na rede local (0.0.0.0)
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
})
