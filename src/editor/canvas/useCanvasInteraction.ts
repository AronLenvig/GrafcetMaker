import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  elementBounds,
  computeGeometry,
  rectsIntersect,
  snap,
  stepRect,
  type Rect,
} from '@/core/layout/geometry';
import * as ops from '@/core/model/ops';
import type { Id, Point } from '@/core/model/types';
import { usePrefs } from '@/app/prefs';
import {
  addActionAt,
  addCommentAt,
  addStepAt,
  addTransitionAt,
  editActive,
  editSelection,
} from '../commands/edit';
import { doc, getProject } from '../store/document';
import { ui, useUi } from '../store/uiStore';
import { useInteraction, type LinkDrag } from './interactionStore';
import { openChild } from '../commands/hierarchy';
import { cancelPending, completeLoop } from '../commands/structure';
import { getViewport, panBy, screenToDiagram, zoomAt } from './viewport';
import { portPosition } from '@/core/layout/geometry';

type Gesture =
  | { kind: 'idle' }
  | { kind: 'pan'; last: Point }
  | { kind: 'press'; id: Id; start: Point; startD: Point; reselect: boolean }
  | { kind: 'move'; startD: Point; applied: Point; ids: Id[] }
  | { kind: 'marquee'; startD: Point; additive: boolean }
  | { kind: 'link'; drag: LinkDrag }
  /** Dragging the side lane of a loop link (sets the transition's routing.sideX). */
  | { kind: 'route'; transitionId: Id; startX: number; startSide: number; moved: boolean };

const DRAG_THRESHOLD = 3;

function elementAt(
  el: Element | null,
): { kind: string; id: string | null; key: string | null } | null {
  // Problem badges stand for the element they are attached to.
  const hit = el?.closest('[data-el],[data-badge]');
  if (!hit) return null;
  return {
    kind: hit.getAttribute('data-el') ?? hit.getAttribute('data-badge') ?? '',
    id: hit.getAttribute('data-id'),
    key: hit.getAttribute('data-key'),
  };
}

