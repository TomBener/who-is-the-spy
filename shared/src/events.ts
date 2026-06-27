import type {
  GameConfig,
  Lang,
  RoomState,
  SecretAssignment,
} from './types';

// ---- Client -> Server payloads ----

export interface CreateRoomPayload {
  /** Persistent player id generated + stored on the client (survives reconnects). */
  playerId: string;
  name: string;
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
  /** Machine-readable error key for i18n on the client (e.g. 'room_not_found'). */
  error?: string;
}

export interface ConfigPayload {
  config: Partial<GameConfig>;
}

export interface VotePayload {
  /** Player id being voted for. */
  targetId: string;
}

export interface BlankGuessPayload {
  guess: string;
}

// ---- socket.io typed event maps (shared by server `Server<...>` and client `io<...>`) ----

export interface ClientToServerEvents {
  'room:create': (p: CreateRoomPayload, cb: (r: AckResult) => void) => void;
  'room:join': (p: JoinRoomPayload, cb: (r: AckResult) => void) => void;
  'room:leave': () => void;
  /** Host only: update game configuration while in lobby. */
  'game:config': (p: ConfigPayload) => void;
  /** Host only: deal roles/words and start the round. */
  'game:start': () => void;
  /** Host only: advance the phase (reveal -> describe -> vote, or next speaker). */
  'phase:next': () => void;
  'game:vote': (p: VotePayload) => void;
  /** The eliminated 白板 submits their one guess at the civilian word. */
  'blank:guess': (p: BlankGuessPayload) => void;
  /** Host only: reset back to lobby for another game with the same players. */
  'game:restart': () => void;
}

export interface ServerToClientEvents {
  /** Public room snapshot. Broadcast to everyone on every change. */
  'room:state': (s: RoomState) => void;
  /** Private. The receiving socket's own role + word (or null between rounds). */
  'you:secret': (a: SecretAssignment | null) => void;
  /** Echoes back the player id the server is using for this socket. */
  'you:id': (id: string) => void;
  /** Recoverable error; `code` is an i18n key. */
  'error': (e: { code: string; message?: string }) => void;
}

export const SERVER_PORT = 3001;
export const SOCKET_PATH = '/socket.io';
