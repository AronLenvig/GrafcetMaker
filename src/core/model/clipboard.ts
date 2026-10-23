import { z } from 'zod';
import { newId } from './factory';
import {
  actionSchema,
  commentSchema,
  LIMITS,
  stepSchema,
  transitionSchema,
  variableSchema,
} from './schema';
import type { Action, Comment, Grafcet, Id, Project, Step, Transition, Variable } from './types';

/** Clipboard payload, exchanged as JSON text so copy/paste works across tabs and projects. */
export const CLIPBOARD_FORMAT = 'grafcetmaker/elements';

const clipboardSchema = z.object({
  format: z.literal(CLIPBOARD_FORMAT),
  version: z.literal(1),
  steps: z.array(stepSchema).max(LIMITS.elements),
  transitions: z.array(transitionSchema).max(LIMITS.elements),
  actions: z.array(actionSchema).max(LIMITS.elements),
  comments: z.array(commentSchema).max(LIMITS.elements),
  variables: z.array(variableSchema).max(LIMITS.elements),
});

export type ClipboardPayload = z.infer<typeof clipboardSchema>;

/**
 * Copies the given elements of a grafcet. Steps bring their actions; transitions keep only links
 * to copied steps. `referencedVariables` lets callers include variables used by expressions.
 */
export function copyElements(
  g: Grafcet,
  ids: Iterable<Id>,
  referencedVariables: Variable[] = [],
): ClipboardPayload | null {
  const set = new Set(ids);
  const steps: Step[] = [];
  const transitions: Transition[] = [];
  const comments: Comment[] = [];
  for (const id of set) {
    const s = g.steps[id];
    if (s) steps.push(s);
    const c = g.comments[id];
    if (c) comments.push(c);
  }
  const stepIds = new Set(steps.map((s) => s.id));
  for (const id of set) {
    const t = g.transitions[id];
    if (t)
      transitions.push({
        ...t,
        from: t.from.filter((s) => stepIds.has(s)),
        to: t.to.filter((s) => stepIds.has(s)),
      });
  }
  const actions: Action[] = Object.values(g.actions).filter((a) =>
    a.stepId === null ? set.has(a.id) : stepIds.has(a.stepId),
  );
  const free = actions.some((a) => a.stepId === null);
  if (!steps.length && !transitions.length && !comments.length && !free) return null;
  return {
    format: CLIPBOARD_FORMAT,
    version: 1,
    steps,
    transitions,
    actions,
    comments,
    variables: referencedVariables,
  };
}

export function serializeClipboard(payload: ClipboardPayload): string {
  return JSON.stringify(payload);
}

/** Parses untrusted clipboard text; null if it is not a GrafcetMaker payload. */
export function parseClipboard(text: string): ClipboardPayload | null {
  if (text.length > LIMITS.fileBytes || !text.includes(CLIPBOARD_FORMAT)) return null;
  try {
    const result = clipboardSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Pastes a payload into a grafcet with fresh ids, shifted by `offset`. Step numbers already used
 * in the target are renumbered; variables are added only when no variable of that name exists.
 * Returns the ids of the pasted diagram elements.
 */
export function pasteElements(
  project: Project,
  grafcetId: Id,
  payload: ClipboardPayload,
  offset: { x: number; y: number },
): Id[] {
  const g = project.grafcets[grafcetId];
  if (!g) return [];
  const idMap = new Map<Id, Id>();
  const created: Id[] = [];
  const used = new Set(Object.values(g.steps).map((s) => s.number));
  let next = Math.max(-1, ...used) + 1;
  const move = (p: { x: number; y: number }) => ({ x: p.x + offset.x, y: p.y + offset.y });

  for (const s of [...payload.steps].sort((a, b) => a.number - b.number)) {
    const id = newId();
    idMap.set(s.id, id);
    let number = s.number;
    if (used.has(number)) number = next++;
    used.add(number);
    next = Math.max(next, number + 1);
    const step: Step = { ...s, id, number, position: move(s.position) };
    if (step.refGrafcetId && !project.grafcets[step.refGrafcetId]) delete step.refGrafcetId;
    g.steps[id] = step;
    created.push(id);
  }
  for (const t of payload.transitions) {
    const id = newId();
    const remap = (list: Id[]) => list.map((s) => idMap.get(s)).filter((s): s is Id => !!s);
    const tr: Transition = {
      ...t,
      id,
      from: remap(t.from),
      to: remap(t.to),
      position: move(t.position),
    };
    if (tr.routing)
      tr.routing = {
        ...(tr.routing.sideX !== undefined ? { sideX: tr.routing.sideX + offset.x } : {}),
        ...(tr.routing.dropY !== undefined ? { dropY: tr.routing.dropY + offset.y } : {}),
      };
    g.transitions[id] = tr;
    created.push(id);
  }
  for (const a of payload.actions) {
    const id = newId();
    if (a.stepId === null) {
      g.actions[id] = { ...a, id, position: move(a.position ?? { x: 0, y: 0 }) };
      created.push(id);
      continue;
    }
    const stepId = idMap.get(a.stepId);
    if (!stepId) continue;
    g.actions[id] = { ...a, id, stepId };
  }
  for (const c of payload.comments) {
    const id = newId();
    g.comments[id] = { ...c, id, position: move(c.position) };
    created.push(id);
  }
  const names = new Set(Object.values(project.variables).map((v) => v.name.toLowerCase()));
  for (const v of payload.variables) {
    if (names.has(v.name.toLowerCase())) continue;
    const id = newId();
    project.variables[id] = { ...v, id };
    names.add(v.name.toLowerCase());
  }
  return created;
}