function rectFrom(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Pointer/wheel handling for the canvas: select, move, marquee, link drag, pan, zoom, place. */
export function useCanvasInteraction(
  containerRef: RefObject<HTMLDivElement | null>,
  gid: Id | null,
  readOnly: boolean,
) {
  const gesture = useRef<Gesture>({ kind: 'idle' });
  const spaceDown = useRef(false);

  const local = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const r = containerRef.current?.getBoundingClientRect();
      return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
    },
    [containerRef],
  );

  const toDiagram = useCallback(
    (p: Point): Point => (gid ? screenToDiagram(getViewport(gid), p) : p),
    [gid],
  );

  const snapPoint = (p: Point): Point =>
    usePrefs.getState().snapToGrid ? { x: snap(p.x), y: snap(p.y) } : p;

  const cancelGesture = useCallback(() => {
    const g = gesture.current;
    if (g.kind === 'move' || (g.kind === 'route' && g.moved)) doc.cancel();
    gesture.current = { kind: 'idle' };
    useInteraction.setState({
      marquee: null,
      link: null,
      moving: false,
      panning: false,
      dropTarget: null,
    });
  }, []);

  // Wheel: pan, Ctrl/Cmd (and trackpad pinch) zooms around the pointer. Must be non-passive.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !gid) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) zoomAt(gid, Math.exp(-dy * 0.002), local(e));
      else if (e.shiftKey && dx === 0) panBy(gid, -dy, 0);
      else panBy(gid, -dx, -dy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, gid, local]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!gid) return;
    containerRef.current?.focus({ preventScroll: true });
    const p = local(e);
    const d = toDiagram(p);
    const tool = useUi.getState().tool;
    const capture = () => e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1 || (e.button === 0 && (spaceDown.current || tool === 'hand'))) {
      e.preventDefault();
      gesture.current = { kind: 'pan', last: p };
      useInteraction.setState({ panning: true });
      capture();
      return;
    }
    if (e.button !== 0) return;
    const g = getProject().grafcets[gid];
    if (!g) return;
    const target = e.target as Element;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

    const handle = target.closest('[data-handle]');
    if (handle && !readOnly) {
      const id = handle.getAttribute('data-id')!;
      const port = handle.getAttribute('data-handle') as 'in' | 'out';
      const origin = portPosition(g, id, port);
      if (origin) {
        const drag: LinkDrag = {
          from: id,
          fromKind: g.steps[id] ? 'step' : 'transition',
          port,
          origin,
          current: d,
          target: null,
        };
        gesture.current = { kind: 'link', drag };
        useInteraction.setState({ link: drag });
        capture();
      }
      return;
    }

    const hit = elementAt(target);
    const pending = useUi.getState().pending;
    if (pending) {
      // No compatibility mousedown: it would move focus away from the editor this opens.
      e.preventDefault();
      if (pending.kind === 'loop' && hit?.kind === 'step' && hit.id) completeLoop(hit.id);
      else cancelPending();
      return;
    }
    if (!readOnly && tool === 'action') {
      // On a step (or one of its actions): attach. On empty canvas: unattached action.
      const stepId =
        hit?.kind === 'step' && hit.id
          ? hit.id
          : hit?.kind === 'action' && hit.id
            ? (g.actions[hit.id]?.stepId ?? null)
            : null;
      if (stepId || !hit) {
        e.preventDefault();
        // Back to Select first: changing tools closes the editor the new action opens.
        if (!e.shiftKey) ui.setTool('select');
        addActionAt(snapPoint(d), stepId);
      }
      return;
    }
    if (!readOnly && (tool === 'step' || tool === 'transition' || tool === 'comment')) {
      if (!hit) {
        e.preventDefault();
        const at = snapPoint(d);
        // Back to Select first: changing tools closes the editor a new comment opens.
        if (!e.shiftKey) ui.setTool('select');
        if (tool === 'step') addStepAt(at);
        else if (tool === 'transition') addTransitionAt(at);
        else addCommentAt(at);
      }
      return;
    }
    if (hit?.kind === 'link' && hit.key) {
      ui.set({ selection: {}, selectedLink: hit.key });
      const link = computeGeometry(g).links.find((l) => l.key === hit.key);
      if (!readOnly && link?.arrow) {
        gesture.current = {
          kind: 'route',
          transitionId: link.transitionId,
          startX: d.x,
          startSide: link.arrow.x,
          moved: false,
        };
        capture();
      }
      return;
    }
    if (hit?.id) {
      const wasSelected = !!useUi.getState().selection[hit.id];
      if (additive) ui.select([hit.id], 'toggle');
      else if (!wasSelected) ui.select([hit.id]);
      // Attached actions follow their step; unattached ones are dragged like comments.
      if (!readOnly && (hit.kind !== 'action' || g.actions[hit.id]?.stepId === null)) {
        gesture.current = {
          kind: 'press',
          id: hit.id,
          start: p,
          startD: d,
          reselect: wasSelected && !additive,
        };
        capture();
      }
      return;
    }
    if (!additive) ui.clearSelection();
    gesture.current = { kind: 'marquee', startD: d, additive };
    capture();
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!gid) return;
    const g0 = gesture.current;
    const p = local(e);
    switch (g0.kind) {
      case 'idle': {
        const t = e.target as Element;
        const handle = t.closest('[data-handle]');
        const hit = elementAt(t);
        const id =
          handle?.getAttribute('data-id') ??
          (hit && (hit.kind === 'step' || hit.kind === 'transition') ? hit.id : null);
        if (useInteraction.getState().hover !== id) useInteraction.setState({ hover: id });
        return;
      }
      case 'pan':
        panBy(gid, p.x - g0.last.x, p.y - g0.last.y);
        g0.last = p;
        return;
      case 'press': {
        if (Math.hypot(p.x - g0.start.x, p.y - g0.start.y) < DRAG_THRESHOLD) return;
        const g = getProject().grafcets[gid];
        const ids = ui
          .selectedIds()
          .filter(
            (id) =>
              g &&
              (g.steps[id] ||
                g.transitions[id] ||
                g.comments[id] ||
                g.actions[id]?.stepId === null),
          );
        if (!ids.length) {
          gesture.current = { kind: 'idle' };
          return;
        }
        doc.begin('history.move');
        gesture.current = { kind: 'move', startD: g0.startD, applied: { x: 0, y: 0 }, ids };
        useInteraction.setState({ moving: true, hover: null });
        onPointerMove(e);
        return;
      }
      case 'move': {
        const d = toDiagram(p);
        // A single unattached action dropped on a step gets attached to it.
        const g = getProject().grafcets[gid];
        const only = g0.ids.length === 1 ? g?.actions[g0.ids[0]!] : undefined;
        const target =
          g && only?.stepId === null
            ? (Object.values(g.steps).find((s) =>
                rectsIntersect(stepRect(s), { ...d, width: 0, height: 0 }),
              )?.id ?? null)
            : null;
        if (useInteraction.getState().dropTarget !== target)
          useInteraction.setState({ dropTarget: target });
        const raw = { x: d.x - g0.startD.x, y: d.y - g0.startD.y };
        const delta = usePrefs.getState().snapToGrid ? { x: snap(raw.x), y: snap(raw.y) } : raw;
        if (delta.x === g0.applied.x && delta.y === g0.applied.y) return;
        const dx = delta.x - g0.applied.x;
        const dy = delta.y - g0.applied.y;
        doc.update((proj) => {
          const g = proj.grafcets[gid];
          if (g) ops.moveElements(g, g0.ids, dx, dy);
        });
        g0.applied = delta;
        return;
      }
      case 'marquee':
        useInteraction.setState({ marquee: rectFrom(g0.startD, toDiagram(p)) });
        return;
      case 'route': {
        const d = toDiagram(p);
        const sideX = snap(g0.startSide + d.x - g0.startX);
        if (!g0.moved) {
          if (Math.abs(d.x - g0.startX) * getViewport(gid).zoom < DRAG_THRESHOLD) return;
          g0.moved = true;
          doc.begin('history.route');
        }
        doc.update((proj) => {
          const tr = proj.grafcets[gid]?.transitions[g0.transitionId];
          if (tr && tr.routing?.sideX !== sideX) tr.routing = { sideX };
        });
        return;
      }
      case 'link': {
        const d = toDiagram(p);
        const g = getProject().grafcets[gid];
        const hit = elementAt(document.elementFromPoint(e.clientX, e.clientY));
        let target: Id | null = null;
        if (g && hit?.id) {
          const wanted = g0.drag.fromKind === 'step' ? 'transition' : 'step';
          if (hit.kind === wanted && hit.id !== g0.drag.from) target = hit.id;
        }
        g0.drag = { ...g0.drag, current: d, target };
        useInteraction.setState({ link: g0.drag });
        return;
      }
    }
  };

  const finishLink = (drag: LinkDrag, overElement: boolean) => {
    if (drag.target) {
      const [a, b] = drag.port === 'out' ? [drag.from, drag.target] : [drag.target, drag.from];
      editActive('history.link', (g) => void ops.connect(g, a, b));
      return;
    }
    if (overElement) return;
    const at = snapPoint(drag.current);
    let created: Id | null = null;
    editActive('history.link', (g) => {
      const el = drag.fromKind === 'step' ? ops.addTransition(g, at) : ops.addStep(g, at);
      created = el.id;
      if (drag.port === 'out') ops.connect(g, drag.from, el.id);
      else ops.connect(g, el.id, drag.from);
    });
    if (created) {
      ui.select([created]);
      if (drag.fromKind === 'step') ui.edit({ id: created, field: 'receptivity' });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g0 = gesture.current;
    gesture.current = { kind: 'idle' };
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    switch (g0.kind) {
      case 'press':
        if (g0.reselect) ui.select([g0.id]);
        break;
      case 'move': {
        const target = useInteraction.getState().dropTarget;
        const actionId = g0.ids[0];
        if (target && actionId && g0.ids.length === 1)
          doc.update((proj) => {
            const g = proj.grafcets[gid!];
            if (g) ops.attachAction(g, actionId, target);
          });
        doc.commit();
        useInteraction.setState({ moving: false, dropTarget: null });
        break;
      }
      case 'marquee': {
        const r = useInteraction.getState().marquee;
        useInteraction.setState({ marquee: null });
        const g = gid ? getProject().grafcets[gid] : undefined;
        if (!r || !g || (r.width < 2 && r.height < 2)) break;
        const geom = computeGeometry(g);
        const ids = [
          ...Object.keys(g.steps),
          ...Object.keys(g.transitions),
          ...Object.keys(g.comments),
          ...Object.values(g.actions)
            .filter((a) => a.stepId === null)
            .map((a) => a.id),
        ].filter((id) => {
          const b = elementBounds(g, geom, id);
          return b && rectsIntersect(b, r);
        });
        ui.select(ids, g0.additive ? 'add' : 'replace');
        break;
      }
      case 'link': {
        useInteraction.setState({ link: null });
        const over = elementAt(document.elementFromPoint(e.clientX, e.clientY));
        finishLink(g0.drag, !!over);
        break;
      }
      case 'pan':
        useInteraction.setState({ panning: false });
        break;
      case 'route':
        if (g0.moved) doc.commit();
        break;
      case 'idle':
        break;
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!gid) return;
    // Hit-test by position: after pointer capture the event targets the <svg> itself.
    const hit = elementAt(document.elementFromPoint(e.clientX, e.clientY));
    // Macro-steps and enclosing steps open their sub-grafcet (F2 still edits the number).
    if (hit?.kind === 'step' && hit.id && openChild(hit.id)) return;
    if (readOnly) return;
    if (hit?.id && hit.kind !== 'link') {
      ui.select([hit.id]);
      editSelection();
      return;
    }
    if (!hit && useUi.getState().tool === 'select') addStepAt(snapPoint(toDiagram(local(e))));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === ' ' &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
    ) {
      spaceDown.current = true;
      e.preventDefault();
    }
    if (e.key === 'Escape' && gesture.current.kind !== 'idle') {
      cancelGesture();
      e.stopPropagation();
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ') spaceDown.current = false;
  };

  const onPointerLeave = () => {
    if (gesture.current.kind === 'idle' && useInteraction.getState().hover)
      useInteraction.setState({ hover: null });
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancelGesture,
    onDoubleClick,
    onKeyDown,
    onKeyUp,
    onPointerLeave,
  };
}
