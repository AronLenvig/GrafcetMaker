import { useRef } from 'react';
import { cx } from './primitives';

/**
 * Drag handle resizing an adjacent panel. `sign` = +1 when dragging right/down grows the panel.
 * Keyboard: arrows resize by 16 px (role=separator, WAI-ARIA window splitter pattern).
 */
export function Splitter({
  orientation,
  value,
  min,
  max,
  sign,
  label,
  onChange,
}: {
  orientation: 'vertical' | 'horizontal';
  value: number;
  min: number;
  max: number;
  sign: 1 | -1;
  label: string;
  onChange: (v: number) => void;
}) {
  const start = useRef<{ pos: number; value: number } | null>(null);
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)));
  const vertical = orientation === 'vertical';
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={cx(
        'shrink-0 bg-border hover:bg-accent focus-visible:bg-accent',
        vertical
          ? 'w-px cursor-col-resize px-[2px] [background-clip:content-box]'
          : 'h-px cursor-row-resize py-[2px] [background-clip:content-box]',
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { pos: vertical ? e.clientX : e.clientY, value };
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const pos = vertical ? e.clientX : e.clientY;
        onChange(clamp(start.current.value + sign * (pos - start.current.pos)));
      }}
      onPointerUp={() => (start.current = null)}
      onKeyDown={(e) => {
        const grow = vertical
          ? { ArrowRight: 16, ArrowLeft: -16 }
          : { ArrowDown: 16, ArrowUp: -16 };
        const d = grow[e.key as keyof typeof grow];
        if (d !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          onChange(clamp(value + sign * d));
        }
      }}
    />
  );
}
