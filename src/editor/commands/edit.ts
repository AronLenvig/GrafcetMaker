import { ACTION_HEIGHT, GRID } from '@/core/layout/geometry';
import {
  copyElements,
  parseClipboard,
  pasteElements,
  serializeClipboard,
} from '@/core/model/clipboard';
import { createGrafcet, createStep } from '@/core/model/factory';
import { indexGrafcet, type GrafcetIndex } from '@/core/model/graph';
import { nextBaseNumber } from '@/core/model/hierarchy';
import * as ops from '@/core/model/ops';
import { IDENT_RE } from '@/core/model/constants';
import type { ActionKind, Grafcet, Id, Point, Project, Variable } from '@/core/model/types';
import { revealElements, viewCenter } from '../canvas/viewport';
import { doc, getActiveGrafcet, getProject } from '../store/document';
import { ui, useUi } from '../store/uiStore';

/**
 * Hook for clipboard copy to include variables referenced by the copied expressions.
 * Installed by the expression layer; defaults to none.
 */
export const clipboardHooks: {
  referencedVariables: (p: Project, g: Grafcet, ids: Id[]) => Variable[];
} = {
  referencedVariables: () => [],
};

function activeId(): Id | null {
  return useUi.getState().activeGrafcetId;
}

/** Runs an undoable recipe against the active grafcet. */
export function editActive(label: string, recipe: (g: Grafcet, p: Project) => void): boolean {
  const gid = activeId();
  if (!gid) return false;
  return doc.execute(label, (p) => {
    const g = p.grafcets[gid];
    if (g) recipe(g, p);
  });
}

function reveal(ids: Id[]): void {
  const gid = activeId();
  if (gid) revealElements(gid, ids);
}

/** Lowest step with no outgoing transition: where `Enter` continues when nothing is selected. */
function sequenceEnd(g: Grafcet): Id | null {
  const index = indexGrafcet(g);
  let best: { id: Id; y: number } | null = null;
  for (const s of Object.values(g.steps)) {
    if (index.outgoing.has(s.id)) continue;
    if (!best || s.position.y > best.y) best = { id: s.id, y: s.position.y };
  }
  return best?.id ?? null;
}

/**
 * `Enter`: append transition + step after the selected step/transition, select the new step and
 * edit the receptivity. `editReceptivity: false` (a click on the ghost) only selects the new step,
 * as if it had been clicked, so its own ghosts are one click away.
 */
export function appendSequence({
  editReceptivity = true,
}: { editReceptivity?: boolean } = {}): void {
  const g = getActiveGrafcet();
  if (!g) return;
  const sel = ui.selectedIds();
  const picked = sel.length === 1 ? sel[0]! : sel.length === 0 ? sequenceEnd(g) : null;
  const id = picked && g.actions[picked] ? g.actions[picked].stepId : picked;
  if (!id) return;
  let result: { stepId: Id; transitionId?: Id } | null = null;
  if (g.steps[id])
    editActive('history.append', (gd) => void (result = ops.appendAfterStep(gd, id)));
  else if (g.transitions[id])
    editActive('history.append', (gd) => void (result = ops.appendAfterTransition(gd, id)));
  if (!result) return;
  const r = result as { stepId: Id; transitionId?: Id };
  ui.select([r.stepId]);
  reveal([r.stepId, ...(r.transitionId ? [r.transitionId] : [])]);
  const editTarget = editReceptivity && g.steps[id] ? r.transitionId : undefined;
  if (editTarget) ui.edit({ id: editTarget, field: 'receptivity' });
}

/**
 * `A`: add an action to the selected step (or after the selected action) and edit its text.
 * With no step to attach it to, the Action tool is selected: click a step, or empty canvas.
 */
