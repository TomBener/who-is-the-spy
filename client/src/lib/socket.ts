import type {
  ClientMsg,
  ServerMsg,
  CreateRoomPayload,
  JoinRoomPayload,
  AckResult,
  RoomState,
  SecretAssignment,
  GameConfig,
} from '@spy/shared';
import { API_CREATE, API_JOIN, WS_PATH } from '@spy/shared';

// ============================================================================
// socket.io-compatible shim over a raw WebSocket + HTTP.
//
// Exposes the same surface the rest of the app already depends on:
//   - `socket` with `.connected`, `.on(event, handler)`, `.emit(event, payload?)`
//   - `createRoom(payload)` / `joinRoom(payload)` returning an AckResult.
//
// Create/join go over HTTP POST (need a synchronous ok/error + room code before
// a socket exists). All live game traffic rides a single WebSocket opened after
// a successful create/join. The socket auto-reconnects with backoff and re-binds
// the seat by re-sending `hello`, so the server resumes state + secret.
// ============================================================================

// ---- Event surface consumed by store.ts / screens ----

interface ErrorEvent {
  code: string;
  message?: string;
}

/** Maps each client-facing event name to its handler signature. */
interface ListenerMap {
  connect: () => void;
  disconnect: () => void;
  'room:state': (state: RoomState) => void;
  'you:secret': (secret: SecretAssignment | null) => void;
  'you:id': (playerId: string) => void;
  /** The room is gone (or we left it) — reset local game state, no reconnect. */
  'room:closed': () => void;
  error: (e: ErrorEvent) => void;
}

type EventName = keyof ListenerMap;

/**
 * Minimal socket.io-compatible surface. `on` is overloaded per event so handler
 * parameters are inferred at the call sites in store.ts. An explicit interface
 * (rather than `typeof socket`) is required because the object's methods return
 * the object itself, which would otherwise be a circular type.
 */
interface SpyShimSocket {
  readonly connected: boolean;
  on<K extends EventName>(event: K, handler: ListenerMap[K]): SpyShimSocket;
  emit(event: string, payload?: unknown): SpyShimSocket;
}

// ---- Module-level connection state ----

let ws: WebSocket | null = null;
/** The seat we're bound to; null when not in a room. */
let current: { code: string; playerId: string } | null = null;
/** Set when the user deliberately leaves so the close handler won't reconnect. */
let intentionalClose = false;

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_BASE_MS = 500;
const RECONNECT_FACTOR = 1.5;
const RECONNECT_MAX_MS = 5000;
let reconnectDelay = RECONNECT_BASE_MS;

// Registered handlers, supporting multiple per event.
const listeners: { [K in EventName]: Array<ListenerMap[K]> } = {
  connect: [],
  disconnect: [],
  'room:state': [],
  'you:secret': [],
  'you:id': [],
  'room:closed': [],
  error: [],
};

// ---- Session persistence (survive full page reloads) ----
//
// The WebSocket dies on reload, but the seat survives on the server (keyed by
// the persistent playerId). Remembering {code, name} lets the app silently
// re-join the same room on boot instead of dumping the player back on Home.

const SESSION_KEY = 'spy:session';

interface StoredSession {
  code: string;
  name: string;
}

function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* private mode etc. — resume just won't work */
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.code !== 'string' || typeof parsed.name !== 'string') {
      return null;
    }
    return { code: parsed.code, name: parsed.name };
  } catch {
    return null;
  }
}

function emitLocal<K extends EventName>(
  event: K,
  ...args: Parameters<ListenerMap[K]>
): void {
  // Copy to be safe against handlers that mutate the list.
  for (const handler of listeners[event].slice()) {
    (handler as (...a: Parameters<ListenerMap[K]>) => void)(...args);
  }
}

// ---- WebSocket lifecycle ----

function wsUrl(code: string): string {
  const base = location.origin.replace(/^http/, 'ws');
  return `${base}${WS_PATH}?code=${encodeURIComponent(code)}`;
}

function clearReconnectTimer(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(): void {
  if (intentionalClose || current === null) return;
  if (reconnectTimer !== null) return;

  const delay = reconnectDelay;
  reconnectDelay = Math.min(reconnectDelay * RECONNECT_FACTOR, RECONNECT_MAX_MS);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (intentionalClose || current === null) return;
    openSocket(current.code);
  }, delay);
}

