import type { GameConfig, Role, SecretAssignment } from '@spy/shared';
import { MAX_PLAYERS, MIN_PLAYERS } from '@spy/shared';
import { pickPair } from './words.js';
import type { PlayerRecord, ServerRoom } from './roomManager.js';

/**
 * Pure-ish game logic + phase machine. Functions here mutate the
 * authoritative {@link ServerRoom} and report *what* secret each player should
 * be told; actually emitting `you:secret` / `room:state` is the socket layer's
 * job, keeping all socket.io I/O out of this module.
 */

/** A stable error key (i18n key on the client) plus an optional message. */
export class GameError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'GameError';
  }
}

/** The owning player's id + the secret they should now be shown. */
export interface SecretEmit {
  playerId: string;
  secret: SecretAssignment | null;
}

// ----------------------------- helpers -----------------------------

function alivePlayers(room: ServerRoom): PlayerRecord[] {
  return [...room.players.values()].filter((p) => p.alive);
}

/** Fisher–Yates shuffle returning a new array (never mutates input). */
function shuffle<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Clamp helper for config sanitisation. */
function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}

// --------------------------- config merge ---------------------------

/**
 * Merge a partial config from the host (lobby only) onto the room's config,
 * clamping counts to sane ranges. We deliberately do NOT reject here on
 * "too many spies" — that gate lives in {@link startGame} so the host can
 * tweak fields one at a time without intermediate states being rejected.
 */
export function applyConfig(room: ServerRoom, patch: Partial<GameConfig>): void {
  const c = room.config;
  if (patch.undercoverCount !== undefined) {
    c.undercoverCount = clamp(patch.undercoverCount, 0, MAX_PLAYERS);
  }
  if (patch.blankCount !== undefined) {
    c.blankCount = clamp(patch.blankCount, 0, MAX_PLAYERS);
  }
  if (patch.category !== undefined) c.category = patch.category;
  if (patch.descriptionTimer !== undefined) {
    c.descriptionTimer = clamp(patch.descriptionTimer, 0, 600);
  }
  if (patch.lang === 'zh' || patch.lang === 'en') c.lang = patch.lang;
}

// ----------------------------- dealing -----------------------------

/**
 * Validate config + player count and deal a fresh round.
 *
 * Validation (throws GameError 'invalid_config' otherwise):
 *  - alive players >= MIN_PLAYERS
 *  - undercoverCount >= 1
 *  - spies (undercover + blank) < playerCount
 *  - civilians (playerCount - spies) >= 1, and civilians > spies (fair game)
 *
 * On success: picks ONE word pair, shuffles players, assigns roles/words,
 * moves lobby -> reveal, and returns each player's SecretAssignment to emit.
 */
export function startGame(room: ServerRoom): SecretEmit[] {
  if (room.phase !== 'lobby') {
    throw new GameError('already_started');
  }

  // Everyone in the lobby is alive; use the full roster as the deal set.
  const players = [...room.players.values()];
  const count = players.length;
  const { undercoverCount, blankCount } = room.config;
  const spies = undercoverCount + blankCount;
  const civilians = count - spies;

  if (
    count < MIN_PLAYERS ||
    undercoverCount < 1 ||
    spies >= count ||
    civilians < 1 ||
    civilians <= spies // civilians must outnumber the spies for a fair game
  ) {
    throw new GameError('invalid_config');
  }

  const pair = pickPair(room.config.category, room.config.lang);

  // Shuffle the seating, then slice out spies from the front.
  const order = shuffle(players);
  const roleFor = (i: number): Role => {
    if (i < undercoverCount) return 'undercover';
    if (i < undercoverCount + blankCount) return 'blank';
    return 'civilian';
  };

  const emits: SecretEmit[] = [];
  order.forEach((p, i) => {
    const role = roleFor(i);
    p.role = role;
    p.word =
      role === 'undercover'
        ? pair.undercover
        : role === 'blank'
          ? null
          : pair.civilian;
    p.alive = true;
    p.hasVoted = false;
    p.votesReceived = 0;
    emits.push({ playerId: p.id, secret: { role, word: p.word } });
  });

  // Stash the pair on the room so we can reveal it at game end.
  room.revealWords = null; // not revealed until 'ended'
  room.eliminated = null;
  room.winner = null;
  room.votes.clear();
  room.round = 1;
  room.speakingOrder = [];
  room.currentSpeaker = 0;
  // Keep the dealt pair around for the final reveal.
  dealtPair.set(room.code, { civilian: pair.civilian, undercover: pair.undercover });

  room.phase = 'reveal';
  return emits;
}

