import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  AckResult,
} from '@spy/shared';
import { SOCKET_PATH } from '@spy/shared';

/**
 * Typed socket.io singleton. Same-origin connection; in dev Vite proxies
 * `/socket.io` to the Node server, in prod the Node server serves the SPA.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  path: SOCKET_PATH,
  autoConnect: true,
});

/** Create a room; resolves the server ack (ok + code, or error key). */
export function createRoom(payload: CreateRoomPayload): Promise<AckResult> {
  return new Promise((resolve) => {
    socket.emit('room:create', payload, (result) => resolve(result));
  });
}

/** Join an existing room; resolves the server ack. */
export function joinRoom(payload: JoinRoomPayload): Promise<AckResult> {
  return new Promise((resolve) => {
    socket.emit('room:join', payload, (result) => resolve(result));
  });
}
