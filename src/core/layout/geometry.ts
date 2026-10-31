/**
 * The geometry of a grafcet as drawn: every link, bar, stub and jump (computeGeometry) and the
 * bounds of its elements. Dimensions are in constants.ts, element shapes in shapes.ts and link
 * routing in routing.ts, all re-exported here.
 */
import { indexGrafcet, type GrafcetIndex } from '../model/graph';
import type { Grafcet, Id, Point, Transition } from '../model/types';
import {
  BAR_OFFSET,
  BAR_OVERHANG,
  DOUBLE_BAR_GAP,
  JUMP_LENGTH,
  LABEL_FONT_SIZE,
  LOOP_DROP,
  OR_LINE_OFFSET,
  STEP_HALF,
  STUB,
} from './constants';
import {
  actionDecor,
  commentRect,
  expressionWidth,
  flowOf,
  freeActionBox,
  isJump,
  jumpLabelAnchor,
  jumpText,
  layoutActions,
  stepLabelAnchor,
  stepRect,
  textWidth,
  transitionBar,
  transitionHitRect,
  transitionTextAnchor,
  type ActionBox,
  type Rect,
} from './shapes';
import {
  addDownLink,
  barKey,
  leftwardIn,
  leftwardOut,
  linkKey,
  routeLoops,
  type ArrowDir,
  type BarGeom,
  type DownLinks,
  type LinkGeom,
  type PendingUpward,
  type StubGeom,
} from './routing';

export * from './constants';
export {
  ACTION_MARK_INSET,
  ACTION_MARK_RISE,
  actionDecor,
  actionDropAt,
  actionWidth,
  commentRect,
  expressionWidth,
  flowOf,
  freeActionBox,
  isJump,
  jumpLabelAnchor,
  jumpText,
  layoutActions,
  nextStepPosition,
  rectsIntersect,
  snap,
  stepLabelAnchor,
  stepRect,
  textWidth,
  transitionBar,
  transitionBox,
  transitionHitRect,
  transitionNumberAnchor,
  transitionTextAnchor,
  type ActionBox,
  type ActionDecor,
  type ActionDrop,
  type Rect,
} from './shapes';
export {
  arrowPath,
  barKey,
  linkArrow,
  linkKey,
  parseLinkKey,
  type ArrowDir,
  type BarGeom,
  type LinkGeom,
  type LinkRef,
  type StubGeom,
} from './routing';

/**
 * A jump (IEC 60848 interrupted link): an arrow from the transition marked with the step it leads
 * to, and, above a step reached only by jumps, an arrow into it marked with the steps they come
 * from.
 */
export interface JumpGeom {
  /** At the transition: the key of its link to the step (selected and deleted as that link). */
  key: string;
  /** The transition (side 'from') or the step reached (side 'to'). */
  elementId: Id;
  side: 'from' | 'to';
  points: [Point, Point];
  arrow: Point & { dir: ArrowDir };
  label: { text: string; x: number; y: number; anchor: 'start' | 'end' } | null;
}

export interface GrafcetGeometry {
  index: GrafcetIndex;
  links: LinkGeom[];
  bars: BarGeom[];
  stubs: StubGeom[];
  jumps: JumpGeom[];
  /** Actions not attached to any step. */
  freeActions: ActionBox[];
}

const joinY = (t: Transition) => t.position.y - BAR_OFFSET;
const splitY = (t: Transition) => t.position.y + BAR_OFFSET;

/** Step outputs: step → transition (upstream side of the transition). Loops wait in `upward`. */
function routeStepOutputs(
  g: Grafcet,
  index: GrafcetIndex,
  links: LinkGeom[],
  upward: PendingUpward[],
  downLinks: DownLinks,
): void {
  for (const s of Object.values(g.steps)) {
    const outs = index.outgoing.get(s.id);
    if (!outs) continue;
    const start = { x: s.position.x, y: s.position.y + STEP_HALF };
    const divY = start.y + OR_LINE_OFFSET;
    for (const t of outs) {
      const end =
        t.from.length > 1
          ? { x: s.position.x, y: joinY(t) - DOUBLE_BAR_GAP / 2 }
          : { x: t.position.x, y: t.position.y };
      const link: LinkGeom = {
        key: linkKey(t.id, 'in', s.id),
        transitionId: t.id,
        stepId: s.id,
        side: 'in',
        points: [],
      };
      links.push(link);
      if (flowOf(t) !== 'left' && end.y <= divY) {
        upward.push({
          link,
          start,
          dropY: divY,
          junctionY: end.y - OR_LINE_OFFSET,
          end,
          target: t.id,
          source: s.id,
          owner: t.id,
          override: t.routing?.sideX,
          dropOverride: t.routing?.dropY,
          laneX: 0,
        });
        continue;
      }
      addDownLink(downLinks, s.id, t.id);
      if (flowOf(t) === 'left') {
        Object.assign(link, leftwardIn(start, t, divY));
      } else if (outs.length === 1 && end.x === start.x) {
        link.points = [start, end];
      } else {
        link.points = [start, { x: start.x, y: divY }, { x: end.x, y: divY }, end];
      }
    }
  }
}

