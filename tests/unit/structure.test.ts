import { describe, expect, it } from 'vitest';
import { autoLayout } from '@/core/layout/autoLayout';
import { PITCH, ROW } from '@/core/layout/geometry';
import { createGrafcet, createProject, createStep } from '@/core/model/factory';
import { indexGrafcet } from '@/core/model/graph';
import { appendAfterStep, connect } from '@/core/model/ops';
import { planRenumber, stepOrder } from '@/core/model/renumber';
import { addAlternativeBranch, addLoop, addParallelBranch } from '@/core/model/structure';
import type { Grafcet, Project } from '@/core/model/types';

const first = (p: Project): Grafcet => p.grafcets[p.grafcetOrder[0]!]!;
const byNumber = (g: Grafcet, n: number) => Object.values(g.steps).find((s) => s.number === n)!;

describe('branches and loops', () => {
  it('P on a step creates an AND divergence and convergence around it', () => {
    const p = createProject('P');
    const g = first(p);
    const s0 = byNumber(g, 0);
    const s1 = appendAfterStep(g, s0.id)!.stepId;
    appendAfterStep(g, s1);
    const ns = addParallelBranch(g, s1)!;
    const idx = indexGrafcet(g);
    const tin = idx.incoming.get(s1)![0]!;
    const tout = idx.outgoing.get(s1)![0]!;
    expect(tin.to).toEqual([s1, ns]);
    expect(tout.from).toEqual([s1, ns]);
    expect(g.steps[ns]!.position.y).toBe(g.steps[s1]!.position.y);
  });

  it('O on a step adds an alternative branch; O on a transition a bypass', () => {
    const p = createProject('O');
    const g = first(p);
    const s0 = byNumber(g, 0).id;
    const { transitionId } = appendAfterStep(g, s0)!;
    const alt = addAlternativeBranch(g, s0)!;
    expect(
      indexGrafcet(g)
        .outgoing.get(s0)!
        .map((t) => t.id),
    ).toEqual([transitionId, alt.transitionId]);
    const bypass = addAlternativeBranch(g, transitionId)!;
    expect(g.transitions[bypass.transitionId]).toMatchObject({
      from: [s0],
      to: g.transitions[transitionId]!.to,
    });
  });

  it('L loops from a step via a new transition, or closes a sink transition', () => {
    const p = createProject('L');
    const g = first(p);
    const s0 = byNumber(g, 0).id;
    const s1 = appendAfterStep(g, s0)!.stepId;
    const loop = addLoop(g, s1, s0)!;
    expect(g.transitions[loop]).toMatchObject({ from: [s1], to: [s0] });
    const t = appendAfterStep(g, s1)!.transitionId;
    expect(addLoop(g, t, s0)).toBeNull(); // already leads somewhere
  });
});

