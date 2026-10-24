import { useId, useRef, type ReactNode } from 'react';
import { cx, Tip } from '@/app/ui/primitives';

export interface PictureOption<T extends string> {
  value: T;
  label: string;
  /** Tooltip under the name: what the choice means. */
  help: string;
  /** SVG content in a 40 × 30 box, drawn with currentColor like the diagram symbol. */
  picture: ReactNode;
}

/**
 * A choice among pictures (WAI-ARIA radio group: arrow keys move the choice), as one row of
 * symbols with the chosen one named next to the label. Each picture is the symbol the diagram
 * draws for that choice, so it is recognized at a glance; pointing at one names and explains it.
 */
export function PicturePicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly PictureOption<T>[];
  onChange: (value: T) => void;
}) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  const chosen = options.find((o) => o.value === value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 text-xs">
        <span id={labelId} className="font-medium text-muted">
          {label}
        </span>
        <span className="ml-auto truncate font-medium" aria-hidden="true">
          {chosen?.label}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5"
      >
        {options.map((o, i) => {
          const selected = value === o.value;
          return (
            <Tip key={o.value} label={o.label} detail={o.help} side="top">
              <button
                ref={(el) => void (refs.current[i] = el)}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={o.label}
                tabIndex={selected ? 0 : -1}
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
                  'flex h-10 min-w-0 flex-1 items-center justify-center rounded-md',
                  selected
                    ? 'bg-surface text-text shadow-sm ring-1 ring-accent'
                    : 'text-muted hover:bg-surface/60 hover:text-text',
                )}
              >
                <svg
                  width="36"
                  height="27"
                  viewBox="0 0 40 30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  {o.picture}
                </svg>
              </button>
            </Tip>
          );
        })}
      </div>
    </div>
  );
}
