/** Routing of loop (upward) links: bottom lines clear of their own sequence, lanes, overrides. */
import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, EXAMPLES } from '@/app/examples/examples';
import { autoLayout } from '@/core/layout/autoLayout';
import {
  computeGeometry,
  flowOf,
  nextStepPosition,
  portPosition,
  ROW,
  STEP_HALF,
  stepRect,
  STUB,
  transitionBar,
  transitionHitRect,
  transitionTextAnchor,
  type LinkGeom,
} from '@/core/layout/geometry';
import { createGrafcet, createProject, createStep } from '@/core/model/factory';
import {
  addStep,
  addTransition,
  appendAfterTransition,
  moveElements,
  setTransitionFlow,
} from '@/core/model/ops';
import type { Grafcet, Id, Point, StepKind } from '@/core/model/types';

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

describe('loops inside parallel branches', () => {
  /** 1 → 2 → AND divergence to three branches, each looping back to its own first step. */
  const branches = (): Grafcet => {
    const g = createGrafcet('G1');
    const at = (x: number) => ({ x, y: 0 });
    const step = (n: number, x: number, kind: StepKind = 'normal'): Id => {
      const s = createStep(n, at(x), kind);
      g.steps[s.id] = s;
      return s.id;
    };
    const s1 = step(1, 0, 'initial');
    const s2 = step(2, 0);
    addTransition(g, at(0), [s1], [s2], 'RunningMode * /CycleStop');
    const heads = (
      [
        [33, 11, 'B10', 'B11'],
        [34, 21, 'B20', 'B21'],
        [35, 36, 'B30 * B20', 'B31'],
      ] as const
    ).map(([head, tail, down, back], i) => {
      const a = step(head, i * 100);
      const b = step(tail, i * 100);
      addTransition(g, at(i * 100), [a], [b], down);
      addTransition(g, at(i * 100), [b], [a], back);
      return a;
    });
    addTransition(g, at(0), [s2], heads, '1');
    for (const [id, p] of autoLayout(g)) (g.steps[id] ?? g.transitions[id])!.position = p;
    return g;
  };

  it('auto-layout keeps each loop beside its own branch, not around the others', () => {
    const g = branches();
    const lanes = loops(g)
      .map((l) => ({ x: l.loop!.sideX, head: g.steps[l.stepId]!.position.x }))
      .sort((a, b) => a.head - b.head);
    expect(lanes).toHaveLength(3);
    lanes.forEach((l, i) => {
      expect(l.x).toBeLessThan(l.head - STEP_HALF);
      if (i > 0) expect(l.x).toBeGreaterThan(lanes[i - 1]!.head + STEP_HALF);
    });
    expect(crossings(g)).toEqual([]);
  });
});

describe('transitions flowing right to left', () => {
  /** Step 0 at (300, 100) → transition → step 1; the transition is turned right to left. */
  function chart(t: Point, s1: Point): Grafcet {
    const p = createProject('R');
    const g = p.grafcets[p.grafcetOrder[0]!]!;
    const s0 = Object.values(g.steps)[0]!;
    s0.position = { x: 300, y: 100 };
    const step1 = addStep(g, s1);
    g.transitions.t = {
      id: 't',
      from: [s0.id],
      to: [step1.id],
      receptivity: 'start',
      position: t,
    };
    setTransitionFlow(g, ['t'], 'left');
    return g;
  }
  const link = (g: Grafcet, side: 'in' | 'out') =>
    computeGeometry(g).links.find((l) => l.side === side)!;

  it('enters on the right and leaves on the left, with arrows pointing left', () => {
    const g = chart({ x: 200, y: 160 }, { x: 100, y: 240 });
    const tr = g.transitions.t!;
    expect(flowOf(tr)).toBe('left');
    expect(link(g, 'in').points).toEqual([
      { x: 300, y: 120 },
      { x: 300, y: 160 },
      { x: 200, y: 160 },
    ]);
    expect(link(g, 'in').flowArrow).toEqual({ x: 250, y: 160, dir: 'left' });
    expect(link(g, 'out').points).toEqual([
      { x: 200, y: 160 },
      { x: 100, y: 160 },
      { x: 100, y: 220 },
    ]);
    expect(link(g, 'out').flowArrow).toEqual({ x: 150, y: 160, dir: 'left' });
    expect(portPosition(g, 't', 'in')).toEqual({ x: 210, y: 160 });
    expect(portPosition(g, 't', 'out')).toEqual({ x: 190, y: 160 });
  });

  it('turned in place in a vertical sequence: lanes on both sides, never through the bar', () => {
    const g = chart({ x: 300, y: 160 }, { x: 300, y: 220 + 40 });
    const lane = 300 + STUB;
    expect(link(g, 'in').points).toEqual([
      { x: 300, y: 120 },
      { x: 300, y: 130 },
      { x: lane, y: 130 },
      { x: lane, y: 160 },
      { x: 300, y: 160 },
    ]);
    expect(link(g, 'out').points[1]).toEqual({ x: 300 - STUB, y: 160 });
    expect(link(g, 'out').points.at(-1)).toEqual({ x: 300, y: 240 });
  });

  it('stays top to bottom with AND links, and Enter adds the next step below its left end', () => {
    const g = chart({ x: 200, y: 160 }, { x: 100, y: 240 });
    const tr = g.transitions.t!;
    expect(transitionBar(tr)).toMatchObject({ width: 3, height: 24 });
    const other = addStep(g, { x: 400, y: 240 });
    tr.to.push(other.id);
    expect(flowOf(tr)).toBe('down');
    tr.to.pop();
    tr.to = [];
    expect(nextStepPosition(tr)).toEqual({ x: 200 - ROW, y: 160 + ROW });
    const r = appendAfterTransition(g, 't')!;
    expect(g.steps[r.stepId]!.position).toEqual({ x: 200 - ROW, y: 160 + ROW });
    setTransitionFlow(g, ['t'], 'down');
    expect(tr.flow).toBeUndefined();
  });

  it('a click on the receptivity hits the transition', () => {
    const g = chart({ x: 200, y: 160 }, { x: 100, y: 240 });
    for (const flow of ['left', 'down'] as const) {
      setTransitionFlow(g, ['t'], flow);
      const tr = g.transitions.t!;
      const a = transitionTextAnchor(tr);
      const hit = transitionHitRect(tr);
      const inside = (x: number, y: number) =>
        x >= hit.x && x <= hit.x + hit.width && y >= hit.y && y <= hit.y + hit.height;
      expect(inside(a.x + 20, a.y)).toBe(true);
      expect(inside(tr.position.x, tr.position.y + 9)).toBe(true);
    }
  });
});
