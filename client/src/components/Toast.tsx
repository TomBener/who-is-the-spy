import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useStore } from '@/store';

const VISIBLE_MS = 3200;

/** Bottom toast that surfaces `lastError` via i18n, then auto-dismisses. */
export default function Toast() {
  const { t } = useTranslation();
  const lastError = useStore((s) => s.lastError);
  const clearError = useStore((s) => s.clearError);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!lastError) return;
    setShown(true);
    const hideTimer = setTimeout(() => setShown(false), VISIBLE_MS);
    const clearTimer = setTimeout(() => clearError(), VISIBLE_MS + 250);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [lastError, clearError]);

  if (!lastError) return null;

  // Map known error keys to errors.<key>, else generic fallback.
  const message = t([`errors.${lastError}`, 'errors.generic']);

  return (
    <div
      className="safe-x pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={clsx(
          'pointer-events-auto w-full max-w-md rounded-2xl bg-rose-600 px-4 py-3 text-center text-sm font-medium text-white shadow-xl shadow-black/40 transition-all duration-200',
          shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
        onClick={() => setShown(false)}
      >
        {message}
      </div>
    </div>
  );
}