describe('renumbering rewrites references', () => {
  function setup() {
    const p = createProject('R');
    const g1 = first(p);
    const s0 = byNumber(g1, 0);
    const a = appendAfterStep(g1, s0.id)!;
    g1.steps[a.stepId]!.number = 5;
    const b = appendAfterStep(g1, a.stepId)!;
    g1.steps[b.stepId]!.number = 3;
    g1.transitions[b.transitionId]!.receptivity = 'X5 * 2s/X5';
    const g2 = createGrafcet('G2');
    const s20 = createStep(20, { x: 0, y: 0 }, 'initial');
    g2.steps[s20.id] = s20;
    p.grafcets[g2.id] = g2;
    p.grafcetOrder.push(g2.id);
    g2.actions.f = { id: 'f', stepId: s20.id, order: 0, kind: 'forcing', text: 'G1{5, X3}' };
    g2.actions.c = {
      id: 'c',
      stepId: s20.id,
      order: 1,
      kind: 'continuous',
      text: 'M',
      condition: 'X3 + X20',
    };
    return { p, g1, g2 };
  }

  it('orders steps along the flow and rewrites Xn and forcing orders', () => {
    const { p, g1, g2 } = setup();
    expect(stepOrder(g1).map((id) => g1.steps[id]!.number)).toEqual([0, 5, 3]);
    const plan = planRenumber(p, g1.id);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    plan.apply(p);
    expect(
      Object.values(g1.steps)
        .map((s) => s.number)
        .sort(),
    ).toEqual([0, 1, 2]);
    expect(Object.values(g1.transitions).map((t) => t.receptivity)).toContain('X1 * 2s/X1');
    expect(g2.actions.f!.text).toBe('G1{1, X2}');
    expect(g2.actions.c!.condition).toBe('X2 + X20');
  });

  it("keeps the grafcet's own number range", () => {
    const { p, g2 } = setup();
    const extra = createStep(25, { x: 0, y: 200 });
    g2.steps[extra.id] = extra;
    const plan = planRenumber(p, g2.id);
    expect(plan.ok).toBe(true);
    if (plan.ok) plan.apply(p);
    expect(
      Object.values(g2.steps)
        .map((s) => s.number)
        .sort(),
    ).toEqual([20, 21]);
  });

  it('refuses when a rewritten reference would point at another step', () => {
    const { p, g2 } = setup();
    const s2 = createStep(2, { x: 0, y: 0 });
    g2.steps[s2.id] = s2; // G2 now has its own step 2: its X3 → X2 would change meaning
    const plan = planRenumber(p, p.grafcetOrder[0]!);
    expect(plan).toEqual({ ok: false, conflicts: [2] });
  });
});

describe('auto-layout', () => {
  it('lays out nested divergences in columns centered under them, merges in line', () => {
    const p = createProject('A');
    const g = first(p);
    const s0 = byNumber(g, 0).id;
    // 0 -T- 1, then OR divergence at 1 with branches 2 and 3 converging on 4.
    const s1 = appendAfterStep(g, s0)!.stepId;
    const b1 = appendAfterStep(g, s1)!;
    const alt = addAlternativeBranch(g, s1)!;
    const tEnd1 = appendAfterStep(g, b1.stepId)!;
    const s4 = tEnd1.stepId;
    const t3 = appendAfterStep(g, alt.stepId!)!;
    // reroute the second branch's transition to 4 (OR convergence) and drop its own step
    g.transitions[t3.transitionId]!.to = [s4];
    delete g.steps[t3.stepId];
    // AND divergence inside the first branch.
    addParallelBranch(g, b1.stepId);
    // loop from 4 back to 0
    addLoop(g, s4, s0);
    // scramble positions
    for (const s of Object.values(g.steps))
      s.position = { x: Math.round(Math.random() * 900), y: Math.round(Math.random() * 900) };
    for (const t of Object.values(g.transitions))
      t.position = { x: Math.round(Math.random() * 900), y: Math.round(Math.random() * 900) };

    const pos = autoLayout(g);
    const at = (id: string) => pos.get(id)!;
    // Sequence 0 → 1 is vertical, one pitch apart.
    expect(at(s1).x).toBe(at(s0).x);
    expect(at(s1).y - at(s0).y).toBe(PITCH);
    // Branches straddle the divergence step, the merge step is back under it and below both.
    // (branch order follows the current left-to-right order, scrambled here)
    const sides = [at(b1.transitionId).x - at(s1).x, at(alt.transitionId).x - at(s1).x].sort(
      (a, b) => a - b,
    );
    expect(sides[0]).toBeLessThan(0);
    expect(sides[1]).toBeGreaterThan(0);
    expect(at(s4).x).toBe(at(s1).x);
    expect(at(s4).y).toBeGreaterThan(at(b1.stepId).y);
    // No two steps overlap.
    const seen = new Set<string>();
    for (const id of Object.keys(g.steps)) {
      const key = `${at(id).x},${at(id).y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    // Every transition sits ROW below its upstream step(s) at least.
    for (const t of Object.values(g.transitions)) {
      for (const f of t.from) expect(at(t.id).y - at(f).y).toBeGreaterThanOrEqual(ROW);
    }
    expect(connect(g, s4, s0)).toBe(false);
  });
});
