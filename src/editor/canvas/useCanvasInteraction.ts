import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  actionDropAt,
  elementBounds,
  computeGeometry,
  layoutActions,
  rectsIntersect,
  snap,
  type Rect,
  portPosition,
  parseLinkKey,
} from '@/core/layout/geometry';
import { indexGrafcet } from '@/core/model/graph';
import * as ops from '@/core/model/ops';
import type { Id, Point } from '@/core/model/types';
import { usePrefs } from '@/app/prefs';
import {
  addActionAt,
  addActionToSelection,
  addCommentAt,
  addStepAt,
  addTransitionAt,
  appendSequence,
  appendTransition,
  editActive,
  editSelection,
} from '../commands/edit';
import { doc, getProject } from '../store/document';
import { ui, useUi } from '../store/uiStore';
import { useInteraction, type LinkDrag } from './interactionStore';
import { openChild } from '../commands/hierarchy';
import { cancelPending, completeLoop } from '../commands/structure';
import { toggleInput, useSim } from '../simulation/simStore';
import { getViewport, panBy, screenToDiagram, zoomAt } from './viewport';

type Gesture =
  | { kind: 'idle' }
  /**
   * A finger that is a tap (double-tap; on the empty canvas also deselect) unless it moves, or the
   * right button (`menu`), a click opening the context menu unless it moves.
   */
  | {
      kind: 'pan';
      last: Point;
      start?: Point;
      tap?: 'empty' | 'element';
      menu?: true;
      moved?: boolean;
    }
  /** Two fingers: zoom by their distance, pan by their midpoint. */
  | { kind: 'pinch'; dist: number; mid: Point }
  /** A finger with a placing tool: places on release, pans if it moves. */
  | { kind: 'place'; start: Point; place: () => void }
  /**
   * A button or finger down on an element: a click unless it moves, then a drag of the selection,
   * or of `moves` instead (an AND bar moves its transition).
   */
  | {
      kind: 'press';
      id: Id;
      start: Point;
      startD: Point;
      reselect: boolean;
      slop: number;
      moves?: Id[];
    }
  /**
   * Dragging the selection. An action is dragged alone (`action`: it and where it was, its step
   * and place): unattached while dragged, attached to the step it is dropped on.
   */
  | {
      kind: 'move';
      startD: Point;
      applied: Point;
      ids: Id[];
      action?: { id: Id; stepId: Id | null; index: number };
    }
  | { kind: 'marquee'; startD: Point; additive: boolean }
  | { kind: 'link'; drag: LinkDrag }
  /**
   * Dragging a loop link: its side lane sideways (routing.sideX) or its bottom line up and down
   * (routing.dropY). `start` is the pointer and `value` the line's position, on that axis.
   */
  | {
      kind: 'route';
      transitionId: Id;
      axis: 'x' | 'y';
      start: number;
      value: number;
      moved: boolean;
    };

const DRAG_THRESHOLD = 3;
/** Fingers jitter: movement below this is still a tap. */
const TOUCH_SLOP = 8;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DISTANCE = 24;
/** Holding a finger still this long on the empty canvas starts a selection rectangle. */
const LONG_PRESS_MS = 450;
/** The browser's context menu event this soon after the right button is released belongs to it. */
const MENU_AFTER_RELEASE_MS = 500;

function pinchOf(points: Map<number, Point>): { kind: 'pinch'; dist: number; mid: Point } {
  const [a, b] = [...points.values()];
  return {
    kind: 'pinch',
    dist: Math.hypot(b!.x - a!.x, b!.y - a!.y),
    mid: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
  };
}

function elementAt(
  el: Element | null,
): { kind: string; id: string | null; key: string | null; field: string | null } | null {
  // Problem badges stand for the element they are attached to.
  const hit = el?.closest('[data-el],[data-badge]');
  if (!hit) return null;
  return {
    kind: hit.getAttribute('data-el') ?? hit.getAttribute('data-badge') ?? '',
    id: hit.getAttribute('data-id'),
    key: hit.getAttribute('data-key'),
    // A part edited on its own: the step of a transition's jump.
    field: hit.getAttribute('data-field'),
  };
}

