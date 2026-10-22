/**
 * Hierarchy: macro-steps with their expansion grafcet, enclosing steps with their enclosed
 * grafcet, and the relations between grafcets. Mutating functions run inside undoable recipes.
 */
import { PITCH, ROW } from '../layout/geometry';
import { createGrafcet, createStep, newId } from './factory';
import { indexGrafcet } from './graph';
import type { Grafcet, GrafcetKind, Id, Project, Step } from './types';

/** First step number for a new grafcet: next multiple of 10 above every number in the project. */
export function nextBaseNumber(p: Project): number {
  let max = -1;
  for (const g of Object.values(p.grafcets))
    for (const s of Object.values(g.steps)) max = Math.max(max, s.number);
  return (Math.floor(max / 10) + 1) * 10;
}

/** `name` if free, else `name_2`, `name_3`… (grafcet names are case-insensitive). */
export function freeGrafcetName(p: Project, name: string): string {
  const used = new Set(Object.values(p.grafcets).map((g) => g.name.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) if (!used.has(`${name}_${i}`.toLowerCase())) return `${name}_${i}`;
}

/** The step (and its grafcet) that refers to a grafcet as expansion or enclosed grafcet. */
export function parentOf(p: Project, gid: Id): { grafcet: Grafcet; step: Step } | null {
  for (const g of Object.values(p.grafcets)) {
    for (const s of Object.values(g.steps))
      if (s.refGrafcetId === gid) return { grafcet: g, step: s };
  }
  return null;
}

/** Entry (no upstream transition) and exit (no downstream transition) steps of an expansion. */
export function entryExit(g: Grafcet): { entries: Step[]; exits: Step[] } {
  const index = indexGrafcet(g);
  const steps = Object.values(g.steps);
  return {
    entries: steps.filter((s) => !index.incoming.has(s.id)),
    exits: steps.filter((s) => !index.outgoing.has(s.id)),
  };
}

function insertGrafcetAfter(p: Project, after: Id, g: Grafcet): void {
  p.grafcets[g.id] = g;
  const i = p.grafcetOrder.indexOf(after);
  p.grafcetOrder.splice(i < 0 ? p.grafcetOrder.length : i + 1, 0, g.id);
}

export type HierarchyKind = 'macro' | 'enclosing';

/**
 * Turns a step into a macro-step (with a new expansion E → S) or an enclosing step (with a new
 * enclosed grafcet holding one step active when the enclosing step is). Returns the new grafcet
 * id, or null when the step cannot be converted (initial steps keep their role).
 */
export function convertStep(p: Project, gid: Id, stepId: Id, kind: HierarchyKind): Id | null {
  const g = p.grafcets[gid];
  const s = g?.steps[stepId];
  if (!g || !s || s.kind === 'initial') return null;
  if (s.kind === kind && s.refGrafcetId && p.grafcets[s.refGrafcetId]) return s.refGrafcetId;
  const base = nextBaseNumber(p);
  const child: Grafcet =
    kind === 'macro'
      ? createGrafcet(freeGrafcetName(p, `M${s.number}`), 'macroExpansion')
      : createGrafcet(freeGrafcetName(p, `X${s.number}_enc`), 'enclosed');
  if (kind === 'macro') {
    const e = createStep(base, { x: 200, y: 100 });
    e.label = `E${s.number}`;
    const x = createStep(base + 1, { x: 200, y: 100 + PITCH });
    x.label = `S${s.number}`;
    child.steps[e.id] = e;
    child.steps[x.id] = x;
    const t = {
      id: newId(),
      from: [e.id],
      to: [x.id],
      receptivity: '',
      position: { x: 200, y: 100 + ROW },
    };
    child.transitions[t.id] = t;
  } else {
    const first = createStep(base, { x: 200, y: 100 }, 'initial');
    child.steps[first.id] = first;
  }
  insertGrafcetAfter(p, gid, child);
  s.kind = kind;
  s.refGrafcetId = child.id;
  return child.id;
}

/** Back to a normal step; the former sub-grafcet is kept (validation reports it as unused). */
export function revertToNormal(p: Project, gid: Id, stepId: Id): void {
  const s = p.grafcets[gid]?.steps[stepId];
  if (!s || (s.kind !== 'macro' && s.kind !== 'enclosing')) return;
  s.kind = 'normal';
  delete s.refGrafcetId;
}

/** Which kind of sub-grafcet a step kind refers to. */
export function expectedChildKind(kind: Step['kind']): GrafcetKind | null {
  return kind === 'macro' ? 'macroExpansion' : kind === 'enclosing' ? 'enclosed' : null;
}
