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

export default function DescribeScreen({ roomState, secret, isHost, selfId }: Props) {
  const { t } = useTranslation();
  const { speakingOrder, currentSpeaker, players, config, round } = roomState;

  const byId = new Map(players.map((p) => [p.id, p]));
  const currentId = speakingOrder[currentSpeaker];
  const currentPlayer = currentId ? byId.get(currentId) : undefined;
  const isMyTurn = currentId === selfId;
  const isLastSpeaker = currentSpeaker >= speakingOrder.length - 1;

  // Visual-only countdown. Resets whenever the speaker (or round) changes.
  const [remaining, setRemaining] = useState(config.descriptionTimer);
  useEffect(() => {
    if (config.descriptionTimer <= 0) return;
    setRemaining(config.descriptionTimer);
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [config.descriptionTimer, currentSpeaker, round]);

  return (
    <Screen>
      <div className="flex items-center justify-between">
        <span className="label">// {t('describe.title')}</span>
      </div>

      {/* Now speaking */}
      <Card
        className={clsx(
          'flex flex-col items-center gap-2 text-center',
          isMyTurn && 'border-amber',
        )}
      >
        <span className="label text-paper-faint">{t('describe.now')}</span>
        <span className="font-mono text-3xl font-extrabold tracking-wide text-amber">
          {currentPlayer?.name ?? '—'}
        </span>
        {isMyTurn && (
          <span className="label border border-amber/60 px-2 py-0.5 text-amber">
            {t('describe.youAreUp')}
          </span>
        )}
        {config.descriptionTimer > 0 && (
          <div className="mt-2 w-full">
            <div className="h-1.5 w-full overflow-hidden border border-noir-700 bg-noir-950">
              <div
                className={clsx(
                  'h-full transition-all duration-1000 ease-linear',
                  remaining > 0 ? 'bg-amber' : 'bg-alert',
                )}
                style={{
                  width: `${(remaining / config.descriptionTimer) * 100}%`,
                }}
              />
            </div>
            <p
              className={clsx(
                'label mt-1.5 normal-case tabular-nums',
                remaining > 0 ? 'text-paper-dim' : 'text-alert',
              )}
            >
              {remaining > 0
                ? t('describe.timeLeft', { seconds: remaining })
                : t('describe.timeUp')}
            </p>
          </div>
        )}
      </Card>

      {/* Interrogation queue */}
      <Card>
        <h3 className="label mb-3 text-paper">{t('describe.order')}</h3>
        <ol className="flex flex-col">
          {speakingOrder.map((id, idx) => {
            const p = byId.get(id);
            if (!p) return null;
            const isCurrent = idx === currentSpeaker;
            const isDone = idx < currentSpeaker;
            return (
              <li
                key={id}
                className={clsx(
                  'flex items-center gap-3 border-b border-noir-700 px-2 py-2 transition last:border-b-0',
                  isCurrent && 'border-l-2 border-l-amber bg-noir-800',
                  isDone && 'opacity-45',
                )}
              >
                <span
                  className={clsx(
                    'label w-6 shrink-0 tabular-nums',
                    isCurrent ? 'text-amber' : 'text-paper-faint',
                  )}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span
                  className={clsx(
                    'flex-1 truncate text-sm',
                    isCurrent ? 'font-bold text-amber' : 'text-paper-dim',
                  )}
                >
                  {p.name}
                  {id === selfId && ` · ${t('common.you')}`}
                </span>
                <span className="label text-paper-faint">
                  {isDone
                    ? t('describe.done')
                    : isCurrent
                      ? t('describe.now')
                      : t('describe.upNext')}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <WordPeek secret={secret} />

      {isHost && (
        <Button onClick={() => socket.emit('phase:next')}>
          {isLastSpeaker ? t('describe.goToVote') : t('describe.nextSpeaker')}
        </Button>
      )}
    </Screen>
  );
}
