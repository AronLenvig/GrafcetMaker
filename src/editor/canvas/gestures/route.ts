import { computeGeometry, snap } from '@/core/layout/geometry';
import type { Grafcet, Id, Point } from '@/core/model/types';
import { doc } from '../../store/document';
import { ui } from '../../store/uiStore';
import { getViewport } from '../viewport';
import { DRAG_THRESHOLD, type GestureContext, type GestureOf } from './gesture';

/**
 * A press on a link selects it. On a loop (unless locked), it starts dragging the loop's bottom
 * line up and down when pressed there, its side lane sideways otherwise.
 */
export function pressLink(
  ctx: GestureContext,
  gid: Id,
  g: Grafcet,
  key: string,
  d: Point,
  touch: boolean,
  capture: () => void,
): void {
  ui.set({ selection: {}, selectedLink: key });
  const link = computeGeometry(g).links.find((l) => l.key === key);
  if (ctx.readOnly || !link?.loop) return;
  // Loop points: source, below it, the lane's foot, the lane's top, above the target, target.
  const [, below, foot] = link.points;
  const tolerance = (touch ? 16 : 8) / getViewport(gid).zoom;
  const onBottom =
    !!below &&
    !!foot &&
    Math.abs(d.y - below.y) <= tolerance &&
    d.x >= Math.min(below.x, foot.x) - tolerance &&
    d.x <= Math.max(below.x, foot.x) + tolerance;
  ctx.gesture.current = onBottom
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

/** The dragged line follows the pointer on its axis, snapped; one history entry per drag. */
export function moveRoute(ctx: GestureContext, gid: Id, g0: GestureOf<'route'>, d: Point): void {
  const delta = g0.axis === 'x' ? d.x - g0.start : d.y - g0.start;
  if (!g0.moved) {
    if (Math.abs(delta) * getViewport(gid).zoom < DRAG_THRESHOLD) return;
    g0.moved = true;
    doc.begin('history.route');
  }
  const value = snap(g0.value + delta);
  const key = g0.axis === 'x' ? 'sideX' : 'dropY';
  ctx.nextFrame(() => {
    if (ctx.gesture.current !== g0) return;
    doc.update((proj) => {
      const tr = proj.grafcets[gid]?.transitions[g0.transitionId];
      if (tr && tr.routing?.[key] !== value) tr.routing = { ...tr.routing, [key]: value };
    });
  });
}

export function endRoute(g0: GestureOf<'route'>): void {
  if (g0.moved) doc.commit();
}
