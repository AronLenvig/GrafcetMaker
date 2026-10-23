/** Routing of loop (upward) links: bottom lines clear of their own sequence, lanes, overrides. */
import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, EXAMPLES } from '@/app/examples/examples';
import { computeGeometry, stepRect, type LinkGeom } from '@/core/layout/geometry';
import { addStep, moveElements } from '@/core/model/ops';
import type { Grafcet, Point } from '@/core/model/types';

const drill = (): Grafcet => {
  const p = EXAMPLES.drillingStation();
  return p.grafcets[p.grafcetOrder[0]!]!;
};

const loops = (g: Grafcet) => computeGeometry(g).links.filter((l) => l.loop);

/** The loop from the transition whose receptivity contains `text`. */
const loopFrom = (g: Grafcet, text: string): LinkGeom =>
  loops(g).find((l) => g.transitions[l.transitionId]!.receptivity.includes(text))!;

/** Bottom line of a loop: from below its source to the foot of its side lane. */
const bottom = (l: LinkGeom): [Point, Point] => [l.points[1]!, l.points[2]!];

/** Segments of a polyline. */
function segments(points: readonly Point[]): [Point, Point][] {
  return points.slice(1).map((b, i) => [points[i]!, b]);
}

/** Does a horizontal line strictly cross a vertical segment, or pass through a step? */
function crossings(g: Grafcet): string[] {
  const geom = computeGeometry(g);
  const out: string[] = [];
  for (const l of geom.links.filter((x) => x.loop)) {
    const [a, b] = bottom(l);
    const [x1, x2] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    for (const other of geom.links) {
      if (other === l) continue;
      for (const [p, q] of segments(other.points)) {
        if (p.x !== q.x) continue;
        const [y1, y2] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
        if (p.x > x1 && p.x < x2 && a.y > y1 && a.y < y2) out.push(`${l.key} × ${other.key}`);
      }
    }
    for (const s of Object.values(g.steps)) {
      const r = stepRect(s);
      if (r.x < x2 && r.x + r.width > x1 && a.y > r.y && a.y < r.y + r.height)
        out.push(`${l.key} × step ${s.number}`);
    }
  }
  return out;
}

describe('loop routing', () => {
  it.each(EXAMPLE_IDS)('%s: no loop bottom line crosses a wire or a step', (id) => {
    const p = EXAMPLES[id]();
    for (const gid of p.grafcetOrder) expect(crossings(p.grafcets[gid]!)).toEqual([]);
  });

  it('a loop from a right-hand branch passes below the sequence to its left', () => {
    const g = drill();
    const right = loopFrom(g, '< 100');
    const main = loopFrom(g, 'ack');
    // Below the last transition's own loop line, not through the main sequence.
    expect(bottom(right)[0].y).toBeGreaterThan(bottom(main)[0].y);
    // Both return to step 0: one shared lane, one arrow.
    expect(right.loop!.sideX).toBe(main.loop!.sideX);
    expect([right, main].filter((l) => l.arrow)).toHaveLength(1);
  });

  it('a separate sequence beside the chart does not move the loops', () => {
    const g = drill();
    const before = loops(g).map((l) => l.points);
    const lane = loops(g)[0]!.loop!.sideX;
    addStep(g, { x: lane - 40, y: 400 });
    expect(loops(g).map((l) => l.points)).toEqual(before);
  });

  it('keeps a dragged bottom line (never above its source) and moves it with the transition', () => {
    const g = drill();
    const tid = loopFrom(g, '< 100').transitionId;
    const t = g.transitions[tid]!;
    t.routing = { dropY: t.position.y + 300 };
    expect(bottom(loopFrom(g, '< 100'))[0].y).toBe(t.position.y + 300);
    t.routing = { dropY: t.position.y - 200 };
    expect(bottom(loopFrom(g, '< 100'))[0].y).toBeGreaterThan(t.position.y);
    t.routing = { sideX: -100, dropY: t.position.y + 300 };
    moveElements(g, [tid], 20, 40);
    expect(t.routing).toEqual({ sideX: -80, dropY: t.position.y + 300 });
    expect(loopFrom(g, '< 100').loop!.sideX).toBe(-80);
  });
});
