import { DurableObject } from 'cloudflare:workers';
import type {
  ClientMsg,
  SecretAssignment,
  ServerMsg,
} from '@spy/shared';
import { API_CREATE, DEFAULT_CONFIG, MAX_PLAYERS } from '@spy/shared';
import type { Env } from './index.js';
import type { SerializedRoom, ServerRoom } from './room.js';
import {
  createRoom,
  deserializeRoom,
  newPlayer,
  reassignHost,
  serializeRoom,
  toRoomState,
} from './room.js';
import {
  GameError,
  advancePhase,
  applyConfig,
  blankGuess,
  castVote,
  restartGame,
  secretFor,
  startGame,
} from './game.js';

/** The seat a socket is bound to, stashed via {@link WebSocket.serializeAttachment}. */
interface SocketAttachment {
  playerId: string;
}

/**
 * Grace period after a disconnect before we act on it (purge lobby seats,
 * hand off the host crown). A page refresh drops the socket for only a second
 * or two; without this grace, refreshing in the lobby would delete your seat
 * (and destroy the room entirely if you were alone in it).
 */
const DISCONNECT_GRACE_MS = 30_000;

/**
 * One Durable Object instance == one room. Holds the authoritative
 * {@link ServerRoom} plus every player's WebSocket via the Hibernation API.
 *
 * Hibernation: when all sockets are idle the runtime may evict this object
 * from memory while keeping the (hibernatable) WebSockets open. We therefore
 * treat `this.room` as a pure cache: every mutation is written back to DO
 * storage (`serializeRoom`), and {@link getRoom} lazily rehydrates from
 * storage after a wake. Socket->seat bindings survive hibernation because they
 * live in each socket's serialized attachment, not in memory.
 */
export class RoomDO extends DurableObject<Env> {
  /** In-memory cache of the room; rebuilt from storage on demand. */
  private room: ServerRoom | null = null;

  /** Lazily load (and cache) the room from storage. */
  private async getRoom(): Promise<ServerRoom | null> {
    if (this.room) return this.room;
    const stored = await this.ctx.storage.get<SerializedRoom>('room');
    if (!stored) return null;
    this.room = deserializeRoom(stored);
    return this.room;
  }

  /** Persist the current room snapshot to DO storage. */
  private async persist(room: ServerRoom): Promise<void> {
    this.room = room;
    await this.ctx.storage.put('room', serializeRoom(room));
  }

  // ------------------------------ HTTP ------------------------------

  override async fetch(request: Request): Promise<Response> {
    const code = request.headers.get('x-room-code') ?? '';
    const url = new URL(request.url);

    // WebSocket upgrade — all live game traffic flows here.
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      // Hibernation API: the runtime owns the socket; we get woken via the
      // webSocket* handlers below. The owning playerId is learned from the
      // first `hello` message and stored on the socket's attachment.
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // create vs join is distinguished by path; the Worker only forwards POSTs.
    if (request.method === 'POST') {
      if (url.pathname === API_CREATE) {
        return this.handleCreate(request, code);
      }
      return this.handleJoin(request, code);
    }

    return new Response('not found', { status: 404 });
  }

  /**
   * Create the room with the caller as host. If a room already exists in
   * storage, respond 409 so the Worker retries with a fresh code.
   */
  private async handleCreate(request: Request, code: string): Promise<Response> {
    const existing = await this.getRoom();
    if (existing) {
      return json({ ok: false, error: 'already_started' }, 409);
    }

    const body = (await request.json().catch(() => ({}))) as {
      playerId?: string;
      name?: string;
      lang?: string;
    };
    const playerId = (body.playerId ?? '').trim();
    const name = (body.name ?? '').trim();
    if (!playerId || !name) {
      return json({ ok: false, error: 'invalid_config' }, 400);
    }

    const config = { ...DEFAULT_CONFIG };
    // The lang chosen at create time seeds the word-bank language.
    if (body.lang === 'zh' || body.lang === 'en') config.lang = body.lang;

    const room = createRoom(code, { id: playerId, name }, config);
    await this.persist(room);
    return json({ ok: true, code });
  }

