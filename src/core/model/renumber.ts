import { cachedForcing } from '../expr/cache';
import { envFactory } from '../expr/check';
import { tokenize } from '../expr/lexer';
import { STEP_REF_RE } from '../expr/parser';
import { indexGrafcet } from './graph';
import type { Grafcet, Id, Project } from './types';
import { grafcetExpressions } from './variables';

/** Renumbering order: depth-first from the initial steps, following transitions left to right. */
export function stepOrder(g: Grafcet): Id[] {
  const index = indexGrafcet(g);
  const pos = (id: Id) => g.steps[id]!.position;
  const topFirst = (a: Id, b: Id) => pos(a).y - pos(b).y || pos(a).x - pos(b).x;
  const steps = Object.keys(g.steps);
  const starts = [
    ...steps
      .filter((id) => g.steps[id]!.kind === 'initial')
      .sort((a, b) => pos(a).x - pos(b).x || pos(a).y - pos(b).y),
    ...[...steps].sort(topFirst),
  ];
  const order: Id[] = [];
  const seen = new Set<Id>();
  for (const s of starts) {
    const stack = [s];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      order.push(id);
      const next = (index.outgoing.get(id) ?? []).flatMap((t) =>
        [...t.to].sort((a, b) => pos(a).x - pos(b).x),
      );
      for (let i = next.length - 1; i >= 0; i--) if (!seen.has(next[i]!)) stack.push(next[i]!);
    }
  }
  return order;
}

export type RenumberPlan =
  | { ok: true; apply: (draft: Project) => void; changed: number }
  | { ok: false; conflicts: number[] };

interface Rewrite {
  grafcetId: Id;
  ownerId: Id;
  field: 'receptivity' | 'text' | 'condition';
  source: string;
}

/**
 * Plans renumbering the steps of one grafcet consecutively from `start` (default: its lowest
 * number), rewriting every `Xn` that refers to them (in any grafcet) and forcing orders that
 * target it. Refuses when a rewritten reference would resolve to a different step.
 */
export function planRenumber(p: Project, gid: Id, start?: number): RenumberPlan {
  const g = p.grafcets[gid];
  if (!g) return { ok: false, conflicts: [] };
  const order = stepOrder(g);
  const base = start ?? (order.length ? Math.min(...order.map((id) => g.steps[id]!.number)) : 0);
  const numberOf = new Map(order.map((id, i) => [id, base + i]));

  const expected: { grafcetId: Id; number: number; stepId: Id }[] = [];
  const rewrites: Rewrite[] = [];
  const envOf = envFactory(p);
  for (const h of Object.values(p.grafcets)) {
    const env = envOf(h.id);
    for (const e of grafcetExpressions(h)) {
      let out = e.source;
      if (e.kind === 'forcing') {
        const f = cachedForcing(e.source);
        if (!f.ok || f.value.grafcet.toLowerCase() !== g.name.toLowerCase()) continue;
        for (const s of [...f.value.steps].reverse()) {
          const target = order.find((id) => g.steps[id]!.number === s.number);
          if (target === undefined) continue;
          const text = e.source.slice(s.start, s.end);
          const prefix = STEP_REF_RE.test(text) ? text[0] : '';
          out = out.slice(0, s.start) + prefix + String(numberOf.get(target)) + out.slice(s.end);
        }
      } else {
        let tokens;
        try {
          tokens = tokenize(e.source);
        } catch {
          continue;
        }
        for (let i = tokens.length - 1; i >= 0; i--) {
          const t = tokens[i]!;
          const m = t.kind === 'ident' ? STEP_REF_RE.exec(t.text) : null;
          if (!m) continue;
          const r = env.resolveStep(Number(m[1]));
          if (typeof r !== 'object' || r.grafcetId !== gid) continue;
          const n = numberOf.get(r.stepId)!;
          expected.push({ grafcetId: h.id, number: n, stepId: r.stepId });
          out = out.slice(0, t.start) + t.text[0] + String(n) + out.slice(t.end);
        }
      }
      if (out !== e.source)
        rewrites.push({ grafcetId: h.id, ownerId: e.ownerId, field: e.field, source: out });
    }
  }

  // Check every rewritten reference still designates the same step after renumbering.
  const renumbered: Grafcet = {
    ...g,
    steps: Object.fromEntries(
      Object.entries(g.steps).map(([id, s]) => [id, { ...s, number: numberOf.get(id)! }]),
    ),
  };
  const after = { ...p, grafcets: { ...p.grafcets, [gid]: renumbered } };
  const conflicts = new Set<number>();
  const envAfter = envFactory(after);
  for (const x of expected) {
    const r = envAfter(x.grafcetId).resolveStep(x.number);
    if (typeof r !== 'object' || r.stepId !== x.stepId) conflicts.add(x.number);
  }
  if (conflicts.size) return { ok: false, conflicts: [...conflicts].sort((a, b) => a - b) };

  const changed = order.filter((id) => g.steps[id]!.number !== numberOf.get(id)).length;
  return {
    ok: true,
    changed,
    apply: (draft) => {
      const dg = draft.grafcets[gid];
      if (!dg) return;
      for (const [id, n] of numberOf) {
        const s = dg.steps[id];
        if (s) s.number = n;
      }
      for (const w of rewrites) {
        const h = draft.grafcets[w.grafcetId];
        if (!h) continue;
        if (w.field === 'receptivity') {
          const t = h.transitions[w.ownerId];
          if (t) t.receptivity = w.source;
        } else {
          const a = h.actions[w.ownerId];
          if (a && w.field === 'text') a.text = w.source;
          if (a && w.field === 'condition') a.condition = w.source;
        }
      }
    },
  };
}
