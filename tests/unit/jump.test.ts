/** Jumps: a transition's link to its step drawn as an arrow marked X10 instead of a line. */
import { describe, expect, it } from 'vitest';
import { autoLayout } from '@/core/layout/autoLayout';
import { computeGeometry, isJump } from '@/core/layout/geometry';
import { copyElements } from '@/core/model/clipboard';
import { createGrafcet } from '@/core/model/factory';
import { addStep, addTransition, appendAfterTransition, deleteElements } from '@/core/model/ops';
import type { Grafcet, Id } from '@/core/model/types';

/** 0 → 1 → 2, and the transition after 2 jumps back to 0. */
function chart(): { g: Grafcet; s: Id[]; t: Id[] } {
  const g = createGrafcet('G1');
  const s = [0, 1, 2].map(
    (n) => addStep(g, { x: 100, y: n * 120 }, n ? 'normal' : 'initial', n).id,
  );
  const t = [
    addTransition(g, { x: 100, y: 60 }, [s[0]!], [s[1]!], 'a').id,
    addTransition(g, { x: 100, y: 180 }, [s[1]!], [s[2]!], 'b').id,
    addTransition(g, { x: 100, y: 300 }, [s[2]!], [s[0]!], 'c').id,
  ];
  g.transitions[t[2]!]!.jump = true;
  return { g, s, t };
}

describe('jump geometry', () => {
  it('draws an arrow marked with the step instead of a line', () => {
    const { g, s, t } = chart();
    const geom = computeGeometry(g);
    expect(geom.links.some((l) => l.transitionId === t[2] && l.side === 'out')).toBe(false);
    const from = geom.jumps.find((j) => j.side === 'from')!;
    expect(from.elementId).toBe(t[2]);
    expect(from.label?.text).toBe('X0');
    expect(from.arrow.dir).toBe('down');
    // Step 0 is reached only by the jump: an arrow into it says where from.
    const into = geom.jumps.find((j) => j.side === 'to')!;
    expect(into.elementId).toBe(s[0]);
    expect(into.label?.text).toBe('X2');
  });

  it('draws a line again when the flag is removed, and ignores it with AND links', () => {
    const { g, t } = chart();
    delete g.transitions[t[2]!]!.jump;
    expect(computeGeometry(g).jumps).toEqual([]);
    expect(computeGeometry(g).links.some((l) => l.transitionId === t[2] && l.loop)).toBe(true);
    const tr = g.transitions[t[2]!]!;
    tr.jump = true;
    tr.to.push(addStep(g, { x: 200, y: 360 }).id);
    expect(isJump(tr)).toBe(false);
  });

  it('auto-layout does not move the target of a jump under it', () => {
    const { g, s, t } = chart();
    // A forward jump from step 1 to step 2, past nothing: without the wire, 2 is a root of its own.
    g.transitions[t[1]!]!.jump = true;
    const pos = autoLayout(g);
    expect(pos.get(s[0]!)!.y).toBeLessThan(pos.get(s[1]!)!.y);
  });
});

describe('jumps through editing', () => {
  it('delete-with-heal keeps the jump on the transition that takes over', () => {
    const { g, s, t } = chart();
    deleteElements(g, [s[2]!]);
    const tr = g.transitions[t[1]!]!;
    expect(tr.to).toEqual([s[0]]);
    expect(isJump(tr)).toBe(true);
  });

  it('Enter on a jumping transition inserts a step; the new transition jumps', () => {
    const { g, t } = chart();
    const r = appendAfterTransition(g, t[2]!)!;
    expect(g.transitions[t[2]!]!.jump).toBeUndefined();
    expect(isJump(g.transitions[r.transitionId!]!)).toBe(true);
  });

  it('a copy without the target step ends as a sink, not a jump', () => {
    const { g, s, t } = chart();
    const copy = copyElements(g, [s[2]!, t[2]!])!;
    const tr = copy.transitions.find((x) => x.id === t[2])!;
    expect(tr.to).toEqual([]);
    expect(tr.jump).toBeUndefined();
  });
});
