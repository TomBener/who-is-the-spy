import type { Server, Socket } from 'socket.io';
import type {
  AckResult,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@spy/shared';
import { MAX_PLAYERS } from '@spy/shared';
import {
  RoomManager,
  toRoomState,
  newPlayer,
  defaultConfig,
} from './roomManager.js';
import type { PlayerRecord, ServerRoom } from './roomManager.js';
import {
  GameError,
  advancePhase,
  applyConfig,
  blankGuess,
  castVote,
  forgetRoom,
  restartGame,
  secretFor,
  startGame,
} from './game.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Attach all socket.io handlers. One {@link RoomManager} backs the whole
 * server. Every handler that mutates state finishes by broadcasting
 * `room:state` to the room (see {@link broadcast}); secrets travel only over
 * the private `you:secret` channel.
 */
export function registerHandlers(io: TypedServer): void {
  const mgr = new RoomManager();

  /** Broadcast the public snapshot to everyone in the room. */
  const broadcast = (room: ServerRoom): void => {
    io.to(room.code).emit('room:state', toRoomState(room));
  };

  /** Send a private `you:secret` to whichever socket owns `playerId`. */
  const emitSecretTo = (
    room: ServerRoom,
    playerId: string,
    secret: Parameters<ServerToClientEvents['you:secret']>[0],
  ): void => {
    const socketId = findSocketId(io, room.code, playerId);
    if (socketId) io.to(socketId).emit('you:secret', secret);
  };

  io.on('connection', (socket: TypedSocket) => {
    // ----------------------------- create -----------------------------
    socket.on('room:create', (payload, cb) => {
      const ack = safeAck(cb);
      const name = (payload?.name ?? '').trim();
      const playerId = payload?.playerId?.trim();
      if (!playerId || !name) {
        ack({ ok: false, error: 'invalid_config' });
        return;
      }

      const config = defaultConfig();
      // The lang chosen at create time seeds the word-bank language.
      if (payload.lang === 'zh' || payload.lang === 'en') {
        config.lang = payload.lang;
      }

      const room = mgr.createRoom({ id: playerId, name }, config);
      joinSocketToRoom(socket, mgr, room, playerId);

      socket.emit('you:id', playerId);
      ack({ ok: true, code: room.code });
      broadcast(room);
    });

    // ------------------------------ join ------------------------------
    socket.on('room:join', (payload, cb) => {
      const ack = safeAck(cb);
      const name = (payload?.name ?? '').trim();
      const playerId = payload?.playerId?.trim();
      const code = (payload?.code ?? '').trim().toUpperCase();
      if (!playerId || !name || !code) {
        ack({ ok: false, error: 'invalid_config' });
        return;
      }

      const room = mgr.get(code);
      if (!room) {
        ack({ ok: false, error: 'room_not_found' });
        return;
      }

      const existing = room.players.get(playerId);

      if (existing) {
        // Reconnection: resume the same seat.
        existing.connected = true;
        existing.name = name || existing.name;
        joinSocketToRoom(socket, mgr, room, playerId);
        socket.emit('you:id', playerId);
        ack({ ok: true, code: room.code });

        // If a round is in progress, re-send this player's secret.
        if (room.phase !== 'lobby') {
          socket.emit('you:secret', secretFor(existing));
        }
        broadcast(room);
        return;
      }

      // New player joining.
      if (room.phase !== 'lobby') {
        ack({ ok: false, error: 'already_started' });
        return;
      }
      if (room.players.size >= MAX_PLAYERS) {
        ack({ ok: false, error: 'room_full' });
        return;
      }
      // Names must be unique within a room (case-insensitive) for clarity.
      const taken = [...room.players.values()].some(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );
      if (taken) {
        ack({ ok: false, error: 'name_taken' });
        return;
      }

      room.players.set(playerId, newPlayer(playerId, name, false));
      joinSocketToRoom(socket, mgr, room, playerId);
      socket.emit('you:id', playerId);
      ack({ ok: true, code: room.code });
      broadcast(room);
    });

    // ------------------------------ leave ------------------------------
    socket.on('room:leave', () => {
      const ctx = mgr.getBySocket(socket.id);
      if (!ctx) return;
      const { room } = ctx;
      mgr.unbindSocket(socket.id);
      void socket.leave(room.code);

      // Explicit leave always removes the seat (even mid-game).
      const { roomDeleted } = mgr.removePlayer(room, ctx.player.id);
      if (roomDeleted) {
        forgetRoom(room.code);
        return;
      }
      broadcast(room);
    });

    // ----------------------------- config -----------------------------
    socket.on('game:config', (payload) => {
      withHost(socket, mgr, (room) => {
        if (room.phase !== 'lobby') throw new GameError('already_started');
        applyConfig(room, payload?.config ?? {});
        broadcast(room);
      });
    });

    // ------------------------------ start ------------------------------
    socket.on('game:start', () => {
      withHost(socket, mgr, (room) => {
        const emits = startGame(room);
        for (const e of emits) emitSecretTo(room, e.playerId, e.secret);
        broadcast(room);
      });
    });

    // --------------------------- phase:next ---------------------------
    socket.on('phase:next', () => {
      withHost(socket, mgr, (room) => {
        advancePhase(room);
        broadcast(room);
      });
    });

    // ------------------------------ vote ------------------------------
    socket.on('game:vote', (payload) => {
      const ctx = mgr.getBySocket(socket.id);
      if (!ctx) {
        socket.emit('error', { code: 'room_not_found' });
        return;
      }
      const targetId = payload?.targetId;
      if (!targetId) {
        socket.emit('error', { code: 'invalid_config' });
        return;
      }
      try {
        const { allVoted } = castVote(ctx.room, ctx.player.id, targetId);
        // Auto-tally once everyone alive has voted.
        if (allVoted) advancePhase(ctx.room);
        broadcast(ctx.room);
      } catch (err) {
        emitError(socket, err);
      }
    });

    // --------------------------- blank guess ---------------------------
    socket.on('blank:guess', (payload) => {
      const ctx = mgr.getBySocket(socket.id);
      if (!ctx) {
        socket.emit('error', { code: 'room_not_found' });
        return;
      }
      try {
        blankGuess(ctx.room, ctx.player.id, payload?.guess ?? '');
        broadcast(ctx.room);
      } catch (err) {
        emitError(socket, err);
      }
    });

    // ----------------------------- restart -----------------------------
    socket.on('game:restart', () => {
      withHost(socket, mgr, (room) => {
        const emits = restartGame(room);
        for (const e of emits) emitSecretTo(room, e.playerId, e.secret);
        broadcast(room);
      });
    });

    // --------------------------- disconnect ---------------------------
    socket.on('disconnect', () => {
      const ref = mgr.unbindSocket(socket.id);
      if (!ref) return;
      const room = mgr.get(ref.roomCode);
      if (!room) return;
      const player = room.players.get(ref.playerId);
      if (!player) return;

      if (room.phase === 'lobby') {
        // In lobby, drop the seat entirely.
        const { roomDeleted } = mgr.removePlayer(room, player.id);
        if (roomDeleted) {
          forgetRoom(room.code);
          return;
        }
      } else {
        // Mid-game: keep the seat so they can rejoin; just mark offline.
        player.connected = false;
        // If the host dropped, hand the crown to a connected player.
        if (room.hostId === player.id) mgr.reassignHost(room);
      }
      broadcast(room);
    });
  });
}

// ----------------------------- internals -----------------------------

/** Bind a socket to a seat and join the socket.io room channel. */
function joinSocketToRoom(
  socket: TypedSocket,
  mgr: RoomManager,
  room: ServerRoom,
  playerId: string,
): void {
  // If this socket was previously in another room, clean that up first.
  const prev = mgr.unbindSocket(socket.id);
  if (prev && prev.roomCode !== room.code) void socket.leave(prev.roomCode);

  mgr.bindSocket(socket.id, room.code, playerId);
  // Stash the playerId on the socket so findSocketId can target the right
  // socket when re-sending a private `you:secret`.
  (socket.data as SocketData).playerId = playerId;
  void socket.join(room.code);
}

/**
 * Resolve the live socket id currently bound to (roomCode, playerId) by
 * scanning the room's socket.io channel. We match against the manager's
 * binding, so only the player's most recent socket receives the secret.
 */
function findSocketId(
  io: TypedServer,
  roomCode: string,
  playerId: string,
): string | undefined {
  const room = io.sockets.adapter.rooms.get(roomCode);
  if (!room) return undefined;
  for (const sid of room) {
    const s = io.sockets.sockets.get(sid) as TypedSocket | undefined;
    if (!s) continue;
    // The manager binding is the source of truth; re-check via data we set.
    if ((s.data as SocketData).playerId === playerId) return sid;
  }
  return undefined;
}

interface SocketData {
  playerId?: string;
}

/**
 * Run `fn` only if the calling socket is the host of its room, emitting a
 * stable `error` code otherwise. Centralises the host-authority guard for
 * `game:config` / `game:start` / `phase:next` / `game:restart`.
 */
function withHost(
  socket: TypedSocket,
  mgr: RoomManager,
  fn: (room: ServerRoom, player: PlayerRecord) => void,
): void {
  const ctx = mgr.getBySocket(socket.id);
  if (!ctx) {
    socket.emit('error', { code: 'room_not_found' });
    return;
  }
  if (ctx.room.hostId !== ctx.player.id) {
    socket.emit('error', { code: 'not_host' });
    return;
  }
  try {
    fn(ctx.room, ctx.player);
  } catch (err) {
    emitError(socket, err);
  }
}

/** Map a thrown GameError (or unknown) to a recoverable `error` emit. */
function emitError(socket: TypedSocket, err: unknown): void {
  if (err instanceof GameError) {
    socket.emit('error', { code: err.code, message: err.message });
  } else {
    socket.emit('error', { code: 'internal_error' });
  }
}

/** Wrap an ack callback so a missing/throwing client callback can't crash us. */
function safeAck(
  cb: ((r: AckResult) => void) | undefined,
): (r: AckResult) => void {
  return (r: AckResult) => {
    try {
      cb?.(r);
    } catch {
      /* client ack threw — ignore */
    }
  };
}
