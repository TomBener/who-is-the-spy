import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PublicPlayer } from '@spy/shared';

interface PlayerListProps {
  players: PublicPlayer[];
  /** Highlights the "you" row. */
  selfId: string;
  /** Show a green dot when a player has voted (vote phase). */
  showVoted?: boolean;
  /** Show a votes-received badge (voteResult phase). */
  showVotesReceived?: boolean;
}

/** Derive up-to-2-char initials from a display name. */
function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // CJK: first glyph reads well on its own.
  const first = Array.from(trimmed)[0] ?? '?';
  if (/[一-鿿]/.test(first)) return first;
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

// Stable per-player avatar tint from a hash of the id.
const TINTS = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-fuchsia-500',
  'bg-teal-500',
  'bg-orange-500',
];
function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export default function PlayerList({
  players,
  selfId,
  showVoted = false,
  showVotesReceived = false,
}: PlayerListProps) {
  const { t } = useTranslation();

  return (
    <ul className="flex flex-col gap-2">
      {players.map((p) => {
        const isSelf = p.id === selfId;
        const dead = !p.alive;
        return (
          <li
            key={p.id}
            className={clsx(
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition',
              dead
                ? 'bg-ink-800/40 ring-white/5 opacity-55'
                : 'bg-ink-700/60 ring-white/10',
              isSelf && !dead && 'ring-brand-400/60',
            )}
          >
            <div className="relative shrink-0">
              <div
                className={clsx(
                  'grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white no-select',
                  tintFor(p.id),
                  dead && 'grayscale',
                )}
              >
                {initials(p.name)}
              </div>
              {/* Connection dot */}
              <span
                className={clsx(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-ink-800',
                  p.connected ? 'bg-emerald-400' : 'bg-slate-500',
                )}
                title={p.connected ? 'online' : 'offline'}
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                className={clsx(
                  'truncate font-medium',
                  dead ? 'text-slate-400 line-through' : 'text-slate-100',
                )}
              >
                {p.name}
              </span>
              {p.isHost && (
                <span title={t('common.host')} aria-label={t('common.host')}>
                  👑
                </span>
              )}
              {isSelf && (
                <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-200">
                  {t('common.you')}
                </span>
              )}
            </div>

            {showVoted && p.alive && (
              <span
                className={clsx(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  p.hasVoted ? 'bg-emerald-400' : 'bg-white/15',
                )}
                title={p.hasVoted ? 'voted' : ''}
              />
            )}

            {showVotesReceived && p.votesReceived > 0 && (
              <span className="shrink-0 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-200 tabular-nums">
                {p.votesReceived}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
