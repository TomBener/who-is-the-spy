import { create } from 'zustand';
import type { RoomState, SecretAssignment } from '@spy/shared';
import { socket } from './lib/socket';
import { getPlayerId } from './lib/playerId';

interface SpyStore {
  connected: boolean;
  playerId: string;
  roomState: RoomState | null;
  secret: SecretAssignment | null;
  /** Latest error i18n key; consumed + cleared by the Toast. */
  lastError: string | null;

  setConnected: (connected: boolean) => void;
  setPlayerId: (id: string) => void;
  setRoomState: (state: RoomState | null) => void;
  setSecret: (secret: SecretAssignment | null) => void;
  setError: (code: string | null) => void;
  clearError: () => void;
  /** Leave the current room and reset local game state. */
  leaveRoom: () => void;
}

export const useStore = create<SpyStore>((set) => ({
  connected: socket.connected,
  playerId: getPlayerId(),
  roomState: null,
  secret: null,
  lastError: null,

  setConnected: (connected) => set({ connected }),
  setPlayerId: (playerId) => set({ playerId }),
  setRoomState: (roomState) => set({ roomState }),
  setSecret: (secret) => set({ secret }),
  setError: (lastError) => set({ lastError }),
  clearError: () => set({ lastError: null }),
  leaveRoom: () => {
    socket.emit('room:leave');
    set({ roomState: null, secret: null });
  },
}));

let bound = false;

/**
 * Register socket listeners exactly once and wire them into the store.
 * Safe to call multiple times (subsequent calls are no-ops).
 */
export function bindSocket(): void {
  if (bound) return;
  bound = true;

  const { setConnected, setRoomState, setSecret, setPlayerId, setError } =
    useStore.getState();

  setConnected(socket.connected);

  socket.on('connect', () => setConnected(true));
  socket.on('disconnect', () => setConnected(false));

  socket.on('room:state', (state) => setRoomState(state));
  socket.on('you:secret', (secret) => setSecret(secret));
  socket.on('you:id', (id) => setPlayerId(id));
  // The room is gone (destroyed, or we left): drop back to the home screen.
  socket.on('room:closed', () => {
    useStore.setState({ roomState: null, secret: null });
  });
  socket.on('error', (e) => setError(e.code || 'generic'));
}