/** Step inputs: transition → step (downstream side of the transition). Loops wait in `upward`. */
function routeStepInputs(
  g: Grafcet,
  index: GrafcetIndex,
  links: LinkGeom[],
  upward: PendingUpward[],
  downLinks: DownLinks,
): void {
  for (const s of Object.values(g.steps)) {
    const ins = index.incoming.get(s.id)?.filter((t) => !isJump(t));
    if (!ins?.length) continue;
    const end = { x: s.position.x, y: s.position.y - STEP_HALF };
    const convY = end.y - OR_LINE_OFFSET;
    for (const t of ins) {
      const start =
        t.to.length > 1
          ? { x: s.position.x, y: splitY(t) + DOUBLE_BAR_GAP / 2 }
          : { x: t.position.x, y: t.position.y };
      const link: LinkGeom = {
        key: linkKey(t.id, 'out', s.id),
        transitionId: t.id,
        stepId: s.id,
        side: 'out',
        points: [],
      };
      links.push(link);
      if (flowOf(t) !== 'left' && start.y >= convY) {
        upward.push({
          link,
          start,
          dropY: start.y + (t.to.length > 1 ? OR_LINE_OFFSET : LOOP_DROP),
          junctionY: convY,
          end,
          target: s.id,
          source: t.id,
          owner: t.id,
          override: t.routing?.sideX,
          dropOverride: t.routing?.dropY,
          laneX: 0,
        });
        continue;
      }
      addDownLink(downLinks, t.id, s.id);
      if (flowOf(t) === 'left') {
        Object.assign(link, leftwardOut(t, end, convY));
      } else if (ins.length === 1 && start.x === end.x) {
        link.points = [start, end];
      } else {
        link.points = [start, { x: start.x, y: convY }, { x: end.x, y: convY }, end];
      }
    }
  }
}

/** AND double bars and source/sink stubs. */
function barsAndStubs(g: Grafcet): { bars: BarGeom[]; stubs: StubGeom[] } {
  const bars: BarGeom[] = [];
  const stubs: StubGeom[] = [];
  for (const t of Object.values(g.transitions)) {
    const tp = t.position;
    if (flowOf(t) === 'left') {
      // Right to left: a source is fed from the right, a sink leads off to the left.
      if (!t.from.length)
        stubs.push({
          key: `${t.id}:source`,
          transitionId: t.id,
          kind: 'source',
          points: [{ x: tp.x + STUB, y: tp.y }, { ...tp }],
        });
      if (!t.to.length)
        stubs.push({
          key: `${t.id}:sink`,
          transitionId: t.id,
          kind: 'sink',
          points: [{ ...tp }, { x: tp.x - STUB, y: tp.y }],
        });
      continue;
    }
    if (t.from.length > 1) {
      const xs = [tp.x, ...t.from.map((id) => g.steps[id]?.position.x ?? tp.x)];
      const y = joinY(t);
      bars.push({
        key: barKey(t.id, 'join'),
        transitionId: t.id,
        kind: 'join',
        x1: Math.min(...xs) - BAR_OVERHANG,
        x2: Math.max(...xs) + BAR_OVERHANG,
        y,
        stem: [
          { x: tp.x, y: y + DOUBLE_BAR_GAP / 2 },
          { x: tp.x, y: tp.y },
        ],
      });
    } else if (t.from.length === 0) {
      stubs.push({
        key: `${t.id}:source`,
        transitionId: t.id,
        kind: 'source',
        points: [{ x: tp.x, y: tp.y - STUB }, { ...tp }],
      });
    }
    if (t.to.length > 1) {
      const xs = [tp.x, ...t.to.map((id) => g.steps[id]?.position.x ?? tp.x)];
      const y = splitY(t);
      bars.push({
        key: barKey(t.id, 'split'),
        transitionId: t.id,
        kind: 'split',
        x1: Math.min(...xs) - BAR_OVERHANG,
        x2: Math.max(...xs) + BAR_OVERHANG,
        y,
        stem: [{ ...tp }, { x: tp.x, y: y - DOUBLE_BAR_GAP / 2 }],
      });
    } else if (t.to.length === 0) {
      stubs.push({
        key: `${t.id}:sink`,
        transitionId: t.id,
        kind: 'sink',
        points: [{ ...tp }, { x: tp.x, y: tp.y + STUB }],
      });
    }
  }
  return { bars, stubs };
}

