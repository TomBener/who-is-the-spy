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
      className="no-select flex items-center rounded-full bg-ink-700/80 p-0.5 ring-1 ring-white/10"
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
              'min-w-[34px] rounded-full px-2.5 py-1 text-xs font-semibold transition',
              active
                ? 'bg-brand-500 text-white shadow'
                : 'text-slate-300 hover:text-white',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
