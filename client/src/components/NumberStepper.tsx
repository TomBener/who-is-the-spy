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
    'no-select grid h-10 w-10 place-items-center border border-noir-600 bg-noir-950 text-xl font-bold ' +
    'text-paper transition active:translate-y-px hover:border-amber hover:text-amber ' +
    'disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="label text-paper-dim">{label}</span>
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
            'w-8 text-center font-mono text-lg font-bold tabular-nums',
            value > 0 ? 'text-amber' : 'text-paper-faint',
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
