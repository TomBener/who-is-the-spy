import { nanoid } from 'nanoid';

const STORAGE_KEY = 'spy:playerId';

/**
 * Get-or-create a persistent player id stored in localStorage.
 * Survives reloads + reconnects so the server can re-bind the same player.
 */
export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = nanoid();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private mode etc.) — fall back to ephemeral id.
    return nanoid();
  }
}
