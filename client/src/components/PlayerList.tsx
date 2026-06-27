import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PublicPlayer } from '@spy/shared';

interface PlayerListProps {
  players: PublicPlayer[];
  /** Highlights the "you" row. */
  selfId: string;
  /** Show a voted indicator when a player has voted (vote phase). */
  showVoted?: boolean;
  /** Show a votes-received tally (voteResult phase). */
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

export default function PlayerList({
  players,
  selfId,
  showVoted = false,
  showVotesReceived = false,
}: PlayerListProps) {
  const { t } = useTranslation();

  return (
    <ul className="flex flex-col">
      {players.map((p, idx) => {
        const isSelf = p.id === selfId;
        const dead = !p.alive;
        return (
          <li
            key={p.id}
            className={clsx(
              'flex items-center gap-3 border-b border-noir-700 px-1 py-2.5 transition last:border-b-0',
              isSelf && !dead && 'bg-noir-800',
            )}
          >
            {/* Case index */}
            <span className="label w-6 shrink-0 text-paper-faint tabular-nums">
              {String(idx + 1).padStart(2, '0')}
            </span>

            {/* Square initials chip */}
            <div className="relative shrink-0">
              <div
                className={clsx(
                  'no-select grid h-9 w-9 place-items-center border font-mono text-sm font-bold',
                  dead
                    ? 'border-noir-700 text-paper-faint'
                    : 'border-noir-600 text-paper',
                )}
              >
                {initials(p.name)}
              </div>
              {/* Connection square: amber=online, dim=offline. */}
              <span
                className={clsx(
                  'absolute -bottom-0.5 -right-0.5 h-2 w-2 border border-noir-850',
                  p.connected ? 'bg-amber' : 'bg-noir-600',
                )}
                title={p.connected ? 'online' : 'offline'}
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                className={clsx(
                  'truncate',
                  dead ? 'text-paper-faint line-through' : 'text-paper',
                )}
              >
                {p.name}
              </span>
              {p.isHost && (
                <span
                  className="label shrink-0 border border-noir-600 px-1.5 py-0.5 leading-none text-paper-dim"
                  title={t('common.host')}
                  aria-label={t('common.host')}
                >
                  HOST
                </span>
              )}
              {isSelf && (
                <span className="label shrink-0 border border-amber/60 px-1.5 py-0.5 leading-none text-amber">
                  {t('common.you')}
                </span>
              )}
            </div>

            {dead && (
              <span className="label shrink-0 border border-alert/60 px-1.5 py-0.5 leading-none text-alert">
                OUT
              </span>
            )}

            {showVoted && p.alive && (
              <span
                className={clsx(
                  'grid h-4 w-4 shrink-0 place-items-center border',
                  p.hasVoted ? 'border-amber bg-amber text-noir-950' : 'border-noir-600',
                )}
                title={p.hasVoted ? 'voted' : ''}
              >
                {p.hasVoted && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M3 8.5l3.2 3.2L13 4.5" />
                  </svg>
                )}
              </span>
            )}

            {showVotesReceived && (
              <span
                className={clsx(
                  'label shrink-0 tabular-nums',
                  p.votesReceived > 0 ? 'text-amber' : 'text-paper-faint',
                )}
              >
                ×{p.votesReceived}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
