import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@spy/shared';
import { SERVER_PORT, SOCKET_PATH } from '@spy/shared';
import { registerHandlers } from './socket.js';

const app = express();
const httpServer = createServer(app);

// Typed socket.io server. CORS is permissive for dev because phones on the LAN
// hit the Vite dev server (which proxies) or this server directly.
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: SOCKET_PATH,
  cors: { origin: true, credentials: true },
});

// Liveness probe.
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// In production, serve the built client and fall back to index.html for SPA
// routes. __dirname here is server/src; the bundled client lives at
// <repo>/client/dist.
if (process.env.NODE_ENV === 'production') {
  const here = dirname(fileURLToPath(import.meta.url));
  const clientDist = resolve(here, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback: anything not matched above returns index.html. We exclude
  // the socket.io path so realtime traffic is never swallowed by the catch-all.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith(SOCKET_PATH)) return next();
    res.sendFile(resolve(clientDist, 'index.html'));
  });
}

// Wire up all realtime game handlers.
registerHandlers(io);

// PaaS platforms (Railway/Render/Fly) inject the port to bind via $PORT, and
// require binding 0.0.0.0 (not just localhost) to be reachable. Fall back to
// SERVER_PORT for local dev. Binding 0.0.0.0 also lets phones reach it on the LAN.
const PORT = Number(process.env.PORT) || SERVER_PORT;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(
    `谁是卧底 server listening on 0.0.0.0:${PORT}  (socket path ${SOCKET_PATH})`,
  );
});