/**
 * Orthogonal routing of every link of a grafcet. Downward links go straight or with one elbow on
 * the OR line; upward links (loops) drop below their source (far enough not to cross their own
 * sequence), run up a side lane left of that sequence and enter their target from above, with an
 * arrow on the upward segment.
 */
export function computeGeometry(
  g: Grafcet,
  index: GrafcetIndex = indexGrafcet(g),
): GrafcetGeometry {
  const links: LinkGeom[] = [];
  const upward: PendingUpward[] = [];
  const downLinks: DownLinks = { down: new Map(), up: new Map() };
  routeStepOutputs(g, index, links, upward, downLinks);
  routeStepInputs(g, index, links, upward, downLinks);
  const { bars, stubs } = barsAndStubs(g);
  const jumps = jumpGeometry(g, index);
  routeLoops(g, index, upward, { links, bars, stubs }, downLinks);
  const freeActions = Object.values(g.actions)
    .filter((a) => a.stepId === null)
    .map(freeActionBox);
  return { index, links, bars, stubs, jumps, freeActions };
}

function jumpGeometry(g: Grafcet, index: GrafcetIndex): JumpGeom[] {
  const jumps: JumpGeom[] = [];
  for (const t of Object.values(g.transitions)) {
    const target = isJump(t) ? g.steps[t.to[0]!] : undefined;
    if (!target) continue;
    const { x, y } = t.position;
    const left = flowOf(t) === 'left';
    const tip = left ? { x: x - JUMP_LENGTH, y } : { x, y: y + JUMP_LENGTH };
    const label = jumpLabelAnchor(t);
    jumps.push({
      key: linkKey(t.id, 'out', target.id),
      elementId: t.id,
      side: 'from',
      points: [{ x, y }, tip],
      arrow: left ? { x: tip.x + 6, y, dir: 'left' } : { x, y: tip.y - 6, dir: 'down' },
      label: { text: jumpText(target.number), ...label },
    });
  }
  // A step reached only by jumps shows where they come from.
  for (const s of Object.values(g.steps)) {
    const ins = index.incoming.get(s.id);
    if (!ins?.length || !ins.every(isJump)) continue;
    const numbers = [
      ...new Set(ins.flatMap((t) => t.from.flatMap((id) => g.steps[id]?.number ?? []))),
    ].sort((a, b) => a - b);
    const { x } = s.position;
    const top = s.position.y - STEP_HALF;
    jumps.push({
      key: `${s.id}:jumpIn`,
      elementId: s.id,
      side: 'to',
      points: [
        { x, y: top - JUMP_LENGTH },
        { x, y: top },
      ],
      arrow: { x, y: top - 6, dir: 'down' },
      label: numbers.length
        ? {
            text: numbers.map(jumpText).join(', '),
            x: x + 8,
            y: top - JUMP_LENGTH + 6,
            anchor: 'start',
          }
        : null,
    });
  }
  return jumps;
}

// ---------------------------------------------------------------------------------------------
// Bounds
/** The box of one action, attached or not. */
export function actionBoxOf(g: Grafcet, geom: GrafcetGeometry, id: Id): ActionBox | null {
  const a = g.actions[id];
  if (!a) return null;
  if (a.stepId === null) return freeActionBox(a);
  const step = g.steps[a.stepId];
  if (!step) return null;
  return (
    layoutActions(step, geom.index.actions.get(step.id) ?? []).find((b) => b.id === id) ?? null
  );
}

