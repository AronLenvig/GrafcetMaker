/**
 * Editing operations. Each mutates a Grafcet in place and is meant to run inside an Immer recipe
 * (`execute(label, p => op(p.grafcets[id], ...))`), which turns the mutation into undoable patches.
 */
import { nextStepPosition, PITCH, ROW } from '../layout/geometry';
import { createStep, newId } from './factory';
import { indexGrafcet } from './graph';
import type {
  Project,
  Action,
  ActionKind,
  Comment,
  Grafcet,
  Id,
  Point,
  Step,
  Transition,
} from './types';

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

const nextOrder = (g: Grafcet, stepId: Id) =>
  Object.values(g.actions).reduce(
    (n, a) => (a.stepId === stepId ? Math.max(n, a.order + 1) : n),
    0,
  );

export function addAction(
  g: Grafcet,
  stepId: Id,
  kind: ActionKind = 'continuous',
  text = '',
): Action {
  const a: Action = { id: newId(), stepId, order: nextOrder(g, stepId), kind, text };
  g.actions[a.id] = a;
  return a;
}

/** An action not attached to any step (a draft: it never executes), with its box's top-left at `position`. */
export function addFreeAction(
  g: Grafcet,
  position: Point,
  kind: ActionKind = 'continuous',
  text = '',
): Action {
  const a: Action = { id: newId(), stepId: null, position: { ...position }, order: 0, kind, text };
  g.actions[a.id] = a;
  return a;
}

/**
 * Attaches an action to a step, after the step's other actions, or at `index` among them (the
 * step's actions are then renumbered from 0).
 */
export function attachAction(g: Grafcet, actionId: Id, stepId: Id, index?: number): void {
  const a = g.actions[actionId];
  if (!a || !g.steps[stepId]) return;
  if (index === undefined) {
    if (a.stepId === stepId) return;
    a.order = nextOrder(g, stepId);
  } else {
    const list = Object.values(g.actions)
      .filter((x) => x.stepId === stepId && x.id !== actionId)
      .sort((x, y) => x.order - y.order);
    list.splice(Math.max(0, Math.min(index, list.length)), 0, a);
    list.forEach((x, k) => (x.order = k));
  }
  a.stepId = stepId;
  delete a.position;
}

/** Detaches an action from its step; it stays where it is drawn (`position`). */
export function detachAction(g: Grafcet, actionId: Id, position: Point): void {
  const a = g.actions[actionId];
  if (!a || a.stepId === null) return;
  a.stepId = null;
  a.order = 0;
  a.position = { ...position };
}

/** Moves every step, transition and comment strictly below `y` by `dy`. */
export function shiftBelow(g: Grafcet, y: number, dy: number): void {
  for (const s of Object.values(g.steps)) if (s.position.y > y) s.position.y += dy;
  for (const t of Object.values(g.transitions)) if (t.position.y > y) t.position.y += dy;
  for (const c of Object.values(g.comments)) if (c.position.y > y) c.position.y += dy;
  for (const a of Object.values(g.actions)) if (a.position && a.position.y > y) a.position.y += dy;
}

