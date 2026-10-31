import { portPosition } from '@/core/layout/geometry';
import * as ops from '@/core/model/ops';
import type { Grafcet, Id, Point } from '@/core/model/types';
import { editActive } from '../../commands/edit';
import { getProject } from '../../store/document';
import { ui } from '../../store/uiStore';
import { useInteraction, type LinkDrag } from '../interactionStore';
import { elementAt, type GestureContext, type GestureOf } from './gesture';

/** A press on a link handle of a step or transition: a link is dragged from that port. */
export function startLink(
  ctx: GestureContext,
  g: Grafcet,
  handle: Element,
  d: Point,
  capture: () => void,
): void {
  const id = handle.getAttribute('data-id')!;
  const port = handle.getAttribute('data-handle') as 'in' | 'out';
  const origin = portPosition(g, id, port);
  if (!origin) return;
  const drag: LinkDrag = {
    from: id,
    fromKind: g.steps[id] ? 'step' : 'transition',
    port,
    origin,
    current: d,
    target: null,
  };
  ctx.gesture.current = { kind: 'link', drag };
  useInteraction.setState({ link: drag });
  capture();
}

/** The link follows the pointer; only a valid target is highlighted (step → transition → step). */
export function moveLink(
  gid: Id,
  g0: GestureOf<'link'>,
  d: Point,
  e: { clientX: number; clientY: number },
): void {
  const g = getProject().grafcets[gid];
  const hit = elementAt(document.elementFromPoint(e.clientX, e.clientY));
  let target: Id | null = null;
  if (g && hit?.id) {
    const wanted = g0.drag.fromKind === 'step' ? 'transition' : 'step';
    if (hit.kind === wanted && hit.id !== g0.drag.from) target = hit.id;
  }
  g0.drag = { ...g0.drag, current: d, target };
  useInteraction.setState({ link: g0.drag });
}

/**
 * Released on a valid target: the link is made. Released on the empty canvas: a new transition
 * (from a step) or step (from a transition) is made there and linked. Elsewhere: nothing.
 */
export function endLink(
  ctx: GestureContext,
  g0: GestureOf<'link'>,
  e: { clientX: number; clientY: number },
): void {
  useInteraction.setState({ link: null });
  const over = elementAt(document.elementFromPoint(e.clientX, e.clientY));
  finishLink(ctx, g0.drag, !!over);
}

function finishLink(ctx: GestureContext, drag: LinkDrag, overElement: boolean): void {
  if (drag.target) {
    const [a, b] = drag.port === 'out' ? [drag.from, drag.target] : [drag.target, drag.from];
    editActive('history.link', (g) => void ops.connect(g, a, b));
    return;
  }
  if (overElement) return;
  const at = ctx.snapPoint(drag.current);
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
}
