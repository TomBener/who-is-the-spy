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
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{t('describe.title')}</h2>
      </div>

      {/* Now speaking spotlight */}
      <Card
        className={clsx(
          'flex flex-col items-center gap-2 text-center animate-pop-in',
          isMyTurn && 'ring-2 ring-brand-400',
        )}
      >
        <span className="text-xs uppercase tracking-widest text-slate-400">
          {t('describe.now')}
        </span>
        <span className="text-3xl font-extrabold text-brand-200">
          {currentPlayer?.name ?? '—'}
        </span>
        {isMyTurn && (
          <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-100">
            {t('describe.youAreUp')}
          </span>
        )}
        {config.descriptionTimer > 0 && (
          <div className="mt-1 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-1000 ease-linear',
                  remaining > 0 ? 'bg-brand-400' : 'bg-rose-500',
                )}
                style={{
                  width: `${(remaining / config.descriptionTimer) * 100}%`,
                }}
              />
            </div>
            <p
              className={clsx(
                'mt-1.5 text-xs tabular-nums',
                remaining > 0 ? 'text-slate-400' : 'text-rose-300',
              )}
            >
              {remaining > 0
                ? t('describe.timeLeft', { seconds: remaining })
                : t('describe.timeUp')}
            </p>
          </div>
        )}
      </Card>

      {/* Speaking order */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          {t('describe.order')}
        </h3>
        <ol className="flex flex-col gap-1.5">
          {speakingOrder.map((id, idx) => {
            const p = byId.get(id);
            if (!p) return null;
            const isCurrent = idx === currentSpeaker;
            const isDone = idx < currentSpeaker;
            return (
              <li
                key={id}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2 transition',
                  isCurrent && 'bg-brand-500/15 ring-1 ring-brand-400/50',
                  isDone && 'opacity-50',
                )}
              >
                <span
                  className={clsx(
                    'grid h-6 w-6 place-items-center rounded-full text-xs font-bold tabular-nums',
                    isCurrent
                      ? 'bg-brand-500 text-white'
                      : 'bg-ink-700 text-slate-300',
                  )}
                >
                  {idx + 1}
                </span>
                <span
                  className={clsx(
                    'flex-1 truncate text-sm',
                    isCurrent ? 'font-semibold text-white' : 'text-slate-300',
                  )}
                >
                  {p.name}
                  {id === selfId && ` · ${t('common.you')}`}
                </span>
                <span className="text-[11px] text-slate-500">
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
