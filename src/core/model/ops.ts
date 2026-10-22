/**
 * Editing operations. Each mutates a Grafcet in place and is meant to run inside an Immer recipe
 * (`execute(label, p => op(p.grafcets[id], ...))`), which turns the mutation into undoable patches.
 */
import { PITCH, ROW } from '../layout/geometry';
import { createStep, newId } from './factory';
import { indexGrafcet } from './graph';
import type { Action, ActionKind, Comment, Grafcet, Id, Point, Step, Transition } from './types';

export function nextStepNumber(g: Grafcet): number {
  let max = -1;
  for (const s of Object.values(g.steps)) max = Math.max(max, s.number);
  return max + 1;
}

/** `after + 1` when free (keeps sequences numbered in order), otherwise the next unused number. */
export function preferredStepNumber(g: Grafcet, after: number): number {
  const used = new Set(Object.values(g.steps).map((s) => s.number));
  return used.has(after + 1) ? nextStepNumber(g) : after + 1;
}

export function addStep(
  g: Grafcet,
  position: Point,
  kind: Step['kind'] = 'normal',
  number = nextStepNumber(g),
): Step {
  const s = createStep(number, position, kind);
  g.steps[s.id] = s;
  return s;
}

export function addTransition(
  g: Grafcet,
  position: Point,
  from: Id[] = [],
  to: Id[] = [],
  receptivity = '',
): Transition {
  const t: Transition = { id: newId(), from, to, receptivity, position: { ...position } };
  g.transitions[t.id] = t;
  return t;
}

export function addComment(g: Grafcet, position: Point, text: string): Comment {
  const c: Comment = { id: newId(), text, position: { ...position } };
  g.comments[c.id] = c;
  return c;
}

export function addAction(
  g: Grafcet,
  stepId: Id,
  kind: ActionKind = 'continuous',
  text = '',
): Action {
  let order = 0;
  for (const a of Object.values(g.actions))
    if (a.stepId === stepId) order = Math.max(order, a.order + 1);
  const a: Action = { id: newId(), stepId, order, kind, text };
  g.actions[a.id] = a;
  return a;
}

/** Moves every step, transition and comment strictly below `y` by `dy`. */
export function shiftBelow(g: Grafcet, y: number, dy: number): void {
  for (const s of Object.values(g.steps)) if (s.position.y > y) s.position.y += dy;
  for (const t of Object.values(g.transitions)) if (t.position.y > y) t.position.y += dy;
  for (const c of Object.values(g.comments)) if (c.position.y > y) c.position.y += dy;
}

export function moveElements(g: Grafcet, ids: Iterable<Id>, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  for (const id of ids) {
    const el = g.steps[id] ?? g.transitions[id] ?? g.comments[id];
    if (!el) continue;
    el.position.x += dx;
    el.position.y += dy;
    const t = g.transitions[id];
    if (t?.routing?.sideX !== undefined) t.routing.sideX += dx;
  }
}

/**
 * `Enter` on a step: add a transition and a step below it. If the step already continues, the new
 * pair is inserted (the rest of the diagram moves down one pitch).
 */
export function appendAfterStep(g: Grafcet, stepId: Id): { transitionId: Id; stepId: Id } | null {
  const s = g.steps[stepId];
  if (!s) return null;
  const outs = indexGrafcet(g).outgoing.get(stepId) ?? [];
  const { x, y } = s.position;
  if (outs.length > 0) shiftBelow(g, y, PITCH);
  const ns = addStep(g, { x, y: y + PITCH }, 'normal', preferredStepNumber(g, s.number));
  for (const o of outs) o.from = o.from.map((id) => (id === stepId ? ns.id : id));
  const t = addTransition(g, { x, y: y + ROW }, [stepId], [ns.id]);
  return { transitionId: t.id, stepId: ns.id };
}

/**
 * `Enter` on a transition: add the step it leads to, or, if it already leads somewhere, insert a
 * step + transition after it.
 */
export function appendAfterTransition(
  g: Grafcet,
  transitionId: Id,
): { stepId: Id; transitionId?: Id } | null {
  const t = g.transitions[transitionId];
  if (!t) return null;
  const { x, y } = t.position;
  const prev = Math.max(-1, ...t.from.map((id) => g.steps[id]?.number ?? -1));
  if (t.to.length === 0) {
    const ns = addStep(g, { x, y: y + ROW }, 'normal', preferredStepNumber(g, prev));
    t.to = [ns.id];
    return { stepId: ns.id };
  }
  shiftBelow(g, y, PITCH);
  const ns = addStep(g, { x, y: y + ROW }, 'normal', preferredStepNumber(g, prev));
  const t2 = addTransition(g, { x, y: y + PITCH }, [ns.id], t.to);
  t.to = [ns.id];
  return { stepId: ns.id, transitionId: t2.id };
}

export type LinkEnd = { kind: 'step' | 'transition'; id: Id };

