import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [react()],
  build: {
    outDir: './dist',
  },
  server: {
    // `pnpm dev:wam`으로 화면만 띄울 때도 로컬 Worker(`pnpm dev:cloudflare`)의 API를 쓴다.
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
