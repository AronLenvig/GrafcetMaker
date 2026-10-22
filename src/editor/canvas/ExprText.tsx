import { memo } from 'react';
import { cachedBool } from '@/core/expr/cache';
import { formatTextbook, type Run } from '@/core/expr/format';
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

/**
 * An expression (receptivity, condition) drawn as SVG text, vertically centered on y. In textbook
 * notation NOT is an overbar; bars are drawn as lines from the monospace metrics so they match
 * exports exactly. Unparseable text is shown as typed, with a dashed underline.
 */
export const ExprText = memo(function ExprText({
  source,
  x,
  y,
}: {
  source: string;
  x: number;
  y: number;
}) {
  const textbook = usePrefs((s) => s.textbookNotation);
  const by = baseline(y, FONT_SIZE);
  const parsed = source.trim() ? cachedBool(source) : null;
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
  if (!parsed || !textbook) {
    return (
      <text className="gm-text" x={x} y={by}>
        {source}
      </text>
    );
  }
  const runs = formatTextbook(parsed.value);
  return (
    <g>
      <text className="gm-text" x={x} y={by}>
        {runs.map((r) => r.text).join('')}
      </text>
      {bars(runs, x, by).map((b, i) => (
        <path key={i} className="gm-bar" d={`M${b.x1 + 0.5} ${b.y}H${b.x2 - 0.5}`} />
      ))}
    </g>
  );
});
