import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 5180 instead of Vite's default 5173, so it doesn't clash with other
    // Vite projects (e.g. DillBreaker) running at the same time.
    port: 5180,
    // Fail instead of silently switching ports, so the VS Code debugger
    // always knows the app is at http://localhost:5180
    strictPort: true,
  },
})
