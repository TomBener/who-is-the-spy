import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { SecretAssignment } from '@spy/shared';

interface Props {
  secret: SecretAssignment | null;
  className?: string;
}

/** A collapsible chip to privately re-check your own word mid-game. */
export default function WordPeek({ secret, className }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isBlank = secret?.role === 'blank';

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={clsx(
        'no-select group inline-flex items-center gap-2.5 self-center border border-noir-700 bg-noir-850 px-4 py-2 transition active:translate-y-px hover:border-amber',
        className,
      )}
    >
      <span className={clsx('shrink-0', open ? 'text-amber' : 'text-paper-dim')}>
        {open ? (
          // eye-off
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.5 6.6C3.9 8.2 2.4 10.6 2 12c1 2.5 5 7 10 7a9.6 9.6 0 004.1-.9" />
            <path d="M9.9 9.9a3 3 0 004.2 4.2" />
          </svg>
        ) : (
          // eye
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        )}
      </span>

      {open ? (
        <span className="font-mono text-base font-bold tracking-wide text-amber">
          {isBlank ? t('describe.blankPeek') : secret?.word}
        </span>
      ) : (
        // Collapsed: the label sits behind a small redacted bar.
        <span className="relative inline-flex items-center">
          <span className="label text-paper-dim">{t('describe.peekWord')}</span>
          <span className="redacted absolute inset-0 -mx-1" aria-hidden />
        </span>
      )}
    </button>
  );
}
