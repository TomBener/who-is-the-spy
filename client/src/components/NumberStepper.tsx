import clsx from 'clsx';

interface NumberStepperProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** A − value + control for integer config counts, with clamped bounds. */
export default function NumberStepper({
  label,
  value,
  min = 0,
  max,
  onChange,
  disabled = false,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const dec = () => !disabled && onChange(clamp(value - 1));
  const inc = () => !disabled && onChange(clamp(value + 1));

  const btn =
    'no-select grid h-11 w-11 place-items-center rounded-xl bg-ink-700 text-xl font-bold text-white ' +
    'ring-1 ring-white/10 transition active:scale-90 disabled:opacity-30 disabled:active:scale-100';

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-200">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="decrease"
          className={btn}
          onClick={dec}
          disabled={disabled || value <= min}
        >
          −
        </button>
        <span
          className={clsx(
            'w-8 text-center text-lg font-bold tabular-nums',
            value > 0 ? 'text-brand-200' : 'text-slate-400',
          )}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="increase"
          className={btn}
          onClick={inc}
          disabled={disabled || value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}
