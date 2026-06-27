import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { Lang } from '@spy/shared';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'zh', label: '中' },
  { value: 'en', label: 'EN' },
];

/** Compact segmented language switch; persists via i18next LanguageDetector. */
export default function LangToggle() {
  const { i18n } = useTranslation();
  const current: Lang = i18n.language?.startsWith('en') ? 'en' : 'zh';

  return (
    <div
      role="group"
      aria-label="Language"
      className="no-select flex items-center border border-noir-700"
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => void i18n.changeLanguage(opt.value)}
            className={clsx(
              'min-w-[34px] px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] transition',
              active
                ? 'border-amber bg-noir-900 text-amber'
                : 'border-transparent text-paper-dim hover:text-paper',
              'border',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
