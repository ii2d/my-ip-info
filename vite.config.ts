import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8787',
      '/ip': 'http://localhost:8787',
      '/geo': 'http://localhost:8787',
      '/json': 'http://localhost:8787',
      '/yaml': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
});
