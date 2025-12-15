import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  publicDir: 'deployments'
})
