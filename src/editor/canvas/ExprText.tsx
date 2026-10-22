import { memo } from 'react';
import { FONT_SIZE } from '@/core/layout/geometry';
import { baseline } from './svg';

/** An expression (receptivity, action condition) drawn as SVG text, vertically centered on y. */
export const ExprText = memo(function ExprText({
  source,
  x,
  y,
}: {
  source: string;
  x: number;
  y: number;
}) {
  return (
    <text className="gm-text" x={x} y={baseline(y, FONT_SIZE)}>
      {source}
    </text>
  );
});
