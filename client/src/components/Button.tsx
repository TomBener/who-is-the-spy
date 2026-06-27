import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

// Sharp, official-looking action keys. Uppercase + tracking for the "stencil"
// feel; depth via borders, not glow.
const base =
  'no-select inline-flex items-center justify-center gap-2 rounded-sm font-bold uppercase ' +
  'tracking-[0.12em] transition active:translate-y-px focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-amber/60 disabled:opacity-35 disabled:pointer-events-none disabled:active:translate-y-0';

const sizes: Record<Size, string> = {
  md: 'min-h-[44px] px-4 text-[13px]',
  lg: 'min-h-[52px] px-5 text-sm',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-amber text-noir-950 border border-amber-600 hover:bg-amber-400 active:bg-amber-600',
  secondary:
    'bg-transparent text-paper border border-noir-600 hover:border-amber hover:text-amber active:bg-noir-800',
  ghost: 'bg-transparent text-paper-dim hover:text-paper active:bg-noir-800',
  danger:
    'bg-alert text-white border border-alert-600 hover:bg-alert-400 active:bg-alert-600',
};

export default function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = true,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(base, sizes[size], variants[variant], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
