import type { Action, Grafcet, Id, Transition } from './types';

/** Adjacency derived from transition from/to lists (divergences/convergences are never stored). */
export interface GrafcetIndex {
  /** step → transitions it feeds (2+ = OR divergence), sorted left to right. */
  outgoing: Map<Id, Transition[]>;
  /** step → transitions feeding it (2+ = OR convergence), sorted left to right. */
  incoming: Map<Id, Transition[]>;
  /** step → its actions in display order. */
  actions: Map<Id, Action[]>;
}

const byX = (a: Transition, b: Transition) =>
  a.position.x - b.position.x || a.position.y - b.position.y || (a.id < b.id ? -1 : 1);

export function indexGrafcet(g: Grafcet): GrafcetIndex {
  const outgoing = new Map<Id, Transition[]>();
  const incoming = new Map<Id, Transition[]>();
  const actions = new Map<Id, Action[]>();
  const push = <T>(m: Map<Id, T[]>, k: Id, v: T) => {
    const list = m.get(k);
    if (list) list.push(v);
    else m.set(k, [v]);
  };
  for (const t of Object.values(g.transitions)) {
    for (const s of t.from) push(outgoing, s, t);
    for (const s of t.to) push(incoming, s, t);
  }
  for (const a of Object.values(g.actions)) push(actions, a.stepId, a);
  for (const list of outgoing.values()) list.sort(byX);
  for (const list of incoming.values()) list.sort(byX);
  for (const list of actions.values())
    list.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
  return { outgoing, incoming, actions };
}

/** Kind of element an id refers to within a grafcet, or null. */
export function elementKind(
  g: Grafcet,
  id: Id,
): 'step' | 'transition' | 'action' | 'comment' | null {
  if (g.steps[id]) return 'step';
  if (g.transitions[id]) return 'transition';
  if (g.actions[id]) return 'action';
  if (g.comments[id]) return 'comment';
  return null;
}

/** Forward successors of a step (via its outgoing transitions). */
export function successorSteps(g: Grafcet, index: GrafcetIndex, stepId: Id): Id[] {
  const out: Id[] = [];
  for (const t of index.outgoing.get(stepId) ?? []) out.push(...t.to);
  return out.filter((id) => g.steps[id]);
}
