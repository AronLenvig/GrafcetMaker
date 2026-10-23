import { cachedForcing } from '../expr/cache';
import type { Id, Project } from './types';

export interface EmptyForcing {
  /** Grafcet holding the forcing order, and the order (action). */
  grafcetId: Id;
  actionId: Id;
  /** The forced grafcet. */
  target: Id;
}

/**
 * Forcing orders `G{}` (IEC 60848: the empty situation, every step of G inactive) after which no
 * step of G can become active again: no other order activates steps of G (`G{INIT}`, `G{8}`), G
 * has no source transition, and G is a partial grafcet (an enclosed grafcet restarts with its
 * enclosing step, an expansion with its macro-step). `G{INIT}` (the initial steps) was probably
 * meant. Emptying a grafcet that another order restarts (emergency stop, then `G{INIT}`) is fine.
 */
export function emptyForcingsNeverUndone(p: Project): EmptyForcing[] {
  const byName = new Map(Object.values(p.grafcets).map((g) => [g.name.toLowerCase(), g.id]));
  const empties: EmptyForcing[] = [];
  const restarted = new Set<Id>();
  for (const g of Object.values(p.grafcets)) {
    for (const a of Object.values(g.actions)) {
      if (a.kind !== 'forcing') continue;
      const f = cachedForcing(a.text);
      const target = f.ok ? byName.get(f.value.grafcet.toLowerCase()) : undefined;
      if (!f.ok || !target) continue;
      if (f.value.mode === 'init' || f.value.steps.length) restarted.add(target);
      else if (f.value.mode === 'steps') empties.push({ grafcetId: g.id, actionId: a.id, target });
    }
  }
  return empties.filter((e) => {
    const t = p.grafcets[e.target]!;
    return (
      t.kind === 'partial' &&
      !restarted.has(t.id) &&
      !Object.values(t.transitions).some((tr) => tr.from.length === 0)
    );
  });
}
