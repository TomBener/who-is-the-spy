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
      <div className="flex items-center justify-between">
        <span className="label">// {t('vote.title')}</span>
        <span className="label tabular-nums text-paper-faint">
          {votedCount}/{aliveCount}
        </span>
      </div>
      <p className="label normal-case text-paper-dim">
        {amAlive ? t('vote.instruction') : t('vote.cantVote')}
      </p>

      {/* Suspect lineup */}
      <div className="grid grid-cols-2 gap-2.5">
        {candidates.map((p) => {
          const isPicked = picked === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={locked || !amAlive}
              onClick={() => castVote(p.id)}
              className={clsx(
                'no-select panel flex flex-col items-center gap-2 rounded-sm p-4 transition active:translate-y-px',
                isPicked && 'border-amber bg-noir-800',
                (locked || !amAlive) && !isPicked && 'opacity-45',
              )}
            >
              <span
                className={clsx(
                  'grid h-12 w-12 place-items-center border font-mono text-xl font-bold',
                  isPicked ? 'border-amber text-amber' : 'border-noir-600 text-paper',
                )}
              >
                {initial(p.name)}
              </span>
              <span
                className={clsx(
                  'w-full truncate text-center text-sm',
                  isPicked ? 'font-bold text-amber' : 'text-paper',
                )}
              >
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status */}
      <Card className="text-center">
        {locked && amAlive ? (
          <p className="label text-amber">
            {pickedName
              ? t('vote.youVoted', { name: pickedName })
              : t('vote.locked')}
          </p>
        ) : !amAlive ? (
          <p className="text-sm text-paper-dim">{t('vote.cantVote')}</p>
        ) : (
          <p className="text-sm text-paper-dim">{t('vote.tapToVote')}</p>
        )}
        <p className="label mt-2 normal-case tabular-nums text-paper-faint">
          {t('vote.progress', { voted: votedCount, total: aliveCount })}
        </p>
        {locked && amAlive && (
          <p className="label mt-1 normal-case text-paper-faint">{t('vote.waiting')}</p>
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
