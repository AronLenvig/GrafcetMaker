import { describe, expect, it } from 'vitest';
import { buildProject, type SpecGrafcet } from '@/core/io/buildProject';
import { pageLayout, READABLE_PERCENT, UNIT_MM, type PageOptions } from '@/core/io/pdfLayout';
import { grafcetToSvg } from '@/core/io/svgExport';

/** A sequence of `n` steps, each with an action, looping back to step 0. */
function sequence(n: number, branches = 1) {
  const g: SpecGrafcet = { name: 'G1', steps: [], transitions: [] };
  for (let b = 0; b < branches; b++)
    for (let i = 0; i < n; i++) {
      const num = b * 100 + i;
      g.steps.push({
        n: num,
        kind: num === 0 ? 'initial' : 'normal',
        col: b,
        actions: [['continuous', `Out${num}`]],
      });
      if (i > 0) g.transitions.push([[num - 1], `a${num}`, [num]]);
    }
  if (branches > 1) {
    // An AND divergence after step 0 into every branch makes the diagram wide.
    g.transitions = g.transitions.filter((t) => t[0][0] !== 0);
    g.transitions.push([[0], 'go', Array.from({ length: branches }, (_, b) => b * 100 + 1)]);
  }
  const p = buildProject({ name: 'Test', variables: [], grafcets: [g] });
  return grafcetToSvg(p.grafcets[p.grafcetOrder[0]!]!);
}

const A4: PageOptions = {
  paper: 'A4',
  orientation: 'portrait',
  scale: 'readable',
  titleBlock: true,
};

describe('PDF pages', () => {
  it('prints a short grafcet on one page', () => {
    const d = sequence(4);
    const l = pageLayout(d.box, A4, d.parts);
    expect([l.columns.length, l.rows.length]).toEqual([1, 1]);
  });

  it('keeps a long sequence readable over several pages, cut between elements', () => {
    const d = sequence(40);
    // Fitted to one A4 page, its text would be far too small.
    expect(pageLayout(d.box, { ...A4, scale: 'fit' }).scale).toBeLessThan(
      (UNIT_MM * READABLE_PERCENT) / 200,
    );
    const l = pageLayout(d.box, A4, d.parts);
    expect(l.scale).toBeGreaterThanOrEqual((UNIT_MM * READABLE_PERCENT) / 100 - 1e-9);
    expect(l.columns).toHaveLength(1);
    expect(l.rows.length).toBeGreaterThan(1);
    // The rows cover the diagram without gaps or overlaps…
    expect(l.rows[0]!.start).toBeCloseTo(d.box.y);
    for (let i = 1; i < l.rows.length; i++)
      expect(l.rows[i]!.start).toBeCloseTo(l.rows[i - 1]!.start + l.rows[i - 1]!.size);
    // …each fits on the page, and no cut goes through a step, transition, text or action.
    for (const r of l.rows) expect(r.size * l.scale).toBeLessThanOrEqual(l.area.height + 1e-6);
    for (const r of l.rows.slice(1))
      for (const p of d.parts)
        expect(p.y < r.start && r.start < p.y + p.height, `cut at ${r.start}`).toBe(false);
  });

  it('turns a wide grafcet to landscape when the orientation is automatic', () => {
    const d = sequence(3, 6);
    expect(d.box.width).toBeGreaterThan(d.box.height);
    expect(pageLayout(d.box, { ...A4, orientation: 'auto' }, d.parts).orientation).toBe(
      'landscape',
    );
    expect(pageLayout(sequence(30).box, { ...A4, orientation: 'auto' }).orientation).toBe(
      'portrait',
    );
  });

  it('still fits to one page, or tiles at a fixed scale, when asked', () => {
    const d = sequence(40);
    const fit = pageLayout(d.box, { ...A4, scale: 'fit' }, d.parts);
    expect([fit.columns.length, fit.rows.length]).toEqual([1, 1]);
    const fixed = pageLayout(d.box, { ...A4, scale: 100 }, d.parts);
    expect(fixed.scale).toBeCloseTo(UNIT_MM);
    expect(fixed.rows.length).toBeGreaterThan(1);
  });
});
