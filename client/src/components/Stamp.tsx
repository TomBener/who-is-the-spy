import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StampProps {
  children: ReactNode;
  color?: 'amber' | 'alert' | 'paper';
  className?: string;
}

/** A rotated, outlined dossier stamp (e.g. 机密 / 结案 / NO RECORD). */
export default function Stamp({ children, color = 'amber', className }: StampProps) {
  const tone = { amber: 'text-amber', alert: 'text-alert', paper: 'text-paper-dim' }[color];
  return (
    <span
      className={clsx(
        'inline-block -rotate-6 border-2 border-current px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.2em]',
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}
