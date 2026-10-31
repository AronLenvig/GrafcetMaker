import { computeGeometry, elementBounds, rectsIntersect } from '@/core/layout/geometry';
import type { Id, Point } from '@/core/model/types';
import { getProject } from '../../store/document';
import { ui } from '../../store/uiStore';
import { useInteraction } from '../interactionStore';
import { rectFrom, type GestureContext, type GestureOf } from './gesture';

/** A press on the empty canvas: a selection rectangle, adding to the selection with a modifier. */
export function startMarquee(
  ctx: GestureContext,
  d: Point,
  additive: boolean,
  capture: () => void,
): void {
  if (!additive) ui.clearSelection();
  ctx.gesture.current = { kind: 'marquee', startD: d, additive };
  capture();
}

export function moveMarquee(g0: GestureOf<'marquee'>, d: Point): void {
  useInteraction.setState({ marquee: rectFrom(g0.startD, d) });
}

/** Selects what the rectangle touches; a step brings all its actions. */
export function endMarquee(gid: Id | null, g0: GestureOf<'marquee'>): void {
  const r = useInteraction.getState().marquee;
  useInteraction.setState({ marquee: null });
  const g = gid ? getProject().grafcets[gid] : undefined;
  if (!r || !g || (r.width < 2 && r.height < 2)) return;
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
}
