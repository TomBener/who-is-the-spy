import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { WORKER_DEV_PORT } from '../shared/src/events';

// Dev: Vite serves the SPA on :5173 (with HMR) and proxies the realtime + API
// routes to the local Cloudflare Worker (`wrangler dev` on WORKER_DEV_PORT).
// Prod: `npm run build` emits client/dist, which the Worker serves as static
// assets (SPA fallback configured in wrangler.jsonc).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@spy/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true, // expose on LAN so phones can reach the dev server
    proxy: {
      '/ws': {
        target: `http://localhost:${WORKER_DEV_PORT}`,
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: `http://localhost:${WORKER_DEV_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
