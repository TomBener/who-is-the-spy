import type {
  GameConfig,
  Lang,
  RoomState,
  SecretAssignment,
} from './types';

// ============================================================================
// Transport contract for the Cloudflare Worker + Durable Object backend.
//
// Two channels:
//  1. HTTP POST for create/join — request/response "acks" (need a synchronous
//     ok/error + room code before a socket exists).
//  2. A single persistent WebSocket per client (opened to WS_PATH?code=CODE
//     after a successful create/join) carrying all live game traffic.
//
// Secrecy invariant (unchanged): role/word NEVER ride in a `state` message;
// they go only in a `secret` message, only to the owning socket.
// ============================================================================

// ---- HTTP create/join ----

export interface CreateRoomPayload {
  /** Persistent player id generated + stored on the client (survives reconnects). */
  playerId: string;
  name: string;
  /** Seeds the word-bank language + the creator's default UI language. */
  lang: Lang;
}

export interface JoinRoomPayload {
  playerId: string;
  code: string;
  name: string;
}

export interface AckResult {
  ok: boolean;
  code?: string;
  /** Machine-readable error key for client i18n (e.g. 'room_not_found'). */
  error?: string;
}

// ---- WebSocket message protocol ----

/** Messages the client sends over the WebSocket. Discriminated on `t`. */
export type ClientMsg =
  | { t: 'hello'; playerId: string } // sent on (re)connect to bind this socket to a seat
  | { t: 'config'; config: Partial<GameConfig> } // host only, lobby only
  | { t: 'start' } // host only
  | { t: 'phaseNext' } // host only
  | { t: 'vote'; targetId: string }
  | { t: 'blankGuess'; guess: string }
  | { t: 'restart' } // host only
  | { t: 'leave' };

/** Messages the server sends over the WebSocket. Discriminated on `t`. */
export type ServerMsg =
  | { t: 'id'; playerId: string } // echoes the seat id bound to this socket
  | { t: 'state'; state: RoomState } // public snapshot — never contains role/word
  | { t: 'secret'; secret: SecretAssignment | null } // private: this player's own word
  | { t: 'error'; code: string; message?: string }; // `code` is an i18n key

// ---- Routes / ports ----

export const API_CREATE = '/api/create';
export const API_JOIN = '/api/join';
export const WS_PATH = '/ws';

/** Local `wrangler dev` port; Vite proxies /ws + /api here during `npm run dev`. */
export const WORKER_DEV_PORT = 8787;