/** Links step → transition or transition → step. Any other pair is unrepresentable: returns false. */
export function connect(g: Grafcet, fromId: Id, toId: Id): boolean {
  const toT = g.transitions[toId];
  if (g.steps[fromId] && toT) {
    if (!toT.from.includes(fromId)) toT.from.push(fromId);
    return true;
  }
  const fromT = g.transitions[fromId];
  if (fromT && g.steps[toId]) {
    if (!fromT.to.includes(toId)) fromT.to.push(toId);
    return true;
  }
  return false;
}

export function canConnect(g: Grafcet, fromId: Id, toId: Id): boolean {
  return (
    (!!g.steps[fromId] && !!g.transitions[toId]) || (!!g.transitions[fromId] && !!g.steps[toId])
  );
}

/** Removes the link between a transition and a step ('in' = upstream side of the transition). */
export function disconnect(g: Grafcet, transitionId: Id, side: 'in' | 'out', stepId: Id): void {
  const t = g.transitions[transitionId];
  if (!t) return;
  if (side === 'in') t.from = t.from.filter((id) => id !== stepId);
  else t.to = t.to.filter((id) => id !== stepId);
}

function removeStep(g: Grafcet, id: Id): void {
  delete g.steps[id];
  for (const a of Object.values(g.actions)) if (a.stepId === id) delete g.actions[a.id];
  for (const t of Object.values(g.transitions)) {
    if (t.from.includes(id)) t.from = t.from.filter((s) => s !== id);
    if (t.to.includes(id)) t.to = t.to.filter((s) => s !== id);
  }
}

/** Steps and transitions forward-reachable from the given steps. */
function forwardReachable(g: Grafcet, starts: Id[]): Set<Id> {
  const index = indexGrafcet(g);
  const seen = new Set<Id>();
  const queue = [...starts];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const t of index.outgoing.get(id) ?? []) {
      seen.add(t.id);
      for (const n of t.to) if (!seen.has(n)) queue.push(n);
    }
  }
  return seen;
}

/**
 * Heals the sequence around a step about to be deleted so no transition is left dangling:
 * - middle of a sequence (…T1 → S → T2 → …): S and T2 go, T1 takes over T2's successors, and if
 *   everything below is downstream the gap is closed;
 * - first step of a sequence: its outgoing transition goes too;
 * - last step of a sequence: the transition leading to it goes too.
 */
function healStep(g: Grafcet, s: Step, del: Set<Id>): void {
  const sy = s.position.y;
  const index = indexGrafcet(g);
  const ins = index.incoming.get(s.id) ?? [];
  const outs = index.outgoing.get(s.id) ?? [];
  const tin = ins[0];
  const tout = outs[0];

  if (ins.length === 1 && outs.length === 1 && tin && tout && tin.id !== tout.id) {
    if (tin.to.length === 1 && tout.from.length === 1 && !del.has(tin.id)) {
      const successors = tout.to.filter((id) => id !== s.id);
      const next = successors.length ? g.steps[successors[0]!] : undefined;
      const aligned = tin.position.x === s.position.x && tout.position.x === s.position.x;
      const below = (y: number) => y > sy;
      let closeGap = 0;
      if (aligned && next && next.position.y > sy) {
        const downstream = forwardReachable(g, successors);
        const everythingBelowIsDownstream = [
          ...Object.values(g.steps),
          ...Object.values(g.transitions),
        ].every(
          (el) =>
            !below(el.position.y) || el.id === tout.id || del.has(el.id) || downstream.has(el.id),
        );
        if (everythingBelowIsDownstream) closeGap = next.position.y - sy;
      }
      tin.to = successors;
      delete g.transitions[tout.id];
      del.delete(tout.id);
      removeStep(g, s.id);
      if (closeGap) shiftBelow(g, sy, -closeGap);
      return;
    }
  }
  if (ins.length === 0 && outs.length === 1 && tout && tout.from.length === 1) {
    delete g.transitions[tout.id];
    del.delete(tout.id);
  } else if (outs.length === 0 && ins.length === 1 && tin && tin.to.length === 1) {
    delete g.transitions[tin.id];
    del.delete(tin.id);
  }
  removeStep(g, s.id);
}

/** Deletes elements. With `heal`, deleted steps are spliced out of their sequence (see healStep). */
export function deleteElements(g: Grafcet, ids: Iterable<Id>, heal = true): void {
  const del = new Set<Id>();
  for (const id of ids)
    if (g.steps[id] || g.transitions[id] || g.actions[id] || g.comments[id]) del.add(id);

  const steps = [...del]
    .map((id) => g.steps[id])
    .filter((s): s is Step => !!s)
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  for (const s of steps) {
    del.delete(s.id);
    if (heal) healStep(g, s, del);
    else removeStep(g, s.id);
  }
  for (const id of del) {
    if (g.transitions[id]) delete g.transitions[id];
    else if (g.actions[id]) delete g.actions[id];
    else if (g.comments[id]) delete g.comments[id];
  }
}