/**
 * The actual word pair dealt for the current game, keyed by room code, kept
 * outside RoomState so it can never leak into a broadcast before 'ended'.
 */
const dealtPair = new Map<string, { civilian: string; undercover: string }>();

// --------------------------- phase machine ---------------------------

/**
 * Host-driven `phase:next`. Advances the finite-state machine. Returns the
 * set of secret re-emits the caller should dispatch (non-empty only when a new
 * round begins and players are re-dealt their existing identity — actually we
 * keep identities across rounds, so this is only used to re-send on phase
 * changes that warrant it; normally empty).
 */
export function advancePhase(room: ServerRoom): void {
  switch (room.phase) {
    case 'reveal':
      enterDescribe(room);
      break;

    case 'describe': {
      // Advance speaker; when we step past the last speaker, go to vote.
      if (room.currentSpeaker < room.speakingOrder.length - 1) {
        room.currentSpeaker += 1;
      } else {
        enterVote(room);
      }
      break;
    }

    case 'vote':
      // Host force-ends voting early -> tally whatever we have.
      tallyVotes(room);
      break;

    case 'voteResult': {
      // If a 白板 was eliminated, give them their guess; else resolve.
      const elim = room.eliminated;
      if (elim && elim.role === 'blank') {
        room.phase = 'blankGuess';
      } else {
        resolveAfterElimination(room);
      }
      break;
    }

    case 'blankGuess':
      // Host can skip a stalling blank: treat as a wrong guess.
      resolveAfterElimination(room);
      break;

    case 'lobby':
    case 'ended':
      // No-op: nothing to advance from here (use start/restart instead).
      break;
  }
}

/** reveal -> describe: build a shuffled speaking order of ALIVE players. */
function enterDescribe(room: ServerRoom): void {
  room.speakingOrder = shuffle(alivePlayers(room).map((p) => p.id));
  room.currentSpeaker = 0;
  // Clear any stale vote artefacts from the previous round.
  room.eliminated = null;
  for (const p of room.players.values()) {
    p.hasVoted = false;
    p.votesReceived = 0;
  }
  room.votes.clear();
  room.phase = 'describe';
}

/** describe -> vote: reset per-round vote tallies. */
function enterVote(room: ServerRoom): void {
  room.votes.clear();
  for (const p of room.players.values()) {
    p.hasVoted = false;
    p.votesReceived = 0;
  }
  room.phase = 'vote';
}

// ------------------------------- voting -------------------------------

/**
 * Record a vote from `voterId` against `targetId`. Both must be ALIVE, the
 * voter may not vote for themselves, and may vote only once. Returns true once
 * every alive player has voted (so the caller can auto-advance the tally).
 */
export function castVote(
  room: ServerRoom,
  voterId: string,
  targetId: string,
): { allVoted: boolean } {
  if (room.phase !== 'vote') throw new GameError('not_your_turn');

  const voter = room.players.get(voterId);
  const target = room.players.get(targetId);
  if (!voter || !voter.alive) throw new GameError('not_your_turn');
  if (voter.hasVoted) throw new GameError('not_your_turn');
  if (!target || !target.alive) throw new GameError('invalid_config');
  if (targetId === voterId) throw new GameError('invalid_config');

  room.votes.set(voterId, targetId);
  voter.hasVoted = true;

  const alive = alivePlayers(room);
  const allVoted = alive.every((p) => p.hasVoted);
  return { allVoted };
}

/**
 * Tally the current round's votes, eliminate the top target, and move to
 * `voteResult`.
 *
 * Tie-breaking: if several players share the highest vote count we eliminate
 * ONE of them chosen uniformly at random (documented per spec). If literally
 * nobody voted (host force-advanced an empty vote), no one is eliminated and
 * we still surface `voteResult` with `eliminated:null` so the host can move on.
 */
export function tallyVotes(room: ServerRoom): void {
  // Reset displayed counts, then accumulate from the raw ballot map.
  for (const p of room.players.values()) p.votesReceived = 0;
  for (const targetId of room.votes.values()) {
    const t = room.players.get(targetId);
    if (t) t.votesReceived += 1;
  }

  const alive = alivePlayers(room);
  let max = 0;
  for (const p of alive) max = Math.max(max, p.votesReceived);

  if (max === 0) {
    // No votes at all — skip elimination this round.
    room.eliminated = null;
    room.phase = 'voteResult';
    return;
  }

  const topTied = alive.filter((p) => p.votesReceived === max);
  // Random pick among the tied top candidates (uniform).
  const victim = topTied[Math.floor(Math.random() * topTied.length)]!;
  victim.alive = false;

  room.eliminated = {
    playerId: victim.id,
    name: victim.name,
    role: victim.role ?? 'civilian',
    word: victim.word,
  };
  room.phase = 'voteResult';
}