  /**
   * Join an existing room (or resume a held seat). Validation mirrors the
   * original socket.io handler.
   */
  private async handleJoin(request: Request, code: string): Promise<Response> {
    const room = await this.getRoom();
    if (!room) {
      return json({ ok: false, error: 'room_not_found' }, 404);
    }

    const body = (await request.json().catch(() => ({}))) as {
      playerId?: string;
      name?: string;
    };
    const playerId = (body.playerId ?? '').trim();
    const name = (body.name ?? '').trim();
    if (!playerId || !name) {
      return json({ ok: false, error: 'invalid_config' }, 400);
    }

    const existing = room.players.get(playerId);
    if (existing) {
      // Reconnection: resume the same seat. (The socket re-binds on `hello`.)
      existing.name = name || existing.name;
      await this.persist(room);
      return json({ ok: true, code });
    }

    // New player joining.
    if (room.phase !== 'lobby') {
      return json({ ok: false, error: 'already_started' }, 409);
    }
    if (room.players.size >= MAX_PLAYERS) {
      return json({ ok: false, error: 'room_full' }, 409);
    }
    const taken = [...room.players.values()].some(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) {
      return json({ ok: false, error: 'name_taken' }, 409);
    }

    room.players.set(playerId, newPlayer(playerId, name, false));
    await this.persist(room);
    return json({ ok: true, code });
  }

  // --------------------------- WebSocket ---------------------------

