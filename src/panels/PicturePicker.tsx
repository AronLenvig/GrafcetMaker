import { useId, useRef, type ReactNode } from 'react';
import { cx } from '@/app/ui/primitives';

export interface PictureOption<T extends string> {
  value: T;
  label: string;
  /** Tooltip: what the choice means. */
  help: string;
  /** SVG content in a 40 × 30 box, drawn with currentColor like the diagram symbol. */
  picture: ReactNode;
}

/**
 * A choice among pictures (WAI-ARIA radio group: arrow keys move the choice). Each picture is the
 * symbol the diagram draws for that choice, so the choice is recognized at a glance.
 */
export function PicturePicker<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 3,
}: {
  label: string;
  value: T;
  options: readonly PictureOption<T>[];
  onChange: (value: T) => void;
  columns?: 3 | 4;
}) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-muted">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={cx('grid gap-1', columns === 4 ? 'grid-cols-4' : 'grid-cols-3')}
      >
        {options.map((o, i) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              ref={(el) => void (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              title={o.help}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                const delta =
                  e.key === 'ArrowRight' || e.key === 'ArrowDown'
                    ? 1
                    : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                      ? -1
                      : 0;
                if (!delta) return;
                e.preventDefault();
                move(i, delta);
              }}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-md border px-1 pt-1.5 pb-1 text-[11px] leading-tight',
                selected
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-muted hover:border-border-strong hover:text-text',
              )}
            >
              <svg
                width="40"
                height="30"
                viewBox="0 0 40 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                {o.picture}
              </svg>
              <span className="text-center">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
