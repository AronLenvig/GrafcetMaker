import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoolNode } from '@/core/expr/ast';
import { cachedBool } from '@/core/expr/cache';
import { formatTextbook, textbookSignalColumns, type Columns, type Run } from '@/core/expr/format';
import { signalsOf } from '@/core/expr/signals';
import { CHAR_WIDTH_EM, FONT_SIZE, LABEL_FONT_SIZE } from '@/core/layout/geometry';
import { usePrefs } from '@/app/prefs';
import { cx } from '@/app/ui/primitives';
import { baseline } from './svg';

const CW = FONT_SIZE * CHAR_WIDTH_EM;
/** Height of the first overbar above the baseline, and spacing between stacked bars. */
const BAR_RISE = FONT_SIZE * 0.86;
const BAR_STEP = 2.5;
/** Simulation: the box showing a variable's value over its name. */
const VALUE_HEIGHT = LABEL_FONT_SIZE + 3;
const VALUE_CW = LABEL_FONT_SIZE * CHAR_WIDTH_EM;
/** An identifier of the drawn text (not the unit of a duration such as `5s`). */
const IDENTIFIER = /(?<![A-Za-z0-9_])[A-Za-z_][A-Za-z0-9_]*/g;

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

/** A signal of the drawn text that is true, or an input that can be switched, or both. */
interface Marked extends Columns {
  on: boolean;
  /** BOOL input: its name (lower case), switched by a click while simulating. */
  input?: string;
}

/**
 * The marked signals of `ast` from a `signals` key (`on;inputs`: indices in signalsOf order,
 * comma separated), at their columns in the drawn text, in order.
 */
function markedSignals(ast: BoolNode, textbook: boolean, key: string): Marked[] {
  const ids = (list = '') => new Set(list ? list.split(',').map(Number) : []);
  const [onList, inputList] = key.split(';');
  const on = ids(onList);
  const inputs = ids(inputList);
  const signals = signalsOf(ast);
  const columns: Columns[] = textbook
    ? textbookSignalColumns(ast)
    : signals.map((x) => ({ start: x.start, end: x.end }));
  const out: Marked[] = [];
  columns.forEach((col, i) => {
    const sig = signals[i]!;
    if (!on.has(i) && !inputs.has(i)) return;
    out.push({
      ...col,
      on: on.has(i),
      ...(inputs.has(i) && sig.type === 'var' ? { input: sig.name.toLowerCase() } : {}),
    });
  });
  return out;
}

/** The text with the marked columns as tspans: true ones green, inputs clickable. */
function withMarks(chars: string[], marks: Marked[]): ReactNode[] {
  const out: ReactNode[] = [];
  let col = 0;
  for (const m of marks) {
    if (m.start > col) out.push(chars.slice(col, m.start).join(''));
    out.push(
      <tspan
        key={m.start}
        className={cx(m.on && 'gm-signal-on', m.input && 'gm-signal-input')}
        data-input={m.input}
      >
        {chars.slice(m.start, m.end).join('')}
      </tspan>,
    );
    col = m.end;
  }
  out.push(chars.slice(col).join(''));
  return out;
}

/**
 * Simulation: the value of each numeric variable (`values`: `name=shown`, comma separated) in a
 * box over each of its names in `text`, above any overbar; a click changes it (data-value, at the
 * box's center data-x/data-y).
 */
function ValueBoxes({
  text,
  x,
  by,
  bars,
  values,
}: {
  text: string;
  x: number;
  by: number;
  bars: number;
  values: string;
}) {
  const { t } = useTranslation();
  const shown = new Map(
    values.split(',').map((e) => [e.slice(0, e.indexOf('=')), e.slice(e.indexOf('=') + 1)]),
  );
  const bottom = (bars ? by - BAR_RISE - (bars - 1) * BAR_STEP : by - FONT_SIZE * 0.75) - 2;
  const cy = bottom - VALUE_HEIGHT / 2;
  const out: ReactNode[] = [];
  for (const m of text.matchAll(IDENTIFIER)) {
    const name = m[0].toLowerCase();
    const value = shown.get(name);
    if (value === undefined) continue;
    const cx = x + (m.index + m[0].length / 2) * CW;
    const w = [...value].length * VALUE_CW + 6;
    out.push(
      <g key={m.index} className="gm-value" data-value={name} data-x={cx} data-y={cy}>
        <title>{t('simulation.editValue', { name: m[0] })}</title>
        <rect x={cx - w / 2} y={bottom - VALUE_HEIGHT} width={w} height={VALUE_HEIGHT} rx={3} />
        <text className="gm-label" x={cx} y={baseline(cy, LABEL_FONT_SIZE)} textAnchor="middle">
          {value}
        </text>
      </g>,
    );
  }
  return <>{out}</>;
}

/**
 * An expression (receptivity, condition) drawn as SVG text, vertically centered on y, starting at x
 * or, with anchor "end", ending at x. In textbook
 * notation NOT is an overbar; bars are drawn as lines from the monospace metrics so they match
 * exports exactly. Unparseable text is shown as typed, with a dashed underline. While simulating
 * (`signals`), the signals that are true (a variable on, a step active, a comparison holding) are
 * green and underlined, BOOL inputs switch on a click, and numeric variables show their value
 * (`values`), changed by a click.
 */
export const ExprText = memo(function ExprText({
  source,
  x: at,
  y,
  anchor = 'start',
  signals,
  values,
}: {
  source: string;
  x: number;
  y: number;
  anchor?: 'start' | 'end';
  /**
   * Simulation: `on;inputs`, the indices (signalsOf order, comma separated) of the signals that
   * are true and of those that are BOOL inputs.
   */
  signals?: string;
  /** Simulation: `name=shown` (comma separated) for each numeric variable it reads. */
  values?: string;
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
  const marks = signals && parsed?.ok ? markedSignals(parsed.value, !!runs, signals) : [];
  return (
    <g>
      <text className="gm-text" x={x} y={by}>
        {marks.length ? withMarks([...shown], marks) : shown}
      </text>
      {marks
        .filter((m) => m.on)
        .map((c) => (
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
      {values && parsed?.ok && (
        <ValueBoxes
          text={shown}
          x={x}
          by={by}
          bars={runs ? Math.max(0, ...runs.map((r) => r.bars)) : 0}
          values={values}
        />
      )}
    </g>
  );
});
