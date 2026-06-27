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

const base =
  'no-select inline-flex items-center justify-center gap-2 font-semibold rounded-2xl ' +
  'transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-brand-300/70 disabled:opacity-40 disabled:pointer-events-none ' +
  'disabled:active:scale-100 select-none';

const sizes: Record<Size, string> = {
  md: 'min-h-[44px] px-4 text-sm',
  lg: 'min-h-[52px] px-5 text-base',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white shadow-lg shadow-brand-900/40 hover:bg-brand-400 active:bg-brand-600',
  secondary:
    'bg-ink-700 text-slate-100 ring-1 ring-white/10 hover:bg-ink-600 active:bg-ink-700',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/5 active:bg-white/10',
  danger:
    'bg-rose-600 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500 active:bg-rose-700',
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
      className={clsx(
        base,
        sizes[size],
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
