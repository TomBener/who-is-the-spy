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
      className={clsx(
        'no-select inline-flex items-center gap-2 self-center rounded-full bg-ink-700/80 px-4 py-2 text-sm ring-1 ring-white/10 transition active:scale-95',
        className,
      )}
    >
      <span>{open ? '🙈' : '👁️'}</span>
      <span className="font-medium text-slate-200">
        {open
          ? isBlank
            ? t('describe.blankPeek')
            : secret?.word
          : t('describe.peekWord')}
      </span>
    </button>
  );
}