function unionInto(acc: { x1: number; y1: number; x2: number; y2: number }, r: Rect): void {
  acc.x1 = Math.min(acc.x1, r.x);
  acc.y1 = Math.min(acc.y1, r.y);
  acc.x2 = Math.max(acc.x2, r.x + r.width);
  acc.y2 = Math.max(acc.y2, r.y + r.height);
}

/** Bounding box of everything drawn for a grafcet (optionally restricted to some element ids). */
export function grafcetBounds(
  g: Grafcet,
  geom: GrafcetGeometry,
  only?: ReadonlySet<Id>,
): Rect | null {
  const acc = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  const take = (id: Id) => !only || only.has(id);
  for (const s of Object.values(g.steps)) {
    if (!take(s.id)) continue;
    unionInto(acc, stepRect(s));
    if (s.label) {
      const a = stepLabelAnchor(s);
      unionInto(acc, {
        x: a.x - textWidth(s.label, LABEL_FONT_SIZE),
        y: a.y - 8,
        width: 1,
        height: 16,
      });
    }
    const boxes = layoutActions(s, geom.index.actions.get(s.id) ?? []);
    for (const b of boxes) actionInto(b);
  }
  for (const b of geom.freeActions) if (take(b.id)) actionInto(b);
  function actionInto(b: ActionBox): void {
    const below = g.actions[b.id]!.kind === 'storedOnDeactivation' ? 20 : 0;
    unionInto(acc, { ...b, y: b.y - 20, height: b.height + 20 + below });
    const text = actionDecor(g.actions[b.id]!, b).text;
    if (text) {
      const w = expressionWidth(text.source);
      unionInto(acc, {
        x: text.anchor === 'end' ? text.x - w : text.x,
        y: text.y - 8,
        width: w,
        height: 16,
      });
    }
  }
  for (const t of Object.values(g.transitions)) {
    if (!take(t.id)) continue;
    const a = transitionTextAnchor(t);
    const bar = transitionBar(t);
    unionInto(acc, { x: bar.x - 4, y: bar.y - 6.5, width: bar.width + 8, height: bar.height + 13 });
    unionInto(acc, { x: a.x, y: a.y - 10, width: expressionWidth(t.receptivity), height: 20 });
  }
  for (const c of Object.values(g.comments)) if (take(c.id)) unionInto(acc, commentRect(c));
  for (const l of geom.links) {
    if (only && !(only.has(l.stepId) && only.has(l.transitionId))) continue;
    for (const p of l.points) unionInto(acc, { x: p.x, y: p.y, width: 0, height: 0 });
  }
  for (const j of geom.jumps) {
    if (!take(j.elementId)) continue;
    for (const p of j.points) unionInto(acc, { x: p.x - 5, y: p.y, width: 10, height: 0 });
    if (j.label) {
      const w = textWidth(j.label.text);
      unionInto(acc, {
        x: j.label.anchor === 'end' ? j.label.x - w : j.label.x,
        y: j.label.y - 8,
        width: w,
        height: 16,
      });
    }
  }
  if (acc.x1 === Infinity) return null;
  return { x: acc.x1, y: acc.y1, width: acc.x2 - acc.x1, height: acc.y2 - acc.y1 };
}

/** Selection/hit bounds of one element (step, transition, action or comment). */
export function elementBounds(g: Grafcet, geom: GrafcetGeometry, id: Id): Rect | null {
  const s = g.steps[id];
  if (s) return stepRect(s);
  const t = g.transitions[id];
  if (t) return transitionHitRect(t);
  const c = g.comments[id];
  if (c) return commentRect(c);
  const a = g.actions[id];
  if (a) return actionBoxOf(g, geom, id);
  return null;
}

/**
 * Link ports: where links leave (out, bottom) or enter (in, top) a step or transition; for a
 * transition flowing right to left, in on the right and out on the left.
 */
export function portPosition(g: Grafcet, id: Id, port: 'in' | 'out'): Point | null {
  const s = g.steps[id];
  if (s) return { x: s.position.x, y: s.position.y + (port === 'in' ? -STEP_HALF : STEP_HALF) };
  const t = g.transitions[id];
  if (t && flowOf(t) === 'left')
    return { x: t.position.x + (port === 'in' ? 10 : -10), y: t.position.y };
  if (t) return { x: t.position.x, y: t.position.y + (port === 'in' ? -10 : 10) };
  return null;
}
