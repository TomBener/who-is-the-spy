import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/** A frosted dark surface card with subtle border + shadow. */
export default function Card({
  children,
  className,
  padded = true,
  ...rest
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-3xl bg-ink-800/80 ring-1 ring-white/10 shadow-xl shadow-black/30 backdrop-blur',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
