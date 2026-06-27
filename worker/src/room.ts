import type {
  GameConfig,
  PublicPlayer,
  Role,
  RoomState,
} from '@spy/shared';

/**
 * Server-only per-player record. This is the AUTHORITATIVE seat.
 * Players are keyed by their persistent `playerId` (NOT socket id) so they
 * can reconnect into the same seat and keep their secret.
 *
 * `role` / `word` live here and are NEVER copied into `PublicPlayer` /
 * `RoomState` — they are only ever sent to the owning socket via a `secret`
 * message.
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
 * votes, the dealt pair) stays in this object and never crosses the wire
 * publicly.
 *
 * Each Durable Object instance owns exactly one of these. Because a DO can be
 * evicted/hibernated and woken on a later request, the whole object is
 * persisted to DO storage on every mutation (see {@link serializeRoom}) — the
 * dealt word pair therefore lives on the room itself (`secretPair`) rather
 * than in module-level state, which would not survive hibernation.
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
  /**
   * The actual word pair dealt for the current game. Kept OUT of RoomState so
   * it can never leak into a broadcast before 'ended'. Null in the lobby /
   * after a restart.
   */
  secretPair: { civilian: string; undercover: string } | null;
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
 * Create a fresh room for `code`; `host` becomes the host seat. The Worker
 * owns code generation + uniqueness (one DO per code), so the code is passed
 * in rather than minted here.
 */
export function createRoom(
  code: string,
  host: { id: string; name: string },
  config: GameConfig,
): ServerRoom {
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
    secretPair: null,
  };
  room.players.set(host.id, newPlayer(host.id, host.name, true));
  return room;
}

/** Promote the first connected player (else the first remaining) to host. */
export function reassignHost(room: ServerRoom): void {
  const players = [...room.players.values()];
  const next = players.find((p) => p.connected) ?? players[0];
  if (!next) return;
  for (const p of room.players.values()) p.isHost = p.id === next.id;
  room.hostId = next.id;
}

/**
 * Project the authoritative {@link ServerRoom} down to the public
 * {@link RoomState} that is safe to broadcast. Critically this NEVER includes
 * any player's `role` or `word`, nor the dealt `secretPair`; those only travel
 * via the private `secret` channel (and `revealWords`, set only at 'ended').
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

// --------------------------- persistence ---------------------------
//
// DO storage stores plain JSON, so the `players` and `votes` Maps must be
// flattened to arrays on the way out and rebuilt on the way back in. Order is
// preserved (insertion order matters for seating / speaking-order stability).

/** A JSON-serializable mirror of {@link ServerRoom} for DO storage. */
export interface SerializedRoom {
  code: string;
  phase: RoomState['phase'];
  round: number;
  config: GameConfig;
  hostId: string;
  players: PlayerRecord[];
  speakingOrder: string[];
  currentSpeaker: number;
  eliminated: RoomState['eliminated'];
  winner: RoomState['winner'];
  revealWords: RoomState['revealWords'];
  votes: [string, string][];
  secretPair: { civilian: string; undercover: string } | null;
}

export function serializeRoom(room: ServerRoom): SerializedRoom {
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    config: room.config,
    hostId: room.hostId,
    players: [...room.players.values()],
    speakingOrder: room.speakingOrder,
    currentSpeaker: room.currentSpeaker,
    eliminated: room.eliminated,
    winner: room.winner,
    revealWords: room.revealWords,
    votes: [...room.votes.entries()],
    secretPair: room.secretPair,
  };
}

export function deserializeRoom(obj: SerializedRoom): ServerRoom {
  const players = new Map<string, PlayerRecord>();
  for (const p of obj.players) players.set(p.id, p);
  return {
    code: obj.code,
    phase: obj.phase,
    round: obj.round,
    config: obj.config,
    hostId: obj.hostId,
    players,
    speakingOrder: obj.speakingOrder,
    currentSpeaker: obj.currentSpeaker,
    eliminated: obj.eliminated,
    winner: obj.winner,
    revealWords: obj.revealWords,
    votes: new Map(obj.votes),
    secretPair: obj.secretPair,
  };
}
