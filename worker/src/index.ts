import type { JoinRoomPayload } from '@spy/shared';
import { API_CREATE, API_JOIN, ROOM_CODE_LENGTH, WS_PATH } from '@spy/shared';

/**
 * Worker bindings. `cloudflare:workers` / `DurableObjectNamespace` / `Fetcher`
 * globals come from @cloudflare/workers-types.
 */
export interface Env {
  /** One Durable Object per room (class RoomDO). */
  ROOM: DurableObjectNamespace;
  /** Built SPA served as static assets, with SPA fallback (wrangler.jsonc). */
  ASSETS: Fetcher;
}

// The DO class must be exported from the Worker entry so the runtime can find it.
export { RoomDO } from './do.js';

// Unambiguous uppercase alphabet: no 0/O/1/I. A handful of concurrent rooms
// for a party game makes 4 chars from this set plenty.
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return out;
}

/**
 * Forward the WebSocket upgrade to a room's DO stub, tagging it with the room
 * code. Built from the original request so the `Upgrade` semantics survive.
 */
function forwardWsToRoom(
  env: Env,
  code: string,
  request: Request,
): Promise<Response> {
  const stub = env.ROOM.get(env.ROOM.idFromName(code));
  const headers = new Headers(request.headers);
  headers.set('x-room-code', code);
  return stub.fetch(new Request(request, { headers }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ----------------------------- create -----------------------------
    if (url.pathname === API_CREATE && request.method === 'POST') {
      // Buffer the body so we can replay it across code-collision retries.
      const body = await request.text();
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = makeCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const res = await stub.fetch(
          new Request(request.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-room-code': code },
            body,
          }),
        );
        // 409 == that code is already taken; retry with a fresh one.
        if (res.status === 409) continue;
        return res;
      }
      return new Response(
        JSON.stringify({ ok: false, error: 'internal_error' }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }

    // ------------------------------ join ------------------------------
    if (url.pathname === API_JOIN && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Partial<JoinRoomPayload>;
      const code = (body.code ?? '').trim().toUpperCase();
      if (!code) {
        return new Response(
          JSON.stringify({ ok: false, error: 'room_not_found' }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        );
      }
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      return stub.fetch(
        new Request(request.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-room-code': code },
          body: JSON.stringify(body),
        }),
      );
    }

    // ----------------------------- socket -----------------------------
    if (
      url.pathname === WS_PATH &&
      request.headers.get('Upgrade') === 'websocket'
    ) {
      const code = (url.searchParams.get('code') ?? '').trim().toUpperCase();
      if (!code) return new Response('missing code', { status: 400 });
      return forwardWsToRoom(env, code, request);
    }

    // --------------------- static SPA (fallback) ---------------------
    return env.ASSETS.fetch(request);
  },
};
