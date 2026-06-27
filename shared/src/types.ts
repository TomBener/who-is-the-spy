/** Supported UI + word-bank languages. */
export type Lang = 'zh' | 'en';

/** A player's hidden identity. `blank` is 白板 / Mr.White (no word). */
export type Role = 'civilian' | 'undercover' | 'blank';

/** Finite-state machine for a room. */
export type GamePhase =
  | 'lobby' // waiting for players; host configures
  | 'reveal' // each player privately views their secret word
  | 'describe' // players describe their word out loud, in turn
  | 'vote' // players vote to eliminate someone
  | 'voteResult' // reveal who was voted out + their role
  | 'blankGuess' // an eliminated 白板 gets one guess at the civilian word
  | 'ended'; // winner decided

export type Winner = 'civilians' | 'undercover';

export interface GameConfig {
  /** Number of undercover spies. */
  undercoverCount: number;
  /** Number of 白板 / Mr.White (no word). */
  blankCount: number;
  /** Category key from CATEGORIES, or 'random'. */
  category: string;
  /** Seconds allowed per speaker; 0 disables the timer. */
  descriptionTimer: number;
  /** Language for the word bank + drives default UI language for joiners. */
  lang: Lang;
}

/** Player info that is safe to broadcast to everyone in the room. Never includes role/word. */
export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  alive: boolean;
  /** True once this player has cast a vote in the current `vote` phase. */
  hasVoted: boolean;
  /** Votes received — only populated during `voteResult`. */
  votesReceived: number;
}

/** Private payload sent over `you:secret` to a single socket. */
export interface SecretAssignment {
  role: Role;
  /** The secret word, or null when role === 'blank'. */
  word: string | null;
}

export interface EliminatedInfo {
  playerId: string;
  name: string;
  role: Role;
  word: string | null;
}

/** Full public room snapshot, broadcast on every change via `room:state`. */
export interface RoomState {
  code: string;
  phase: GamePhase;
  round: number;
  players: PublicPlayer[];
  config: GameConfig;
  hostId: string;
  /** Player ids in speaking order; set when entering `describe`. */
  speakingOrder: string[];
  /** Index into speakingOrder of the current speaker. */
  currentSpeaker: number;
  /** Most recently eliminated player; shown during `voteResult` / `blankGuess`. */
  eliminated: EliminatedInfo | null;
  /** Set when phase === 'ended'. */
  winner: Winner | null;
  /** The word pair, revealed to everyone ONLY when phase === 'ended'. */
  revealWords: { civilian: string; undercover: string } | null;
}

export const DEFAULT_CONFIG: GameConfig = {
  undercoverCount: 1,
  blankCount: 0,
  category: 'random',
  descriptionTimer: 0,
  lang: 'zh',
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;
export const ROOM_CODE_LENGTH = 4;
