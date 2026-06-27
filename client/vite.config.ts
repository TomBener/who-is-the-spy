import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { SERVER_PORT } from '../shared/src/events';

// Dev: Vite serves the SPA on :5173 and proxies /socket.io to the Node server.
// Prod: `npm run build` emits to client/dist, which the Node server serves.
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
      '/socket.io': {
        target: `http://localhost:${SERVER_PORT}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