export function moveElements(g: Grafcet, ids: Iterable<Id>, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  for (const id of ids) {
    const free = g.actions[id]?.stepId === null ? g.actions[id] : undefined;
    const el = g.steps[id] ?? g.transitions[id] ?? g.comments[id] ?? free;
    if (!el?.position) continue;
    el.position.x += dx;
    el.position.y += dy;
    const t = g.transitions[id];
    if (t?.routing?.sideX !== undefined) t.routing.sideX += dx;
    if (t?.routing?.dropY !== undefined) t.routing.dropY += dy;
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

/** A transition below a step that ends its sequence, leading nowhere yet (its step comes later). */
export function appendTransitionAfterStep(g: Grafcet, stepId: Id): Transition | null {
  const s = g.steps[stepId];
  if (!s || indexGrafcet(g).outgoing.has(stepId)) return null;
  return addTransition(g, { x: s.position.x, y: s.position.y + ROW }, [stepId]);
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
  // Below the transition, or below the left end of one flowing right to left.
  const at = nextStepPosition(t);
  const prev = Math.max(-1, ...t.from.map((id) => g.steps[id]?.number ?? -1));
  if (t.to.length === 0) {
    const ns = addStep(g, at, 'normal', preferredStepNumber(g, prev));
    t.to = [ns.id];
    delete t.jump;
    return { stepId: ns.id };
  }
  shiftBelow(g, t.position.y, PITCH);
  const ns = addStep(g, at, 'normal', preferredStepNumber(g, prev));
  const t2 = addTransition(g, { x: at.x, y: at.y + ROW }, [ns.id], t.to);
  // The new transition takes over where this one led, drawn the same way (a jump stays a jump).
  if (t.jump) t2.jump = true;
  t.to = [ns.id];
  delete t.jump;
  return { stepId: ns.id, transitionId: t2.id };
}

/** Transitions that can flow right to left: at most one upstream and one downstream step. */
export const canFlowLeft = (t: Transition) => t.from.length <= 1 && t.to.length <= 1;

/**
 * Turns transitions to flow right to left (vertical bar, upstream links entering on the right,
 * downstream links leaving on the left) or top to bottom. Transitions with AND links stay top to
 * bottom.
 */
export function setTransitionFlow(g: Grafcet, ids: Iterable<Id>, flow: 'down' | 'left'): void {
  for (const id of ids) {
    const t = g.transitions[id];
    if (!t) continue;
    if (flow === 'down') delete t.flow;
    else if (canFlowLeft(t)) t.flow = 'left';
  }
}

/** Links step → transition or transition → step. Any other pair is unrepresentable: returns false. */
export function connect(g: Grafcet, fromId: Id, toId: Id): boolean {
  const toT = g.transitions[toId];
  if (g.steps[fromId] && toT) {
    if (!toT.from.includes(fromId)) toT.from.push(fromId);
    return true;
  }
  const fromT = g.transitions[fromId];
  if (fromT && g.steps[toId]) {
    if (!fromT.to.includes(toId)) {
      fromT.to.push(toId);
      delete fromT.jump;
    }
    return true;
  }
  return false;
}

/** Removes the link between a transition and a step ('in' = upstream side of the transition). */
export function disconnect(g: Grafcet, transitionId: Id, side: 'in' | 'out', stepId: Id): void {
  const t = g.transitions[transitionId];
  if (!t) return;
  if (side === 'in') t.from = t.from.filter((id) => id !== stepId);
  else {
    t.to = t.to.filter((id) => id !== stepId);
    delete t.jump;
  }
}

/**
 * Removes the links of an AND bar, leaving the transition and the steps: a join's links from its
 * steps (the transition becomes a source), a split's links to them (it becomes a sink).
 */
export function disconnectBar(g: Grafcet, transitionId: Id, bar: 'join' | 'split'): void {
  const t = g.transitions[transitionId];
  if (!t) return;
  if (bar === 'join') t.from = [];
  else {
    t.to = [];
    delete t.jump;
  }
}

function removeStep(g: Grafcet, id: Id): void {
  delete g.steps[id];
  for (const a of Object.values(g.actions)) if (a.stepId === id) delete g.actions[a.id];
  for (const t of Object.values(g.transitions)) {
    if (t.from.includes(id)) t.from = t.from.filter((s) => s !== id);
    if (t.to.includes(id)) {
      t.to = t.to.filter((s) => s !== id);
      delete t.jump;
    }
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
 * - first step of a sequence: its outgoing transition goes too (it would become a source
 *   transition, always enabled);
 * - the transition leading to the step is never deleted: after the last step of a sequence it
 *   stays as a sink transition, ready for a new step (`Enter`).
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
      // It leads where the deleted transition led, drawn the same way.
      if (tout.jump) tin.jump = true;
      else delete tin.jump;
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

/** Moves a grafcet to position `index` of the tab order (clamped). */
export function moveGrafcetTo(p: Project, gid: Id, index: number): void {
  const i = p.grafcetOrder.indexOf(gid);
  if (i < 0) return;
  const to = Math.max(0, Math.min(index, p.grafcetOrder.length - 1));
  if (to === i) return;
  p.grafcetOrder.splice(i, 1);
  p.grafcetOrder.splice(to, 0, gid);
}
