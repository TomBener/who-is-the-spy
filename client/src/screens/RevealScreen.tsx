import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { SecretAssignment } from '@spy/shared';
import Screen from '@/components/Screen';
import Button from '@/components/Button';
import { socket } from '@/lib/socket';

interface Props {
  secret: SecretAssignment | null;
  isHost: boolean;
}

export default function RevealScreen({ secret, isHost }: Props) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  // 白板 / Mr.White has no word — show a distinct card (still no civilian/undercover tell).
  const isBlank = secret?.role === 'blank';

  return (
    <Screen center>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{t('reveal.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('reveal.holdHint')}</p>
      </div>

      {/* Tap-to-reveal card. Civilians and undercover are intentionally identical. */}
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className={clsx(
          'no-select relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center ring-1 transition active:scale-[0.98] animate-pop-in',
          revealed
            ? isBlank
              ? 'bg-gradient-to-br from-fuchsia-600 to-brand-700 ring-white/20'
              : 'bg-gradient-to-br from-brand-500 to-brand-700 ring-white/20'
            : 'bg-ink-800/80 ring-white/10',
        )}
      >
        {!revealed ? (
          <>
            <span className="text-5xl">🃏</span>
            <span className="text-lg font-semibold text-slate-200">
              {t('reveal.tapToReveal')}
            </span>
          </>
        ) : isBlank ? (
          <>
            <span className="text-5xl">🎭</span>
            <span className="text-2xl font-extrabold text-white">
              {t('reveal.blankTitle')}
            </span>
            <span className="px-2 text-sm leading-relaxed text-white/90">
              {t('reveal.blankBody')}
            </span>
          </>
        ) : (
          <>
            <span className="text-xs uppercase tracking-widest text-white/70">
              {t('reveal.yourWord')}
            </span>
            <span className="break-all text-4xl font-extrabold text-white">
              {secret?.word}
            </span>
          </>
        )}
      </button>

      {revealed && (
        <p className="text-center text-xs text-slate-400 animate-fade-in">
          {t('reveal.hideAgain')} ←→ {t('reveal.seen')}
        </p>
      )}

      {isHost && (
        <Button onClick={() => socket.emit('phase:next')}>
          {t('reveal.hostStart')}
        </Button>
      )}
    </Screen>
  );
}