export function addActionToSelection(kind: ActionKind = 'continuous'): void {
  const g = getActiveGrafcet();
  if (!g) return;
  const sel = ui.selectedIds();
  const id = sel.length === 1 ? sel[0]! : null;
  const stepId = id ? (g.steps[id] ? id : g.actions[id]?.stepId) : null;
  if (!stepId) {
    ui.setTool('action');
    return;
  }
  let created: Id | null = null;
  editActive('history.addAction', (gd) => void (created = ops.addAction(gd, stepId, kind).id));
  if (created) {
    ui.select([created]);
    ui.edit({ id: created, field: 'text' });
  }
}

/**
 * What Shift+Enter continues with after editing an element: the next action of its step (or a new
 * one at the end), or the next receptivity of the sequence (or a new transition and step at its
 * end). Null when there is nothing to continue with.
 */
export function nextAfter(
  g: Grafcet,
  id: Id,
  index: GrafcetIndex = indexGrafcet(g),
): 'action' | 'step' | null {
  if (g.actions[id]?.stepId) return 'action';
  return nextTransition(g, id, index) === undefined ? null : 'step';
}

/**
 * After a transition leading to one step (or none): the step's only outgoing transition, null to
 * append a new one, undefined when there is no single next (parallel or alternative branches).
 */
function nextTransition(
  g: Grafcet,
  id: Id,
  index: GrafcetIndex = indexGrafcet(g),
): Id | null | undefined {
  const t = g.transitions[id];
  if (!t || t.to.length > 1) return undefined;
  const outs = t.to[0] ? (index.outgoing.get(t.to[0]) ?? []) : [];
  return outs.length > 1 ? undefined : (outs[0]?.id ?? null);
}

/** Shift+Enter in the editor of an action text or a receptivity (see `nextAfter`). */
export function continueAfter(id: Id): void {
  const g = getActiveGrafcet();
  if (!g) return;
  const a = g.actions[id];
  if (a?.stepId) {
    const siblings = Object.values(g.actions)
      .filter((b) => b.stepId === a.stepId)
      .sort((x, y) => x.order - y.order);
    const next = siblings[siblings.indexOf(a) + 1];
    if (next) {
      ui.select([next.id]);
      ui.edit({ id: next.id, field: 'text' });
      return;
    }
    ui.select([a.stepId]);
    addActionToSelection(a.kind);
    return;
  }
  const next = nextTransition(g, id);
  if (next === undefined) return;
  if (next) {
    ui.select([next]);
    reveal([next]);
    ui.edit({ id: next, field: 'receptivity' });
    return;
  }
  ui.select([g.transitions[id]!.to[0] ?? id]);
  appendSequence();
}

/** Action tool click: a new action on the step clicked, or unattached at `at` (left middle). */
export function addActionAt(at: Point, stepId: Id | null): Id | null {
  let created: Id | null = null;
  editActive('history.addAction', (g) => {
    created = (
      stepId
        ? ops.addAction(g, stepId)
        : ops.addFreeAction(g, { x: at.x, y: at.y - ACTION_HEIGHT / 2 })
    ).id;
  });
  if (created) {
    ui.select([created]);
    ui.edit({ id: created, field: 'text' });
  }
  return created;
}

/** `F2`: edit the main text of the selected element. */
export function editSelection(): void {
  const g = getActiveGrafcet();
  const sel = ui.selectedIds();
  if (!g || sel.length !== 1) return;
  const id = sel[0]!;
  if (g.steps[id]) ui.edit({ id, field: 'number' });
  else if (g.transitions[id]) ui.edit({ id, field: 'receptivity' });
  else if (g.actions[id] || g.comments[id]) ui.edit({ id, field: 'text' });
}

/** `Del`: delete the selection (healing sequences unless `heal` is false) or the selected link. */
export function deleteSelection(heal = true): void {
  const { selectedLink } = useUi.getState();
  if (selectedLink) {
    const [tid, side, sid] = selectedLink.split(':') as [Id, 'in' | 'out', Id];
    editActive('history.deleteLink', (g) => ops.disconnect(g, tid, side, sid));
    ui.clearSelection();
    return;
  }
  const ids = ui.selectedIds();
  if (!ids.length) return;
  editActive(heal ? 'history.delete' : 'history.deleteNoHeal', (g) =>
    ops.deleteElements(g, ids, heal),
  );
  ui.clearSelection();
}

