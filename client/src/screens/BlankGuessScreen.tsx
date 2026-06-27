import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Stamp from '@/components/Stamp';
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
      <div className="flex flex-col items-center gap-3 text-center">
        <Stamp color="alert" className="animate-stamp-in">
          {t('roles.blank')}
        </Stamp>
        <span className="label">// {t('blankGuess.title')}</span>
      </div>

      {amTheBlank ? (
        <Card className="flex flex-col gap-4">
          <div className="text-center">
            <p className="label text-amber">{t('blankGuess.youAreBlank')}</p>
            <p className="mt-1.5 text-sm text-paper-dim">{t('blankGuess.yourChance')}</p>
          </div>
          <input
            className="field text-center disabled:opacity-50"
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
        <Card className="flex flex-col items-center gap-2 text-center">
          <span className="label animate-flicker text-amber">···</span>
          <p className="font-mono text-sm uppercase tracking-[0.12em] text-paper-dim">
            {eliminated
              ? t('blankGuess.waitingName', { name: eliminated.name })
              : t('blankGuess.waiting')}
          </p>
        </Card>
      )}
    </Screen>
  );
}
