import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        configure: proxy => {
          let warned = 0;
          proxy.on('error', () => {
            if (Date.now() - warned < 10_000) return;
            warned = Date.now();
            console.warn('\n  ⚠ The News API is not running on :8787. Start both with `npm run dev` (or `npm run dev:server`).\n');
          });
        },
      },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
