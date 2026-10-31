import { actionDropAt, layoutActions, parseLinkKey } from '@/core/layout/geometry';
import { indexGrafcet } from '@/core/model/graph';
import * as ops from '@/core/model/ops';
import type { Id, Point } from '@/core/model/types';
import { doc, getProject } from '../../store/document';
import { ui, useUi } from '../../store/uiStore';
import { useInteraction } from '../interactionStore';
import { DRAG_THRESHOLD, TOUCH_SLOP, type GestureContext, type GestureOf } from './gesture';

/** The id of the transition an AND bar belongs to, if `key` names one. */
export function barTransition(key: string | null): Id | null {
  const bar = key ? parseLinkKey(key) : null;
  return bar?.kind === 'bar' ? bar.transitionId : null;
}

/**
 * A press on an AND bar: selected like a link (Del removes its links); dragged, it moves its
 * transition. Locked, a finger on it pans.
 */
export function pressBar(
  ctx: GestureContext,
  key: string | null,
  transitionId: Id,
  p: Point,
  d: Point,
  touch: boolean,
  capture: () => void,
): void {
  ui.set({ selection: {}, selectedLink: key ?? null });
  if (!ctx.readOnly) {
    ctx.gesture.current = {
      kind: 'press',
      id: transitionId,
      start: p,
      startD: d,
      reselect: false,
      slop: touch ? TOUCH_SLOP : DRAG_THRESHOLD,
      moves: [transitionId],
    };
    capture();
  } else if (touch) {
    ctx.gesture.current = { kind: 'pan', last: p, start: p, tap: 'element' };
    capture();
  }
}

/**
 * A press on an element selects it (toggles it with a modifier; a selection it is part of is kept
 * until the release, for dragging all of it). Locked, a finger on it pans.
 */
export function pressElement(
  ctx: GestureContext,
  id: Id,
  p: Point,
  d: Point,
  touch: boolean,
  additive: boolean,
  capture: () => void,
): void {
  const wasSelected = !!useUi.getState().selection[id];
  if (additive) ui.select([id], 'toggle');
  else if (!wasSelected) ui.select([id]);
  if (!ctx.readOnly) {
    ctx.gesture.current = {
      kind: 'press',
      id,
      start: p,
      startD: d,
      reselect: wasSelected && !additive,
      slop: touch ? TOUCH_SLOP : DRAG_THRESHOLD,
    };
    capture();
  } else if (touch) {
    ctx.gesture.current = { kind: 'pan', last: p, start: p, tap: 'element' };
    capture();
  }
}

/**
 * A press that moved past its slop starts dragging: an action on its own (off its step meanwhile,
 * drawn where it was), or the selection. Returns whether a drag started (the caller then applies
 * the pointer's position to it).
 */
export function beginMove(ctx: GestureContext, gid: Id, g0: GestureOf<'press'>): boolean {
  const g = getProject().grafcets[gid];
  const selected = g0.moves ?? ui.selectedIds();
  // An action dragged on its own can be dropped on a step; dragged with other selected
  // elements, a free action moves with them, and so does an attached one whose step is in
  // the selection.
  const pressed = g?.actions[g0.id];
  const withOthers =
    !!pressed &&
    selected.length > 1 &&
    selected.includes(pressed.id) &&
    (pressed.stepId === null || selected.includes(pressed.stepId));
  if (pressed && !withOthers) {
    // Off its step while dragged, drawn where it was.
    const step = pressed.stepId === null ? undefined : g!.steps[pressed.stepId];
    const siblings = step ? (indexGrafcet(g!).actions.get(step.id) ?? []) : [];
    const box = step && layoutActions(step, siblings).find((b) => b.id === pressed.id);
    ui.select([pressed.id]);
    doc.begin('history.moveAction');
    if (box)
      doc.update((proj) => {
        const gd = proj.grafcets[gid];
        if (gd) ops.detachAction(gd, pressed.id, { x: box.x, y: box.y });
      });
    ctx.gesture.current = {
      kind: 'move',
      startD: g0.startD,
      applied: { x: 0, y: 0 },
      ids: [pressed.id],
      action: {
        id: pressed.id,
        stepId: pressed.stepId,
        index: Math.max(0, siblings.indexOf(pressed)),
      },
    };
    useInteraction.setState({ moving: true, hover: null });
    return true;
  }
  // Attached actions follow their step.
  const ids = selected.filter(
    (id) =>
      g && (g.steps[id] || g.transitions[id] || g.comments[id] || g.actions[id]?.stepId === null),
  );
  if (!ids.length) {
    ctx.gesture.current = { kind: 'idle' };
    return false;
  }
  doc.begin('history.move');
  ctx.gesture.current = { kind: 'move', startD: g0.startD, applied: { x: 0, y: 0 }, ids };
  useInteraction.setState({ moving: true, hover: null });
  return true;
}

/** The dragged elements follow the pointer (snapped), at most once per frame. */
export function moveSelection(ctx: GestureContext, gid: Id, g0: GestureOf<'move'>, d: Point): void {
  ctx.nextFrame(() => {
    if (ctx.gesture.current !== g0) return;
    const delta = ctx.snapPoint({ x: d.x - g0.startD.x, y: d.y - g0.startD.y });
    if (delta.x !== g0.applied.x || delta.y !== g0.applied.y) {
      const dx = delta.x - g0.applied.x;
      const dy = delta.y - g0.applied.y;
      doc.update((proj) => {
        const g = proj.grafcets[gid];
        if (g) ops.moveElements(g, g0.ids, dx, dy);
      });
      g0.applied = delta;
    }
    // A dragged action shows the step and the place it would be attached to.
    if (g0.action) {
      const g = getProject().grafcets[gid];
      if (g) g0.drops ??= indexGrafcet(g);
      const target = g ? actionDropAt(g, g0.action.id, d, g0.drops) : null;
      const cur = useInteraction.getState().dropTarget;
      if (cur?.stepId !== target?.stepId || cur?.index !== target?.index)
        useInteraction.setState({ dropTarget: target });
    }
  });
}

/** The drag ends: a dragged action is attached where it was dropped (or the drag undone there). */
export function dropSelection(gid: Id | null, g0: GestureOf<'move'>): void {
  const target = useInteraction.getState().dropTarget;
  const a = g0.action;
  if (a && target?.stepId === a.stepId && target?.index === a.index) {
    // Dropped back where it was.
    doc.cancel();
  } else {
    if (a && target)
      doc.update((proj) => {
        const g = proj.grafcets[gid!];
        if (g) ops.attachAction(g, a.id, target.stepId, target.index);
      });
    doc.commit();
  }
  useInteraction.setState({ moving: false, dropTarget: null });
}
