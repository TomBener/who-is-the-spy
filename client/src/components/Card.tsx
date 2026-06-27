import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/** A solid document panel: hairline border, sharp corners — no gradient, no glass. */
export default function Card({ children, className, padded = true, ...rest }: CardProps) {
  return (
    <div className={clsx('panel rounded-sm shadow-panel', padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  );
}