// --------------------------- blank guess ---------------------------

/**
 * The just-eliminated 白板 submits their single guess at the civilian word.
 * Only the eliminated blank may call this, and only during `blankGuess`.
 * A correct (case-insensitive, trimmed) guess wins the game for the spies
 * instantly; otherwise we fall through to the normal win check.
 */
export function blankGuess(
  room: ServerRoom,
  guesserId: string,
  guess: string,
): void {
  if (room.phase !== 'blankGuess') throw new GameError('not_your_turn');
  const elim = room.eliminated;
  if (!elim || elim.role !== 'blank' || elim.playerId !== guesserId) {
    throw new GameError('not_your_turn');
  }

  const pair = dealtPair.get(room.code);
  const target = (pair?.civilian ?? '').trim().toLowerCase();
  const got = guess.trim().toLowerCase();

  if (target && got === target) {
    // Blank guessed the civilian word -> spies win outright.
    endGame(room, 'undercover');
    return;
  }
  resolveAfterElimination(room);
}

// ------------------------------ resolution ------------------------------

/**
 * After an elimination (or a wrong/skipped blank guess), run the win check
 * and either end the game or start the next round.
 *
 * Win check — spies = alive `undercover` + alive `blank`:
 *  - spies == 0                -> civilians win
 *  - spies >= alive civilians  -> undercover (spies) win
 *  - otherwise                 -> next round (describe again)
 */
function resolveAfterElimination(room: ServerRoom): void {
  const alive = alivePlayers(room);
  const spies = alive.filter(
    (p) => p.role === 'undercover' || p.role === 'blank',
  ).length;
  const civilians = alive.filter((p) => p.role === 'civilian').length;

  if (spies === 0) {
    endGame(room, 'civilians');
  } else if (spies >= civilians) {
    endGame(room, 'undercover');
  } else {
    startNextRound(room);
  }
}

/** Begin a new round: bump round, fresh speaking order, clear vote state. */
function startNextRound(room: ServerRoom): void {
  room.round += 1;
  room.eliminated = null;
  room.votes.clear();
  for (const p of room.players.values()) {
    p.hasVoted = false;
    p.votesReceived = 0;
  }
  room.speakingOrder = shuffle(alivePlayers(room).map((p) => p.id));
  room.currentSpeaker = 0;
  room.phase = 'describe';
}

/** Finish the game: set winner + reveal the word pair to everyone. */
function endGame(room: ServerRoom, winner: 'civilians' | 'undercover'): void {
  room.phase = 'ended';
  room.winner = winner;
  const pair = dealtPair.get(room.code);
  room.revealWords = pair
    ? { civilian: pair.civilian, undercover: pair.undercover }
    : null;
}

// ------------------------------ restart ------------------------------

/**
 * Reset the room back to lobby for another game with the same players. Clears
 * all secrets/roles/votes/eliminated/winner/reveal and revives everyone.
 * Returns the secret re-emits (everyone -> null) so the client can clear its
 * stale "your word" view.
 */
export function restartGame(room: ServerRoom): SecretEmit[] {
  room.phase = 'lobby';
  room.round = 0;
  room.speakingOrder = [];
  room.currentSpeaker = 0;
  room.eliminated = null;
  room.winner = null;
  room.revealWords = null;
  room.votes.clear();
  dealtPair.delete(room.code);

  const emits: SecretEmit[] = [];
  for (const p of room.players.values()) {
    p.role = null;
    p.word = null;
    p.alive = true;
    p.hasVoted = false;
    p.votesReceived = 0;
    emits.push({ playerId: p.id, secret: null });
  }
  return emits;
}

/** Forget a room's dealt pair (call when a room is garbage-collected). */
export function forgetRoom(code: string): void {
  dealtPair.delete(code);
}

/** The current secret for a player, used to re-send `you:secret` on reconnect. */
export function secretFor(player: PlayerRecord): SecretAssignment | null {
  if (player.role === null) return null;
  return { role: player.role, word: player.word };
}