export function selectAll(): void {
  const g = getActiveGrafcet();
  if (!g) return;
  ui.select([...Object.keys(g.steps), ...Object.keys(g.transitions), ...Object.keys(g.comments)]);
}

export function nudgeSelection(dx: number, dy: number): void {
  const ids = ui.selectedIds();
  if (ids.length) editActive('history.move', (g) => ops.moveElements(g, ids, dx, dy));
}

export function addStepAt(position: Point): Id | null {
  let id: Id | null = null;
  editActive('history.addStep', (g) => void (id = ops.addStep(g, position).id));
  if (id) ui.select([id]);
  return id;
}

export function addTransitionAt(position: Point): Id | null {
  let id: Id | null = null;
  editActive('history.addTransition', (g) => void (id = ops.addTransition(g, position).id));
  if (id) {
    ui.select([id]);
    ui.edit({ id, field: 'receptivity' });
  }
  return id;
}

export function addCommentAt(position: Point): Id | null {
  let id: Id | null = null;
  editActive('history.addComment', (g) => void (id = ops.addComment(g, position, '').id));
  if (id) {
    ui.select([id]);
    ui.edit({ id, field: 'text' });
  }
  return id;
}

/** Adds a step in the middle of the view (palette / menu, where there is no pointer position). */
export function addStepAtCenter(): void {
  const gid = activeId();
  if (!gid) return;
  const c = viewCenter(gid);
  addStepAt({ x: Math.round(c.x / GRID) * GRID, y: Math.round(c.y / GRID) * GRID });
}

