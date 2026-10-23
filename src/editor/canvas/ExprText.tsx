import { memo, type ReactNode } from 'react';
import type { BoolNode } from '@/core/expr/ast';
import { cachedBool } from '@/core/expr/cache';
import { formatTextbook, textbookSignalColumns, type Columns, type Run } from '@/core/expr/format';
import { signalsOf } from '@/core/expr/signals';
import { CHAR_WIDTH_EM, FONT_SIZE } from '@/core/layout/geometry';
import { usePrefs } from '@/app/prefs';
import { baseline } from './svg';

const CW = FONT_SIZE * CHAR_WIDTH_EM;
/** Height of the first overbar above the baseline, and spacing between stacked bars. */
const BAR_RISE = FONT_SIZE * 0.86;
const BAR_STEP = 2.5;

function bars(runs: Run[], x: number, by: number) {
  const out: { x1: number; x2: number; y: number }[] = [];
  let col = 0;
  for (const r of runs) {
    const len = [...r.text].length;
    for (let level = 1; level <= r.bars; level++) {
      out.push({
        x1: x + col * CW,
        x2: x + (col + len) * CW,
        y: by - BAR_RISE - (level - 1) * BAR_STEP,
      });
    }
    col += len;
  }
  return out;
}

/** Columns of the signals listed in `lit` (indices in signalsOf order, comma separated). */
function litColumns(ast: BoolNode, textbook: boolean, lit: string): Columns[] {
  const on = new Set(lit.split(',').map(Number));
  const all: Columns[] = textbook
    ? textbookSignalColumns(ast)
    : signalsOf(ast).map((s) => ({ start: s.start, end: s.end }));
  return all.filter((_, i) => on.has(i));
}

/** The text with the columns in `on` (in order, not overlapping) as highlighted tspans. */
function withLit(chars: string[], on: Columns[]): ReactNode[] {
  const out: ReactNode[] = [];
  let col = 0;
  for (const c of on) {
    if (c.start > col) out.push(chars.slice(col, c.start).join(''));
    out.push(
      <tspan key={c.start} className="gm-signal-on">
        {chars.slice(c.start, c.end).join('')}
      </tspan>,
    );
    col = c.end;
  }
  out.push(chars.slice(col).join(''));
  return out;
}

/**
 * An expression (receptivity, condition) drawn as SVG text, vertically centered on y, starting at x
 * or, with anchor "end", ending at x. In textbook
 * notation NOT is an overbar; bars are drawn as lines from the monospace metrics so they match
 * exports exactly. Unparseable text is shown as typed, with a dashed underline. While simulating,
 * the signals that are true (`lit`: a variable on, a step active, a comparison holding) are green
 * and underlined.
 */
export const ExprText = memo(function ExprText({
  source,
  x: at,
  y,
  anchor = 'start',
  lit,
}: {
  source: string;
  x: number;
  y: number;
  anchor?: 'start' | 'end';
  /** Indices (signalsOf order, comma separated) of the signals that are true. */
  lit?: string;
}) {
  const textbook = usePrefs((s) => s.textbookNotation);
  const by = baseline(y, FONT_SIZE);
  const parsed = source.trim() ? cachedBool(source) : null;
  const runs = parsed?.ok && textbook ? formatTextbook(parsed.value) : null;
  // Monospace: the drawn width is known exactly, so "end" is a plain shift.
  const shown = runs ? runs.map((r) => r.text).join('') : source;
  const x = anchor === 'end' ? at - [...shown].length * CW : at;
  if (parsed && !parsed.ok) {
    return (
      <g>
        <text className="gm-text" x={x} y={by}>
          {source}
        </text>
        <path
          className="gm-invalid"
          d={`M${x} ${by + 3}h${Math.max(CW, [...source].length * CW)}`}
        />
      </g>
    );
  }
  const on = lit && parsed?.ok ? litColumns(parsed.value, !!runs, lit) : [];
  return (
    <g>
      <text className="gm-text" x={x} y={by}>
        {on.length ? withLit([...shown], on) : shown}
      </text>
      {on.map((c) => (
        <path
          key={c.start}
          className="gm-signal-line"
          d={`M${x + c.start * CW} ${by + 3}h${(c.end - c.start) * CW}`}
        />
      ))}
      {runs &&
        bars(runs, x, by).map((b, i) => (
          <path key={i} className="gm-bar" d={`M${b.x1 + 0.5} ${b.y}H${b.x2 - 0.5}`} />
        ))}
    </g>
  );
});
