import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ScreenProps {
  children: ReactNode;
  /** Vertically center the column (used for sparse screens like Home/Reveal). */
  center?: boolean;
  className?: string;
}

/**
 * The standard mobile page frame: a centered max-w-md single column with
 * safe-area padding and a mount fade-in. (Bottom safe-area padding lives on
 * the app footer, which always renders below the screen.)
 */
export default function Screen({ children, center = false, className }: ScreenProps) {
  return (
    <main className="safe-x flex flex-1 flex-col">
      <div
        className={clsx(
          'mx-auto flex w-full max-w-md flex-1 flex-col gap-5 pb-4 pt-2 animate-fade-in',
          center && 'justify-center',
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}
