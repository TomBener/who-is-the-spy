import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { socket } from '@/lib/socket';

interface Props {
  roomState: RoomState;
  selfId: string;
}

export default function BlankGuessScreen({ roomState, selfId }: Props) {
  const { t } = useTranslation();
  const { eliminated } = roomState;

  // The eliminated 白板 is the one who guesses; everyone else waits.
  const amTheBlank = eliminated?.playerId === selfId && eliminated?.role === 'blank';

  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    const value = guess.trim();
    if (!value || submitted) return;
    setSubmitted(true);
    socket.emit('blank:guess', { guess: value });
  };

  return (
    <Screen center>
      <div className="text-center">
        <span className="text-5xl">🎭</span>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {t('blankGuess.title')}
        </h2>
      </div>

      {amTheBlank ? (
        <Card className="flex flex-col gap-4 animate-pop-in">
          <div className="text-center">
            <p className="font-semibold text-brand-200">
              {t('blankGuess.youAreBlank')}
            </p>
            <p className="mt-1 text-sm text-slate-400">{t('blankGuess.yourChance')}</p>
          </div>
          <input
            className="w-full rounded-2xl bg-ink-900/60 px-4 py-3 text-center text-lg text-white placeholder:text-slate-500 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={t('blankGuess.placeholder')}
            disabled={submitted}
            autoFocus
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <Button onClick={submit} disabled={submitted || !guess.trim()}>
            {submitted ? t('common.loading') : t('blankGuess.submit')}
          </Button>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-2 text-center animate-pop-in">
          <span className="animate-pulse text-3xl">🤔</span>
          <p className="font-medium text-slate-200">
            {eliminated
              ? t('blankGuess.waitingName', { name: eliminated.name })
              : t('blankGuess.waiting')}
          </p>
        </Card>
      )}
    </Screen>
  );
}