  override async webSocketMessage(
    ws: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : '') as ClientMsg;
    } catch {
      send(ws, { t: 'error', code: 'internal_error' });
      return;
    }

    try {
      if (msg.t === 'hello') {
        await this.onHello(ws, msg.playerId);
        return;
      }

      // All other actions require an already-bound seat.
      const attachment = ws.deserializeAttachment() as SocketAttachment | null;
      const playerId = attachment?.playerId;
      const room = await this.getRoom();
      if (!playerId || !room || !room.players.get(playerId)) {
        send(ws, { t: 'error', code: 'room_not_found' });
        return;
      }

      await this.onAction(ws, room, playerId, msg);
    } catch (err) {
      if (err instanceof GameError) {
        send(ws, { t: 'error', code: err.code, message: err.message });
      } else {
        send(ws, { t: 'error', code: 'internal_error' });
      }
    }
  }

  /** Bind a (re)connecting socket to its seat and prime its view. */
  private async onHello(ws: WebSocket, playerId: string): Promise<void> {
    const room = await this.getRoom();
    const seat = room?.players.get(playerId);
    if (!room || !seat) {
      send(ws, { t: 'error', code: 'room_not_found' });
      ws.close(1000, 'room_not_found');
      return;
    }

    ws.serializeAttachment({ playerId } satisfies SocketAttachment);
    seat.connected = true;

    send(ws, { t: 'id', playerId });
    send(ws, { t: 'state', state: toRoomState(room) });
    // If a round is in progress, hand this socket its private secret.
    if (room.phase !== 'lobby') {
      send(ws, { t: 'secret', secret: secretFor(seat) });
    }

    await this.persist(room);
    // Let everyone see them (re)connect.
    this.broadcast(room);
  }

  /** Dispatch a non-hello client intent against the authoritative room. */
  private async onAction(
    ws: WebSocket,
    room: ServerRoom,
    playerId: string,
    msg: Exclude<ClientMsg, { t: 'hello' }>,
  ): Promise<void> {
    const isHost = room.hostId === playerId;
    const requireHost = (): void => {
      if (!isHost) throw new GameError('not_host');
    };

    switch (msg.t) {
      case 'config': {
        requireHost();
        if (room.phase !== 'lobby') throw new GameError('already_started');
        applyConfig(room, msg.config ?? {});
        break;
      }

      case 'start': {
        requireHost();
        const emits = startGame(room);
        await this.persist(room);
        for (const e of emits) this.sendSecret(e.playerId, e.secret);
        this.broadcast(room);
        return;
      }

      case 'phaseNext': {
        requireHost();
        advancePhase(room);
        break;
      }

      case 'vote': {
        const { allVoted } = castVote(room, playerId, msg.targetId);
        // Auto-tally once everyone alive has voted.
        if (allVoted) advancePhase(room);
        break;
      }

      case 'blankGuess': {
        blankGuess(room, playerId, msg.guess ?? '');
        break;
      }

      case 'restart': {
        requireHost();
        const emits = restartGame(room);
        await this.persist(room);
        for (const e of emits) this.sendSecret(e.playerId, e.secret);
        this.broadcast(room);
        return;
      }

      case 'leave': {
        await this.removeSeat(room, playerId);
        ws.close(1000, 'left');
        return;
      }
    }

    await this.persist(room);
    this.broadcast(room);
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    await this.onDisconnect(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.onDisconnect(ws);
  }

  /**
   * A socket dropped. The seat is kept (marked offline) in every phase so a
   * page refresh / brief network blip can resume it; the alarm below handles
   * players who never come back (lobby seat purge + host handoff) after
   * {@link DISCONNECT_GRACE_MS}.
   */
  private async onDisconnect(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    const room = await this.getRoom();
    if (!room) return;
    const seat = room.players.get(playerId);
    if (!seat) return;

    seat.connected = false;
    await this.persist(room);
    this.broadcast(room);
    await this.ctx.storage.setAlarm(Date.now() + DISCONNECT_GRACE_MS);
  }

  /**
   * Deferred disconnect cleanup. Runs {@link DISCONNECT_GRACE_MS} after the
   * most recent disconnect: purges lobby seats that never reconnected
   * (destroying an emptied room), and hands the host crown to a connected
   * player if the host is still gone.
   */
  override async alarm(): Promise<void> {
    const room = await this.getRoom();
    if (!room) return;
    let changed = false;

    if (room.phase === 'lobby') {
      for (const p of [...room.players.values()]) {
        if (!p.connected) {
          room.players.delete(p.id);
          changed = true;
        }
      }
      if (room.players.size === 0) {
        this.room = null;
        await this.ctx.storage.deleteAll();
        return;
      }
    }

    const host = room.players.get(room.hostId);
    if (!host || !host.connected) {
      reassignHost(room);
      changed = true;
    }

    if (changed) {
      await this.persist(room);
      this.broadcast(room);
    }
  }

  /**
   * Remove a seat. If the room is now empty, wipe storage entirely. Otherwise
   * reassign host if the leaver held it, persist and broadcast. Returns true
   * if the room was destroyed.
   */
  private async removeSeat(room: ServerRoom, playerId: string): Promise<boolean> {
    const wasHost = room.hostId === playerId;
    room.players.delete(playerId);

    if (room.players.size === 0) {
      this.room = null;
      await this.ctx.storage.deleteAll();
      return true;
    }

    if (wasHost) reassignHost(room);
    await this.persist(room);
    this.broadcast(room);
    return false;
  }

  // ---------------------------- transport ----------------------------

  /** Broadcast the public snapshot to every connected socket. */
  private broadcast(room: ServerRoom): void {
    const state = toRoomState(room);
    for (const ws of this.ctx.getWebSockets()) {
      send(ws, { t: 'state', state });
    }
  }

  /**
   * Send a private `secret` to every socket owned by `playerId` — a player may
   * have more than one live socket (second tab, overlapping reconnect), and
   * all of them must see the same secret.
   */
  private sendSecret(playerId: string, secret: SecretAssignment | null): void {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as SocketAttachment | null;
      if (attachment?.playerId === playerId) {
        send(ws, { t: 'secret', secret });
      }
    }
  }
}

// ----------------------------- helpers -----------------------------

/** JSON.stringify a server message and send it (swallowing dead-socket errors). */
function send(ws: WebSocket, msg: ServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket already closing — ignore */
  }
}

/** Build a JSON `Response` with the given status. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
