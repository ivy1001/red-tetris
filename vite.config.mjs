import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Subject: the server serves index.html + bundle.js (+ static assets) from build/.
  build: {
    outDir: 'build',
    rollupOptions: { output: { entryFileNames: 'bundle.js', assetFileNames: '[name][extname]' } },
  },
  // Dev: `npm run client-dev` on :5173, sockets go to the Nest server on :3004.
  server: { proxy: { '/socket.io': { target: 'http://localhost:3004', ws: true } } },
  test: {
    coverage: {
      include: ['src/**'],
      exclude: ['src/client/main.jsx', 'src/server/main.ts'],
      thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
    },
  },
})
