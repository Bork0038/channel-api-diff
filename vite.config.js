import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cors from 'koa-cors';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    middlewares: [
      cors(),
    ],
  }
})
