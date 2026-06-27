import { useTranslation } from 'react-i18next';
import LangToggle from './LangToggle';
import { useStore } from '@/store';

/** App mark + title, with a CASE № chip when inside a room, and the language toggle. */
export default function Header() {
  const { t } = useTranslation();
  const roomState = useStore((s) => s.roomState);

  return (
    <header className="safe-top safe-x sticky top-0 z-20 bg-noir-950">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 border-b border-noir-700 pb-2 pt-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-amber"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <circle cx="12" cy="12" r="7" />
            <path d="M12 1.8v4.4M12 17.8v4.4M1.8 12h4.4M17.8 12h4.4" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          </svg>
          <h1 className="truncate text-base font-bold tracking-[0.14em] text-paper">
            {t('app.title')}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {roomState && (
            <span className="flex items-center gap-1.5 border border-noir-700 px-2.5 py-1">
              <span className="label text-paper-faint">№</span>
              <span className="code text-sm">{roomState.code}</span>
            </span>
          )}
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