export function toggleInitialStep(): void {
  const g = getActiveGrafcet();
  const ids = ui.selectedIds().filter((id) => g?.steps[id]);
  if (!ids.length || !g) return;
  const makeInitial = ids.some((id) => g.steps[id]!.kind !== 'initial');
  editActive('history.toggleInitial', (gd) => {
    for (const id of ids) {
      const s = gd.steps[id];
      if (s && (s.kind === 'normal' || s.kind === 'initial'))
        s.kind = makeInitial ? 'initial' : 'normal';
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Clipboard (cross-tab and cross-project via JSON text)

let memoryClipboard: string | null = null;

function selectionPayloadText(): string | null {
  const g = getActiveGrafcet();
  if (!g) return null;
  const ids = ui.selectedIds();
  const payload = copyElements(g, ids, clipboardHooks.referencedVariables(getProject(), g, ids));
  return payload ? serializeClipboard(payload) : null;
}

/** Copies the selection. With a DataTransfer (copy event) no clipboard permission is needed. */
export function copySelection(data?: DataTransfer | null): boolean {
  const text = selectionPayloadText();
  if (!text) return false;
  memoryClipboard = text;
  ui.set({ pasteCount: 0 });
  if (data) data.setData('text/plain', text);
  else void navigator.clipboard?.writeText(text).catch(() => undefined);
  return true;
}

export function cutSelection(data?: DataTransfer | null): void {
  if (copySelection(data)) deleteSelection(true);
}

/** Pastes clipboard text; `null` (clipboard unreadable) falls back to the in-app clipboard. */
export function pasteText(text: string | null): boolean {
  const gid = activeId();
  const source = text ?? memoryClipboard;
  const payload = source ? parseClipboard(source) : null;
  if (!gid || !payload) return false;
  const n = useUi.getState().pasteCount + 1;
  let created: Id[] = [];
  doc.execute('history.paste', (p) => {
    created = pasteElements(p, gid, payload, { x: 2 * GRID * n, y: 2 * GRID * n });
  });
  ui.set({ pasteCount: n });
  ui.select(created);
  reveal(created);
  return created.length > 0;
}

/** Menu/palette paste: reads the system clipboard when allowed, else the in-app clipboard. */
export async function pasteFromSystem(): Promise<void> {
  let text: string | null;
  try {
    text = (await navigator.clipboard?.readText()) ?? null;
  } catch {
    text = null;
  }
  pasteText(text);
}

// ---------------------------------------------------------------------------------------------
// Grafcets (tabs)

export function uniqueGrafcetName(p: Project, prefix = 'G'): string {
  const used = new Set(Object.values(p.grafcets).map((g) => g.name.toLowerCase()));
  for (let i = 1; ; i++) if (!used.has(`${prefix}${i}`.toLowerCase())) return `${prefix}${i}`;
}

export function addGrafcet(): Id {
  const p = getProject();
  const g = createGrafcet(uniqueGrafcetName(p));
  const s = createStep(nextBaseNumber(p), { x: 200, y: 100 }, 'initial');
  g.steps[s.id] = s;
  doc.execute('history.addGrafcet', (d) => {
    d.grafcets[g.id] = g;
    d.grafcetOrder.push(g.id);
  });
  ui.set({ activeGrafcetId: g.id, selection: {}, selectedLink: null, editing: null });
  return g.id;
}

export type NameError = 'empty' | 'invalid' | 'duplicate';

export function validateGrafcetName(p: Project, gid: Id, name: string): NameError | null {
  if (!name) return 'empty';
  if (!IDENT_RE.test(name)) return 'invalid';
  const lower = name.toLowerCase();
  if (Object.values(p.grafcets).some((g) => g.id !== gid && g.name.toLowerCase() === lower))
    return 'duplicate';
  return null;
}

export function renameGrafcet(gid: Id, name: string): NameError | null {
  const err = validateGrafcetName(getProject(), gid, name);
  if (err) return err;
  doc.execute('history.renameGrafcet', (p) => {
    const g = p.grafcets[gid];
    if (g) g.name = name;
  });
  return null;
}

/**
 * Deletes grafcets (one undo step); macro-steps and enclosing steps that used them lose their
 * reference. A project keeps at least one grafcet: returns false when that would not be the case.
 */
export function deleteGrafcets(ids: Id[]): boolean {
  const p = getProject();
  const gone = new Set(ids.filter((id) => p.grafcets[id]));
  if (!gone.size || gone.size >= p.grafcetOrder.length) return false;
  doc.execute(gone.size > 1 ? 'history.deleteGrafcets' : 'history.deleteGrafcet', (d) => {
    for (const id of gone) delete d.grafcets[id];
    d.grafcetOrder = d.grafcetOrder.filter((id) => !gone.has(id));
    for (const g of Object.values(d.grafcets)) {
      for (const s of Object.values(g.steps))
        if (s.refGrafcetId && gone.has(s.refGrafcetId)) delete s.refGrafcetId;
    }
  });
  return true;
}

export function moveGrafcet(gid: Id, delta: -1 | 1): void {
  doc.execute('history.reorderGrafcets', (p) => {
    const i = p.grafcetOrder.indexOf(gid);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= p.grafcetOrder.length) return;
    [p.grafcetOrder[i], p.grafcetOrder[j]] = [p.grafcetOrder[j]!, p.grafcetOrder[i]!];
  });
}

/** Drag-and-drop of a tab: moves the grafcet to another position. One undo step. */
export function moveGrafcetTo(gid: Id, index: number): void {
  doc.execute('history.reorderGrafcets', (p) => ops.moveGrafcetTo(p, gid, index));
}

export function setActiveGrafcet(gid: Id): void {
  if (useUi.getState().activeGrafcetId === gid) return;
  ui.set({ activeGrafcetId: gid, selection: {}, selectedLink: null, editing: null });
}

/** Switches to a grafcet, selects elements there, pans/zooms to them and flashes them. */
export function revealInGrafcet(gid: Id, ids: Id[]): void {
  setActiveGrafcet(gid);
  ui.select(ids.slice(0, 1));
  requestAnimationFrame(() => {
    revealElements(gid, ids);
    ui.flash(ids);
  });
}
