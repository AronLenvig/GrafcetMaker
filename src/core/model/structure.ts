/**
 * Structure operations: parallel (AND) and alternative (OR) branches, loops, source and sink
 * transitions. Like ops.ts they mutate a Grafcet draft inside an undoable recipe.
 */
import { PITCH, ROW, STEP_HALF } from '../layout/geometry';
import { indexGrafcet } from './graph';
import { addStep, addTransition, preferredStepNumber } from './ops';
import type { Grafcet, Id } from './types';

/** Horizontal distance between a new branch and its rightmost sibling. */
export const BRANCH_DX = 160;

const maxX = (xs: number[], fallback: number) => (xs.length ? Math.max(...xs) : fallback);

/** First x (stepping right from `x`) where nothing occupies the rows `ys`, so new branches never overlap. */
function freeX(g: Grafcet, x: number, ys: number[]): number {
  const occupied = (cx: number) =>
    [...Object.values(g.steps), ...Object.values(g.transitions)].some(
      (e) =>
        Math.abs(e.position.x - cx) < BRANCH_DX / 2 &&
        ys.some((y) => Math.abs(e.position.y - y) < ROW / 2),
    );
  let cx = x;
  for (let i = 0; i < 100 && occupied(cx); i++) cx += BRANCH_DX / 2;
  return cx;
}

/**
 * `P` on a step: a step in parallel with it — added to its upstream transition (AND divergence)
 * and to its downstream transition (AND convergence) when those are single.
 * `P` on a transition: one more downstream step (AND divergence).
 */
export function addParallelBranch(g: Grafcet, id: Id): Id | null {
  const index = indexGrafcet(g);
  const s = g.steps[id];
  if (s) {
    const ins = index.incoming.get(id) ?? [];
    const outs = index.outgoing.get(id) ?? [];
    const tin = ins.length === 1 ? ins[0]! : null;
    const tout = outs.length === 1 ? outs[0]! : null;
    const siblings = tin
      ? tin.to.map((sid) => g.steps[sid]?.position.x ?? s.position.x)
      : [s.position.x];
    const x = freeX(g, maxX(siblings, s.position.x) + BRANCH_DX, [s.position.y]);
    const ns = addStep(g, { x, y: s.position.y }, 'normal', preferredStepNumber(g, s.number));
    if (tin) tin.to.push(ns.id);
    if (tout) tout.from.push(ns.id);
    return ns.id;
  }
  const t = g.transitions[id];
  if (t) {
    const xs = t.to.map((sid) => g.steps[sid]?.position.x ?? t.position.x);
    const y = t.to.length
      ? (g.steps[t.to[0]!]?.position.y ?? t.position.y + ROW)
      : t.position.y + ROW;
    const prev = Math.max(-1, ...t.from.map((sid) => g.steps[sid]?.number ?? -1));
    const x = t.to.length ? freeX(g, maxX(xs, t.position.x) + BRANCH_DX, [y]) : t.position.x;
    const ns = addStep(g, { x, y }, 'normal', preferredStepNumber(g, prev));
    t.to.push(ns.id);
    return ns.id;
  }
  return null;
}

/**
 * `O` on a step: another outgoing transition with a new step below it (OR divergence).
 * `O` on a transition: an alternative transition between the same steps (OR divergence + OR
 * convergence), e.g. a bypass condition.
 */
export function addAlternativeBranch(g: Grafcet, id: Id): { transitionId: Id; stepId?: Id } | null {
  const index = indexGrafcet(g);
  const s = g.steps[id];
  if (s) {
    const outs = index.outgoing.get(id) ?? [];
    const rows = [s.position.y + ROW, s.position.y + PITCH];
    const x = outs.length
      ? freeX(
          g,
          maxX(
            outs.map((t) => t.position.x),
            s.position.x,
          ) + BRANCH_DX,
          rows,
        )
      : s.position.x;
    const ns = addStep(
      g,
      { x, y: s.position.y + PITCH },
      'normal',
      preferredStepNumber(g, s.number),
    );
    const t = addTransition(g, { x, y: s.position.y + ROW }, [id], [ns.id]);
    return { transitionId: t.id, stepId: ns.id };
  }
  const t = g.transitions[id];
  if (t) {
    const siblings = [
      ...new Set(t.from.flatMap((sid) => (index.outgoing.get(sid) ?? []).map((o) => o.position.x))),
    ];
    const x = freeX(g, maxX(siblings, t.position.x) + BRANCH_DX, [t.position.y]);
    const alt = addTransition(g, { x, y: t.position.y }, [...t.from], [...t.to]);
    return { transitionId: alt.id };
  }
  return null;
}

/**
 * `L` + click: loop back to `target`. From a step, a new transition (beside any existing ones, so
 * it forms an OR divergence) leads to the target; from a transition without a downstream step,
 * that transition leads to the target. Returns the loop transition, or null if not applicable.
 */
export function addLoop(g: Grafcet, fromId: Id, target: Id): Id | null {
  if (!g.steps[target]) return null;
  const s = g.steps[fromId];
  if (s) {
    const outs = indexGrafcet(g).outgoing.get(fromId) ?? [];
    const x = outs.length
      ? maxX(
          outs.map((t) => t.position.x),
          s.position.x,
        ) + BRANCH_DX
      : s.position.x;
    return addTransition(g, { x, y: s.position.y + ROW }, [fromId], [target]).id;
  }
  const t = g.transitions[fromId];
  if (t && t.to.length === 0) {
    t.to.push(target);
    return t.id;
  }
  return null;
}

/** A source transition (no upstream step) feeding the step from above. */
export function addSourceTransition(g: Grafcet, stepId: Id): Id | null {
  const s = g.steps[stepId];
  if (!s) return null;
  const ins = indexGrafcet(g).incoming.get(stepId) ?? [];
  const x = ins.length
    ? maxX(
        ins.map((t) => t.position.x),
        s.position.x,
      ) + BRANCH_DX
    : s.position.x;
  return addTransition(g, { x, y: s.position.y - STEP_HALF - 40 }, [], [stepId]).id;
}

/** A sink transition (no downstream step) leaving the step. */
export function addSinkTransition(g: Grafcet, stepId: Id): Id | null {
  const s = g.steps[stepId];
  if (!s) return null;
  const outs = indexGrafcet(g).outgoing.get(stepId) ?? [];
  const x = outs.length
    ? maxX(
        outs.map((t) => t.position.x),
        s.position.x,
      ) + BRANCH_DX
    : s.position.x;
  return addTransition(g, { x, y: s.position.y + ROW }, [stepId], []).id;
}
