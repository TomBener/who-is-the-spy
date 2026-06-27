import { customAlphabet } from 'nanoid';
import type {
  GameConfig,
  PublicPlayer,
  Role,
  RoomState,
} from '@spy/shared';
import { DEFAULT_CONFIG, ROOM_CODE_LENGTH } from '@spy/shared';

/**
 * Server-only per-player record. This is the AUTHORITATIVE seat.
 * Players are keyed by their persistent `playerId` (NOT socket id) so they
 * can reconnect into the same seat and keep their secret.
 *
 * `role` / `word` live here and are NEVER copied into `PublicPlayer` /
 * `RoomState` — they are only ever sent to the owning socket via `you:secret`.
 */
export interface PlayerRecord {
  id: string; // persistent playerId
  name: string;
  isHost: boolean;
  connected: boolean;
  alive: boolean;
  hasVoted: boolean;
  votesReceived: number;
  /** Secret identity — only assigned once a round is dealt. */
  role: Role | null;
  word: string | null;
}

/**
 * Full server-side room state. The subset that is safe to broadcast is
 * projected by {@link toRoomState}; everything secret (roles/words, raw
 * votes) stays in this object and never crosses the wire publicly.
 */
export interface ServerRoom {
  code: string;
  phase: RoomState['phase'];
  round: number;
  config: GameConfig;
  hostId: string;
  /** Insertion-ordered map of playerId -> record. */
  players: Map<string, PlayerRecord>;
  speakingOrder: string[];
  currentSpeaker: number;
  eliminated: RoomState['eliminated'];
  winner: RoomState['winner'];
  revealWords: RoomState['revealWords'];
  /** Per-round raw vote tally: voterId -> targetId. Cleared each round. */
  votes: Map<string, string>;
}

// Unambiguous uppercase alphabet: no 0/O/1/I, and drop the visually-confusable
// vowel-less ambiguities people mistype on phones. 4 chars from this set is
// plenty for the handful of concurrent rooms a party game has.
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = customAlphabet(ROOM_ALPHABET, ROOM_CODE_LENGTH);

export class RoomManager {
  private rooms = new Map<string, ServerRoom>();
  /** socketId -> which seat that socket currently occupies. */
  private sockets = new Map<string, { roomCode: string; playerId: string }>();

  get(code: string): ServerRoom | undefined {
    return this.rooms.get(code);
  }

  getBySocket(
    socketId: string,
  ): { room: ServerRoom; player: PlayerRecord } | undefined {
    const ref = this.sockets.get(socketId);
    if (!ref) return undefined;
    const room = this.rooms.get(ref.roomCode);
    const player = room?.players.get(ref.playerId);
    if (!room || !player) return undefined;
    return { room, player };
  }

  bindSocket(socketId: string, roomCode: string, playerId: string): void {
    this.sockets.set(socketId, { roomCode, playerId });
  }

  /** Returns the seat a socket was bound to (if any) and forgets the binding. */
  unbindSocket(
    socketId: string,
  ): { roomCode: string; playerId: string } | undefined {
    const ref = this.sockets.get(socketId);
    this.sockets.delete(socketId);
    return ref;
  }

  /** Create a fresh room with a unique code; `host` becomes the host seat. */
  createRoom(host: { id: string; name: string }, config: GameConfig): ServerRoom {
    let code = makeCode();
    while (this.rooms.has(code)) code = makeCode();

    const room: ServerRoom = {
      code,
      phase: 'lobby',
      round: 0,
      config: { ...config },
      hostId: host.id,
      players: new Map(),
      speakingOrder: [],
      currentSpeaker: 0,
      eliminated: null,
      winner: null,
      revealWords: null,
      votes: new Map(),
    };
    room.players.set(host.id, newPlayer(host.id, host.name, true));
    this.rooms.set(code, room);
    return room;
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }

  /**
   * Remove a player from a room and garbage-collect the room if it is now
   * empty. If the departing player was host, reassign host to any other
   * connected player (falling back to any remaining player). Returns the new
   * host id if it changed, so the caller can react if needed.
   */
  removePlayer(room: ServerRoom, playerId: string): { roomDeleted: boolean } {
    const wasHost = room.hostId === playerId;
    room.players.delete(playerId);

    if (room.players.size === 0) {
      this.rooms.delete(room.code);
      return { roomDeleted: true };
    }
    if (wasHost) this.reassignHost(room);
    return { roomDeleted: false };
  }

  /** Promote the first connected player (else the first remaining) to host. */
  reassignHost(room: ServerRoom): void {
    const players = [...room.players.values()];
    const next = players.find((p) => p.connected) ?? players[0];
    if (!next) return;
    for (const p of room.players.values()) p.isHost = p.id === next.id;
    room.hostId = next.id;
  }
}

/** Factory for a brand-new player record (no secret yet). */
export function newPlayer(
  id: string,
  name: string,
  isHost: boolean,
): PlayerRecord {
  return {
    id,
    name,
    isHost,
    connected: true,
    alive: true,
    hasVoted: false,
    votesReceived: 0,
    role: null,
    word: null,
  };
}

/**
 * Project the authoritative {@link ServerRoom} down to the public
 * {@link RoomState} that is safe to broadcast. Critically this NEVER includes
 * any player's `role` or `word`; those only travel via the private
 * `you:secret` channel.
 */
export function toRoomState(room: ServerRoom): RoomState {
  const players: PublicPlayer[] = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    connected: p.connected,
    alive: p.alive,
    hasVoted: p.hasVoted,
    votesReceived: p.votesReceived,
  }));

  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    players,
    config: room.config,
    hostId: room.hostId,
    speakingOrder: room.speakingOrder,
    currentSpeaker: room.currentSpeaker,
    eliminated: room.eliminated,
    winner: room.winner,
    revealWords: room.revealWords,
  };
}

/** Default config used when a room is first created. */
export function defaultConfig(): GameConfig {
  return { ...DEFAULT_CONFIG };
}