/** Tools that place an element with a click (the overlay shows its ghost under the pointer). */
const PLACING = new Set(['step', 'transition', 'comment', 'action']);

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
  // Touch: the fingers on the canvas, the last tap (double-tap) and the long-press timer.
  const touches = useRef(new Map<number, Point>());
  const lastTap = useRef<{ time: number; p: Point } | null>(null);
  const lastPointer = useRef('mouse');
  const longPress = useRef<number | undefined>(undefined);
  // The right button: held down, or when it was released; and the menu being opened by openMenu.
  const rightButton = useRef({ down: false, upAt: -Infinity });
  const replaying = useRef(false);

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
    window.clearTimeout(longPress.current);
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

  // The browser's own context menu event for the right button (on press, or on release on
  // Windows) is not the menu: the menu opens on release, unless the button panned (openMenu).
  useEffect(() => {
    const swallow = (e: MouseEvent) => {
      const right = rightButton.current;
      if (replaying.current) return;
      if (!right.down && e.timeStamp - right.upAt >= MENU_AFTER_RELEASE_MS) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('contextmenu', swallow, true);
    return () => window.removeEventListener('contextmenu', swallow, true);
  }, []);

  /** Opens the context menu under the pointer, as the browser would: a right-click released. */
  const openMenu = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    const under = document.elementFromPoint(clientX, clientY);
    const target = under && container?.contains(under) ? under : container;
    if (!target) return;
    replaying.current = true;
    try {
      target.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          button: 2,
          view: window,
        }),
      );
    } finally {
      replaying.current = false;
    }
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!gid) return;
    containerRef.current?.focus({ preventScroll: true });
    const p = local(e);
    const d = toDiagram(p);
    const tool = useUi.getState().tool;
    const capture = () => e.currentTarget.setPointerCapture(e.pointerId);
    const touch = e.pointerType === 'touch';
    lastPointer.current = e.pointerType;
    if (touch) {
      touches.current.set(e.pointerId, p);
      if (touches.current.size > 2) return;
      if (touches.current.size === 2) {
        // A second finger turns whatever the first one started into a pinch.
        cancelGesture();
        lastTap.current = null;
        gesture.current = pinchOf(touches.current);
        capture();
        return;
      }
    }

    if (e.button === 2 && !touch) {
      // Right button: held and dragged it pans, clicked it opens the context menu on release.
      rightButton.current = { down: true, upAt: -Infinity };
      gesture.current = { kind: 'pan', last: p, start: p, menu: true };
      capture();
      return;
    }
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
    // With a finger, placing waits for the release: the finger may still pan or start a pinch.
    const placeOrWait = (place: () => void) => {
      e.preventDefault();
      if (!touch) return place();
      gesture.current = { kind: 'place', start: p, place };
      capture();
    };
    // Simulating: an input written in a receptivity or condition switches when clicked.
    const input = readOnly ? target.closest('[data-input]')?.getAttribute('data-input') : null;
    if (input) {
      placeOrWait(() => toggleInput(input));
      return;
    }
    // Simulating: the value of a numeric variable shown on the diagram is typed in place.
    const value = readOnly ? target.closest('[data-value]') : null;
    if (value) {
      const name = value.getAttribute('data-value')!;
      const at = {
        x: Number(value.getAttribute('data-x')),
        y: Number(value.getAttribute('data-y')),
      };
      placeOrWait(() => {
        const sim = useSim.getState();
        if (sim.on && !sim.replay && !sim.snapshot?.error)
          useInteraction.setState({ valueEdit: { name, at } });
      });
      return;
    }
    // A ghost of the selection: add the action (and type its text), the transition alone, or the
    // transition and step it shows; the new transition or step is selected, so its ghosts are next
    // (Enter would type the receptivity).
    const ghost = target.closest('[data-ghost]')?.getAttribute('data-ghost');
    if (!readOnly && ghost) {
      placeOrWait(() =>
        ghost === 'action'
          ? addActionToSelection()
          : ghost === 'transition'
            ? appendTransition()
            : appendSequence({ editReceptivity: false }),
      );
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
        const keep = e.shiftKey;
        placeOrWait(() => {
          // Back to Select first: changing tools closes the editor the new action opens.
          if (!keep) ui.setTool('select');
          addActionAt(snapPoint(d), stepId);
        });
      }
      return;
    }
    if (!readOnly && (tool === 'step' || tool === 'transition' || tool === 'comment')) {
      if (!hit) {
        const keep = e.shiftKey;
        placeOrWait(() => {
          const at = snapPoint(d);
          // Back to Select first: changing tools closes the editor a new comment opens.
          if (!keep) ui.setTool('select');
          if (tool === 'step') addStepAt(at);
          else if (tool === 'transition') addTransitionAt(at);
          else addCommentAt(at);
        });
      } else if (touch) {
        gesture.current = { kind: 'pan', last: p, start: p };
        capture();
      }
      return;
    }
    if (hit?.kind === 'link' && hit.key) {
      ui.set({ selection: {}, selectedLink: hit.key });
      const link = computeGeometry(g).links.find((l) => l.key === hit.key);
      if (!readOnly && link?.loop) {
        // Loop points: source, below it, the lane's foot, the lane's top, above the target, target.
        const [, below, foot] = link.points;
        const tolerance = (touch ? 16 : 8) / getViewport(gid).zoom;
        const onBottom =
          !!below &&
          !!foot &&
          Math.abs(d.y - below.y) <= tolerance &&
          d.x >= Math.min(below.x, foot.x) - tolerance &&
          d.x <= Math.max(below.x, foot.x) + tolerance;
        gesture.current = onBottom
          ? {
              kind: 'route',
              transitionId: link.transitionId,
              axis: 'y',
              start: d.y,
              value: below.y,
              moved: false,
            }
          : {
              kind: 'route',
              transitionId: link.transitionId,
              axis: 'x',
              start: d.x,
              value: link.loop.sideX,
              moved: false,
            };
        capture();
      }
      return;
    }
    // An AND bar: selected like a link (Del removes its links); dragged, it moves its transition.
    const bar = hit?.kind === 'bar' && hit.key ? parseLinkKey(hit.key) : null;
    if (bar?.kind === 'bar') {
      ui.set({ selection: {}, selectedLink: hit?.key ?? null });
      if (!readOnly) {
        gesture.current = {
          kind: 'press',
          id: bar.transitionId,
          start: p,
          startD: d,
          reselect: false,
          slop: touch ? TOUCH_SLOP : DRAG_THRESHOLD,
          moves: [bar.transitionId],
        };
        capture();
      } else if (touch) {
        gesture.current = { kind: 'pan', last: p, start: p, tap: 'element' };
        capture();
      }
      return;
    }
    if (hit?.id) {
      const wasSelected = !!useUi.getState().selection[hit.id];
      if (additive) ui.select([hit.id], 'toggle');
      else if (!wasSelected) ui.select([hit.id]);
      if (!readOnly) {
        gesture.current = {
          kind: 'press',
          id: hit.id,
          start: p,
          startD: d,
          reselect: wasSelected && !additive,
          slop: touch ? TOUCH_SLOP : DRAG_THRESHOLD,
        };
        capture();
      } else if (touch) {
        gesture.current = { kind: 'pan', last: p, start: p, tap: 'element' };
        capture();
      }
      return;
    }
    if (touch) {
      // A finger on the empty canvas pans; held still, it draws a selection rectangle instead.
      gesture.current = { kind: 'pan', last: p, start: p, tap: 'empty' };
      capture();
      window.clearTimeout(longPress.current);
      longPress.current = window.setTimeout(() => {
        const g1 = gesture.current;
        if (g1.kind !== 'pan' || g1.tap !== 'empty' || g1.moved) return;
        ui.clearSelection();
        gesture.current = { kind: 'marquee', startD: d, additive: false };
        useInteraction.setState({ marquee: rectFrom(d, d) });
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
      return;
    }
    if (!additive) ui.clearSelection();
    gesture.current = { kind: 'marquee', startD: d, additive };
    capture();
  };

  /**
   * With a placing tool and a mouse or pen: where a click would place the element (the overlay
   * draws its ghost there), or null over an element where a click places nothing.
   */
  const updateCursor = (e: ReactPointerEvent<SVGSVGElement>, hit: ReturnType<typeof elementAt>) => {
    const tool = useUi.getState().tool;
    const g = gid ? getProject().grafcets[gid] : undefined;
    let next: { at: Point; stepId: Id | null } | null = null;
    if (!readOnly && g && e.pointerType !== 'touch' && PLACING.has(tool)) {
      const stepId =
        tool !== 'action' || !hit?.id
          ? null
          : hit.kind === 'step'
            ? hit.id
            : hit.kind === 'action'
              ? (g.actions[hit.id]?.stepId ?? null)
              : null;
      if (!hit || stepId) next = { at: snapPoint(toDiagram(local(e))), stepId };
    }
    const cur = useInteraction.getState().cursor;
    if (cur?.stepId !== next?.stepId || cur?.at.x !== next?.at.x || cur?.at.y !== next?.at.y)
      useInteraction.setState({ cursor: next });
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!gid) return;
    const g0 = gesture.current;
    const p = local(e);
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId))
      touches.current.set(e.pointerId, p);
    switch (g0.kind) {
      case 'pinch': {
        if (touches.current.size < 2) return;
        const next = pinchOf(touches.current);
        panBy(gid, next.mid.x - g0.mid.x, next.mid.y - g0.mid.y);
        if (g0.dist > 0 && next.dist > 0) zoomAt(gid, next.dist / g0.dist, next.mid);
        gesture.current = next;
        return;
      }
      case 'place':
        if (Math.hypot(p.x - g0.start.x, p.y - g0.start.y) < TOUCH_SLOP) return;
        gesture.current = { kind: 'pan', last: p };
        useInteraction.setState({ panning: true });
        return;
      case 'idle': {
        const t = e.target as Element;
        const handle = t.closest('[data-handle]');
        const hit = elementAt(t);
        const id =
          handle?.getAttribute('data-id') ??
          (hit && (hit.kind === 'step' || hit.kind === 'transition') ? hit.id : null);
        if (useInteraction.getState().hover !== id) useInteraction.setState({ hover: id });
        updateCursor(e, hit);
        return;
      }
      case 'pan':
        if (g0.start && !g0.moved) {
          const slop = g0.menu ? DRAG_THRESHOLD : TOUCH_SLOP;
          if (Math.hypot(p.x - g0.start.x, p.y - g0.start.y) < slop) return;
          g0.moved = true;
          window.clearTimeout(longPress.current);
          useInteraction.setState({ panning: true });
        }
        panBy(gid, p.x - g0.last.x, p.y - g0.last.y);
        g0.last = p;
        return;
      case 'press': {
        if (Math.hypot(p.x - g0.start.x, p.y - g0.start.y) < g0.slop) return;
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
          gesture.current = {
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
          onPointerMove(e);
          return;
        }
        // Attached actions follow their step.
        const ids = selected.filter(
          (id) =>
            g &&
            (g.steps[id] || g.transitions[id] || g.comments[id] || g.actions[id]?.stepId === null),
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
        const delta = snapPoint({ x: d.x - g0.startD.x, y: d.y - g0.startD.y });
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
          const target = g ? actionDropAt(g, g0.action.id, d) : null;
          const cur = useInteraction.getState().dropTarget;
          if (cur?.stepId !== target?.stepId || cur?.index !== target?.index)
            useInteraction.setState({ dropTarget: target });
        }
        return;
      }
      case 'marquee':
        useInteraction.setState({ marquee: rectFrom(g0.startD, toDiagram(p)) });
        return;
      case 'route': {
        const d = toDiagram(p);
        const delta = g0.axis === 'x' ? d.x - g0.start : d.y - g0.start;
        if (!g0.moved) {
          if (Math.abs(delta) * getViewport(gid).zoom < DRAG_THRESHOLD) return;
          g0.moved = true;
          doc.begin('history.route');
        }
        const value = snap(g0.value + delta);
        const key = g0.axis === 'x' ? 'sideX' : 'dropY';
        doc.update((proj) => {
          const tr = proj.grafcets[gid]?.transitions[g0.transitionId];
          if (tr && tr.routing?.[key] !== value) tr.routing = { ...tr.routing, [key]: value };
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

  /** A finger lifted without moving: a second tap close in time and place is a double-tap. */
  const tapped = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = local(e);
    const prev = lastTap.current;
    if (
      prev &&
      e.timeStamp - prev.time < DOUBLE_TAP_MS &&
      Math.hypot(p.x - prev.p.x, p.y - prev.p.y) < DOUBLE_TAP_DISTANCE
    ) {
      lastTap.current = null;
      doubleAt(e.clientX, e.clientY, p);
    } else lastTap.current = { time: e.timeStamp, p };
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g0 = gesture.current;
    const touch = e.pointerType === 'touch';
    if (touch) touches.current.delete(e.pointerId);
    if (e.button === 2) rightButton.current = { down: false, upAt: e.timeStamp };
    window.clearTimeout(longPress.current);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (g0.kind === 'pinch') {
      // One finger lifted: the other one keeps panning.
      const rest = [...touches.current.values()][0];
      gesture.current = rest ? { kind: 'pan', last: rest, moved: true } : { kind: 'idle' };
      if (!rest) useInteraction.setState({ panning: false });
      return;
    }
    gesture.current = { kind: 'idle' };
    switch (g0.kind) {
      case 'place':
        g0.place();
        break;
      case 'press':
        if (g0.reselect) ui.select([g0.id]);
        if (touch) tapped(e);
        break;
      case 'move': {
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
          ...Object.keys(g.actions),
        ].filter((id) => {
          const b = elementBounds(g, geom, id);
          return b && rectsIntersect(b, r);
        });
        // A step brings all its actions, also those reaching beyond the box.
        const boxed = new Set(ids);
        for (const a of Object.values(g.actions))
          if (a.stepId !== null && boxed.has(a.stepId)) boxed.add(a.id);
        ui.select([...boxed], g0.additive ? 'add' : 'replace');
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
        if (g0.tap && !g0.moved) {
          if (g0.tap === 'empty') ui.clearSelection();
          tapped(e);
        }
        if (g0.menu && !g0.moved) openMenu(e.clientX, e.clientY);
        break;
      case 'route':
        if (g0.moved) doc.commit();
        break;
      case 'idle':
        break;
    }
  };

  /** Double-click or double-tap: open a sub-grafcet, edit an element, or add a step. */
  const doubleAt = (clientX: number, clientY: number, p: Point) => {
    if (!gid) return;
    // Hit-test by position: after pointer capture the event targets the <svg> itself.
    const hit = elementAt(document.elementFromPoint(clientX, clientY));
    // Macro-steps and enclosing steps open their sub-grafcet (F2 still edits the number).
    if (hit?.kind === 'step' && hit.id && openChild(hit.id)) return;
    if (readOnly) return;
    // A loop link dragged elsewhere goes back to its automatic route.
    if (hit?.kind === 'link' && hit.key) {
      const tid = hit.key.split(':')[0]!;
      if (getProject().grafcets[gid]?.transitions[tid]?.routing)
        editActive('history.route', (g) => {
          const t = g.transitions[tid];
          if (t) delete t.routing;
        });
      return;
    }
    if (hit?.id && hit.field === 'jump') {
      ui.select([hit.id]);
      ui.edit({ id: hit.id, field: 'jump' });
      return;
    }
    if (hit?.id && hit.kind !== 'link') {
      ui.select([hit.id]);
      editSelection();
      return;
    }
    if (!hit && useUi.getState().tool === 'select') addStepAt(snapPoint(toDiagram(p)));
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Fingers are handled by tapped(): the browser's own double-tap event would act twice.
    if (lastPointer.current === 'touch') return;
    doubleAt(e.clientX, e.clientY, local(e));
  };

  /**
   * Right-click (released without panning; before the context menu opens): select what is under
   * the pointer, as a click would (keeping a selection it is part of), and remember where for "Add
   * step here". The menu key opens it on the canvas itself: the selection stays.
   */
  const onContextMenu = (e: React.MouseEvent) => {
    if (!gid || readOnly) return;
    cancelGesture();
    const target = e.target as Element;
    if (target !== containerRef.current) {
      const hit = elementAt(target);
      if ((hit?.kind === 'link' || hit?.kind === 'bar') && hit.key)
        ui.set({ selection: {}, selectedLink: hit.key });
      else if (hit?.id && hit.kind !== 'link') {
        if (!useUi.getState().selection[hit.id]) ui.select([hit.id]);
      } else ui.clearSelection();
    }
    useInteraction.setState({ menuAt: snapPoint(toDiagram(local(e))) });
  };

  const onPointerCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId);
    rightButton.current = { down: false, upAt: e.timeStamp };
    cancelGesture();
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
    if (useInteraction.getState().cursor) useInteraction.setState({ cursor: null });
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
    onDoubleClick,
    onKeyDown,
    onKeyUp,
    onPointerLeave,
  };
}
