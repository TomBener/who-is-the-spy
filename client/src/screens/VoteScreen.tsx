import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { RoomState, SecretAssignment } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import WordPeek from '@/components/WordPeek';
import { socket } from '@/lib/socket';

interface Props {
  roomState: RoomState;
  secret: SecretAssignment | null;
  isHost: boolean;
  selfId: string;
}

function initial(name: string): string {
  const ch = Array.from(name.trim())[0] ?? '?';
  return /[a-zA-Z]/.test(ch) ? ch.toUpperCase() : ch;
}

export default function VoteScreen({ roomState, secret, isHost, selfId }: Props) {
  const { t } = useTranslation();
  const { players, round } = roomState;

  const me = players.find((p) => p.id === selfId);
  const amAlive = !!me?.alive;
  const candidates = players.filter((p) => p.alive && p.id !== selfId);

  const votedCount = players.filter((p) => p.alive && p.hasVoted).length;
  const aliveCount = players.filter((p) => p.alive).length;

  // Local lock: server doesn't echo *who* you picked, so remember it client-side.
  const [picked, setPicked] = useState<string | null>(null);
  // Reset the local lock at the start of each new vote round.
  useEffect(() => {
    setPicked(null);
  }, [round]);

  const locked = picked !== null || (amAlive && !!me?.hasVoted);

  const castVote = (targetId: string) => {
    if (locked || !amAlive) return;
    setPicked(targetId);
    socket.emit('game:vote', { targetId });
  };

  const pickedName = picked
    ? players.find((p) => p.id === picked)?.name
    : undefined;

  return (
    <Screen>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{t('vote.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {amAlive ? t('vote.instruction') : t('vote.cantVote')}
        </p>
      </div>

      {/* Candidate grid */}
      <div className="grid grid-cols-2 gap-3">
        {candidates.map((p) => {
          const isPicked = picked === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={locked || !amAlive}
              onClick={() => castVote(p.id)}
              className={clsx(
                'no-select flex flex-col items-center gap-2 rounded-3xl p-4 ring-1 transition active:scale-[0.97] animate-pop-in',
                isPicked
                  ? 'bg-brand-500 ring-white/30 shadow-lg shadow-brand-900/40'
                  : 'bg-ink-800/80 ring-white/10',
                (locked || !amAlive) && !isPicked && 'opacity-50',
              )}
            >
              <span
                className={clsx(
                  'grid h-14 w-14 place-items-center rounded-full text-xl font-bold',
                  isPicked ? 'bg-white/20 text-white' : 'bg-ink-700 text-brand-200',
                )}
              >
                {initial(p.name)}
              </span>
              <span className="w-full truncate text-center text-sm font-semibold text-white">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status */}
      <Card className="text-center">
        {locked && amAlive ? (
          <p className="font-semibold text-brand-200">
            {pickedName
              ? t('vote.youVoted', { name: pickedName })
              : t('vote.locked')}
          </p>
        ) : !amAlive ? (
          <p className="text-sm text-slate-400">{t('vote.cantVote')}</p>
        ) : (
          <p className="text-sm text-slate-400">{t('vote.tapToVote')}</p>
        )}
        <p className="mt-2 text-xs text-slate-500 tabular-nums">
          {t('vote.progress', { voted: votedCount, total: aliveCount })}
        </p>
        {locked && amAlive && (
          <p className="mt-1 text-xs text-slate-500">{t('vote.waiting')}</p>
        )}
      </Card>

      <WordPeek secret={secret} />

      {isHost && (
        <Button variant="secondary" onClick={() => socket.emit('phase:next')}>
          {t('vote.tallyNow')}
        </Button>
      )}
    </Screen>
  );
}