/** (Re)open the WebSocket for `code`, wiring all lifecycle handlers. */
function openSocket(code: string): void {
  // Guard against double-connect: detach + close any existing socket first.
  if (ws) {
    const stale = ws;
    ws = null;
    stale.onopen = null;
    stale.onmessage = null;
    stale.onclose = null;
    stale.onerror = null;
    try {
      stale.close();
    } catch {
      // ignore
    }
  }

  const sock = new WebSocket(wsUrl(code));
  ws = sock;

  sock.onopen = () => {
    if (ws !== sock) return; // superseded by a newer socket
    // Successful connection — reset backoff for the next disconnect.
    reconnectDelay = RECONNECT_BASE_MS;
    const playerId = current?.playerId;
    if (playerId) {
      send({ t: 'hello', playerId });
    }
    emitLocal('connect');
  };

  sock.onmessage = (ev) => {
    if (ws !== sock) return;
    let msg: ServerMsg;
    try {
      msg = JSON.parse(ev.data as string) as ServerMsg;
    } catch {
      return; // ignore malformed frames
    }
    switch (msg.t) {
      case 'state':
        emitLocal('room:state', msg.state);
        break;
      case 'secret':
        emitLocal('you:secret', msg.secret);
        break;
      case 'id':
        emitLocal('you:id', msg.playerId);
        break;
      case 'error':
        emitLocal('error', { code: msg.code, message: msg.message });
        break;
    }
  };

  sock.onclose = (ev) => {
    if (ws !== sock) return; // a newer socket already took over
    ws = null;
    // Terminal closes (the room no longer exists, or the server confirmed our
    // leave): stop reconnecting and tell the app to reset, instead of
    // hammering a dead room forever.
    if (ev.reason === 'room_not_found' || ev.reason === 'left') {
      intentionalClose = true;
      current = null;
      clearSession();
      emitLocal('disconnect');
      emitLocal('room:closed');
      return;
    }
    emitLocal('disconnect');
    scheduleReconnect();
  };

  sock.onerror = () => {
    if (ws !== sock) return;
    // Surface as a close so the reconnect path handles it uniformly.
    try {
      sock.close();
    } catch {
      // ignore
    }
  };
}

/** Open a fresh connection for a known seat. */
function connect(code: string, playerId: string): void {
  current = { code, playerId };
  intentionalClose = false;
  reconnectDelay = RECONNECT_BASE_MS;
  clearReconnectTimer();
  openSocket(code);
}

function send(msg: ClientMsg): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Deliberately tear down the connection and stop auto-reconnect. */
function leave(): void {
  intentionalClose = true;
  clearReconnectTimer();
  current = null;
  clearSession();
  reconnectDelay = RECONNECT_BASE_MS;
  if (ws) {
    const stale = ws;
    ws = null;
    stale.onopen = null;
    stale.onmessage = null;
    stale.onclose = null;
    stale.onerror = null;
    try {
      stale.close();
    } catch {
      // ignore
    }
  }
}

// ---- socket.io-compatible public object ----

export const socket: SpyShimSocket = {
  get connected(): boolean {
    return ws !== null && ws.readyState === WebSocket.OPEN;
  },

  on<K extends EventName>(event: K, handler: ListenerMap[K]): SpyShimSocket {
    listeners[event].push(handler);
    return socket;
  },

  emit(event: string, payload?: unknown): SpyShimSocket {
    switch (event) {
      case 'game:config':
        send({
          t: 'config',
          config: (payload as { config: Partial<GameConfig> }).config,
        });
        break;
      case 'game:start':
        send({ t: 'start' });
        break;
      case 'phase:next':
        send({ t: 'phaseNext' });
        break;
      case 'game:vote':
        send({ t: 'vote', targetId: (payload as { targetId: string }).targetId });
        break;
      case 'blank:guess':
        send({ t: 'blankGuess', guess: (payload as { guess: string }).guess });
        break;
      case 'game:restart':
        send({ t: 'restart' });
        break;
      case 'room:leave':
        send({ t: 'leave' });
        leave();
        break;
    }
    return socket;
  },
};

// ---- HTTP create / join ----

async function postAck(path: string, body: unknown): Promise<AckResult> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AckResult;
    return data;
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

/** Create a room over HTTP; on success, open the live WebSocket. */
export async function createRoom(payload: CreateRoomPayload): Promise<AckResult> {
  const result = await postAck(API_CREATE, payload);
  if (result.ok && result.code) {
    saveSession({ code: result.code, name: payload.name });
    connect(result.code, payload.playerId);
  }
  return result;
}

/** Join an existing room over HTTP; on success, open the live WebSocket. */
export async function joinRoom(payload: JoinRoomPayload): Promise<AckResult> {
  const result = await postAck(API_JOIN, payload);
  if (result.ok) {
    saveSession({ code: payload.code, name: payload.name });
    connect(payload.code, payload.playerId);
  }
  return result;
}

/**
 * Try to re-join the room recorded in the last session (page reload / PWA
 * relaunch). Silent: a stale or missing session just clears itself. Returns
 * true when a resume was attempted successfully.
 */
export async function resumeSession(playerId: string): Promise<boolean> {
  const session = getSession();
  if (!session) return false;
  const result = await joinRoom({ playerId, code: session.code, name: session.name });
  if (!result.ok) {
    clearSession();
    return false;
  }
  return true;
}
