import { useTranslation } from 'react-i18next';
import LangToggle from './LangToggle';
import { useStore } from '@/store';

/** App title + language toggle, with a room-code chip when inside a room. */
export default function Header() {
  const { t } = useTranslation();
  const roomState = useStore((s) => s.roomState);

  return (
    <header className="safe-top safe-x sticky top-0 z-20">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-base shadow-md shadow-brand-900/40">
            🕵️
          </span>
          <h1 className="truncate text-lg font-bold tracking-tight text-white">
            {t('app.title')}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {roomState && (
            <span className="rounded-full bg-ink-700/80 px-3 py-1 font-mono text-sm font-bold tracking-[0.2em] text-brand-200 ring-1 ring-white/10">
              {roomState.code}
            </span>
          )}
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
