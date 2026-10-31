import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { snap } from '@/core/layout/geometry';
import type { Id, Point } from '@/core/model/types';
import { usePrefs } from '@/ui/prefs';
import { editActive, editSelection, addStepAt } from '../commands/edit';
import { doc, getProject } from '../store/document';
import { ui, useUi } from '../store/uiStore';
import { useInteraction } from './interactionStore';
import { openChild } from '../commands/hierarchy';
import { cancelPending, completeLoop } from '../commands/structure';
import { getViewport, panBy, screenToDiagram } from './viewport';
import {
  barTransition,
  beginMove,
  dropSelection,
  moveSelection,
  pressBar,
  pressElement,
} from './gestures/drag';
import { createFrameThrottle } from './gestures/frame';
import {
  DRAG_THRESHOLD,
  TOUCH_SLOP,
  elementAt,
  type Gesture,
  type GestureContext,
} from './gestures/gesture';
import { endLink, moveLink, startLink } from './gestures/link';
import { endMarquee, moveMarquee, startMarquee } from './gestures/marquee';
import { useMenuReplay } from './gestures/menu';
import { placingPress, updateCursor } from './gestures/place';
import { endRoute, moveRoute, pressLink } from './gestures/route';
import { endPinch, isDoubleTap, movePinch, panOrLongPress, pinchOf } from './gestures/touch';
import { useWheel } from './gestures/wheel';

/**
 * Pointer/wheel handling for the canvas: select, move, marquee, link drag, pan, zoom, place. The
 * gestures are in ./gestures; this hook tells them apart on press and passes moves and releases
 * on to the one in progress.
 */
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
  const [frame] = useState(createFrameThrottle);

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

  const ctx: GestureContext = {
    gesture,
    readOnly,
    toDiagram,
    snapPoint,
    nextFrame: frame.next,
  };

  const cancelGesture = useCallback(() => {
    window.clearTimeout(longPress.current);
    frame.cancel();
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
  }, [frame]);

  useWheel(containerRef, gid, local);
  const { rightButton, openMenu } = useMenuReplay(containerRef);

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
      startLink(ctx, g, handle, d, capture);
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
    const placing = placingPress(ctx, g, target, hit, tool, d, e.shiftKey);
    if (placing && 'place' in placing) {
      e.preventDefault();
      // With a finger, placing waits for the release: the finger may still pan or start a pinch.
      if (!touch) return placing.place();
      gesture.current = { kind: 'place', start: p, place: placing.place };
      capture();
      return;
    }
    if (placing) {
      if (placing.panWithFinger && touch) {
        gesture.current = { kind: 'pan', last: p, start: p };
        capture();
      }
      return;
    }
    if (hit?.kind === 'link' && hit.key) {
      pressLink(ctx, gid, g, hit.key, d, touch, capture);
      return;
    }
    const bar = hit?.kind === 'bar' ? barTransition(hit.key) : null;
    if (bar) {
      pressBar(ctx, hit?.key ?? null, bar, p, d, touch, capture);
      return;
    }
    if (hit?.id) {
      pressElement(ctx, hit.id, p, d, touch, additive, capture);
      return;
    }
    if (touch) {
      // A finger on the empty canvas pans; held still, it draws a selection rectangle instead.
      panOrLongPress(gesture, longPress, p, d, capture);
      return;
    }
    startMarquee(ctx, d, additive, capture);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!gid) return;
    const g0 = gesture.current;
    const p = local(e);
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId))
      touches.current.set(e.pointerId, p);
    switch (g0.kind) {
      case 'pinch':
        movePinch(gesture, gid, g0, touches.current);
        return;
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
        updateCursor(
          readOnly,
          getProject().grafcets[gid],
          useUi.getState().tool,
          e.pointerType,
          hit,
          () => snapPoint(toDiagram(local(e))),
        );
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
      case 'press':
        if (Math.hypot(p.x - g0.start.x, p.y - g0.start.y) < g0.slop) return;
        if (beginMove(ctx, gid, g0)) onPointerMove(e);
        return;
      case 'move':
        moveSelection(ctx, gid, g0, toDiagram(p));
        return;
      case 'marquee':
        moveMarquee(g0, toDiagram(p));
        return;
      case 'route':
        moveRoute(ctx, gid, g0, toDiagram(p));
        return;
      case 'link':
        moveLink(gid, g0, toDiagram(p), e);
        return;
    }
  };

  /** A finger lifted without moving: a second tap close in time and place is a double-tap. */
  const tapped = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = local(e);
    if (isDoubleTap(lastTap, e.timeStamp, p)) doubleAt(e.clientX, e.clientY, p);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    frame.settle();
    const g0 = gesture.current;
    const touch = e.pointerType === 'touch';
    if (touch) touches.current.delete(e.pointerId);
    if (e.button === 2) rightButton.current = { down: false, upAt: e.timeStamp };
    window.clearTimeout(longPress.current);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (g0.kind === 'pinch') {
      endPinch(gesture, touches.current);
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
      case 'move':
        dropSelection(gid, g0);
        break;
      case 'marquee':
        endMarquee(gid, g0);
        break;
      case 'link':
        endLink(ctx, g0, e);
        break;
      case 'pan':
        useInteraction.setState({ panning: false });
        if (g0.tap && !g0.moved) {
          if (g0.tap === 'empty') ui.clearSelection();
          tapped(e);
        }
        if (g0.menu && !g0.moved) openMenu(e.clientX, e.clientY);
        break;
      case 'route':
        endRoute(g0);
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
    // A jump: type its step again. The arrow stays selected, not its transition.
    if (hit?.id && hit.field === 'jump') {
      if (hit.key) ui.set({ selection: {}, selectedLink: hit.key });
      ui.edit({ id: hit.id, field: 'jump' });
      return;
    }
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
