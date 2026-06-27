import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { SecretAssignment } from '@spy/shared';
import Screen from '@/components/Screen';
import Button from '@/components/Button';
import Stamp from '@/components/Stamp';
import { socket } from '@/lib/socket';

interface Props {
  secret: SecretAssignment | null;
  isHost: boolean;
}

export default function RevealScreen({ secret, isHost }: Props) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  // 白板 / Mr.White has no word — shown only AFTER declassifying (no pre-tell).
  const isBlank = secret?.role === 'blank';

  return (
    <Screen center>
      <div className="text-center">
        <span className="label">// {t('reveal.title')}</span>
        <p className="mt-2 text-sm text-paper-dim">{t('reveal.holdHint')}</p>
      </div>

      {/* Dossier ID card. Tap to declassify — the redacted bar wipes away.
          Civilian vs undercover are intentionally identical. */}
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="no-select panel relative block w-full overflow-hidden rounded-sm text-left shadow-panel active:translate-y-px"
      >
        {/* file header strip */}
        <div className="flex items-center justify-between border-b border-noir-700 px-4 py-2.5">
          <span className="label">SUBJECT FILE</span>
          <span className={clsx('label', isBlank && revealed ? 'text-alert' : 'text-amber')}>
            {isBlank && revealed ? 'NO RECORD' : '机密 · CLASSIFIED'}
          </span>
        </div>

        {/* word zone */}
        <div className="relative grid min-h-[240px] place-items-center px-6 py-10 text-center">
          {/* underneath: the word, or the 白板 notice */}
          {isBlank ? (
            <div className="animate-fade-in">
              <Stamp color="alert" className="animate-stamp-in">
                {t('reveal.blankTitle')}
              </Stamp>
              <p className="mx-auto mt-4 max-w-[16rem] text-sm leading-relaxed text-paper-dim">
                {t('reveal.blankBody')}
              </p>
            </div>
          ) : (
            <div>
              <span className="label">{t('reveal.yourWord')}</span>
              <div className="mt-3 break-all font-mono text-4xl font-bold tracking-wide text-amber">
                {secret?.word}
              </div>
            </div>
          )}

          {/* redacted bar on top — wipes left when declassified */}
          <div
            className={clsx(
              'redacted absolute inset-0 grid origin-left place-items-center transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.3,1)]',
              revealed && 'scale-x-0',
            )}
          >
            <span className="label text-paper-dim">{t('reveal.tapToReveal')}</span>
          </div>
        </div>
      </button>

      {revealed && (
        <p className="label animate-fade-in text-center normal-case text-paper-faint">
          {t('reveal.hideAgain')} · {t('reveal.seen')}
        </p>
      )}

      {isHost && (
        <Button onClick={() => socket.emit('phase:next')}>{t('reveal.hostStart')}</Button>
      )}
    </Screen>
  );
}
