import { cachedBool } from '../expr/cache';
import { formatTextbook } from '../expr/format';
import { indexGrafcet, type GrafcetIndex } from '../model/graph';
import type { Action, Comment, Grafcet, Id, Point, Step, Transition } from '../model/types';

// Diagram dimensions (grid 10). Positions are element centers unless noted.
export const GRID = 10;
export const STEP_SIZE = 40;
export const STEP_HALF = STEP_SIZE / 2;
export const INITIAL_INSET = 4;
export const TRANSITION_WIDTH = 24;
export const TRANSITION_THICKNESS = 3;
/** Step edge ↔ transition bar. */
export const STEP_TRANSITION_GAP = 40;
/** Step center ↔ transition center. */
export const ROW = STEP_HALF + STEP_TRANSITION_GAP;
/** Step center ↔ next step center in a sequence. */
export const PITCH = 2 * ROW;
export const ACTION_HEIGHT = 40;
export const ACTION_GAP = 20;
export const ACTION_PAD = 8;
export const ACTION_MIN_WIDTH = 60;
export const DOUBLE_BAR_GAP = 4;
/** Transition center ↔ AND double bar center. */
export const BAR_OFFSET = 20;
/** Step edge ↔ OR divergence/convergence line. */
export const OR_LINE_OFFSET = 10;
/** How far double bars extend beyond the outermost branch. */
export const BAR_OVERHANG = 10;
export const LOOP_DROP = 20;
export const LOOP_MARGIN = 30;
export const LOOP_LANE = 20;
export const STUB = 20;

export const FONT_SIZE = 13;
export const STEP_FONT_SIZE = 14;
export const LABEL_FONT_SIZE = 11;
export const LINE_HEIGHT = 16;
/** Advance width of the bundled monospace font (JetBrains Mono), in em. */
export const CHAR_WIDTH_EM = 0.6;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const snap = (v: number, grid = GRID) => Math.round(v / grid) * grid;
const snapUp = (v: number, grid = GRID) => Math.ceil(v / grid) * grid;

export function textWidth(text: string, fontSize = FONT_SIZE): number {
  let n = 0;
  for (const _ of text) n++;
  return n * fontSize * CHAR_WIDTH_EM;
}

/** Width of an expression as drawn: the longer of the typed text and its textbook form. */
export function expressionWidth(source: string, fontSize = FONT_SIZE): number {
  const r = source.trim() ? cachedBool(source) : null;
  const display = r?.ok
    ? formatTextbook(r.value)
        .map((x) => x.text)
        .join('')
    : '';
  return textWidth([...display].length > [...source].length ? display : source, fontSize);
}

export function stepRect(s: Step): Rect {
  return {
    x: s.position.x - STEP_HALF,
    y: s.position.y - STEP_HALF,
    width: STEP_SIZE,
    height: STEP_SIZE,
  };
}

/** Generous hit area around the thin transition bar. */
export function transitionHitRect(t: Transition): Rect {
  return {
    x: t.position.x - TRANSITION_WIDTH / 2 - 4,
    y: t.position.y - 8,
    width: TRANSITION_WIDTH + 8,
    height: 16,
  };
}

export function transitionTextAnchor(t: Transition): Point {
  return { x: t.position.x + TRANSITION_WIDTH / 2 + 8, y: t.position.y };
}

export function stepLabelAnchor(s: Step): Point {
  return { x: s.position.x - STEP_HALF - 8, y: s.position.y };
}

export interface ActionBox extends Rect {
  id: Id;
}

export function actionWidth(a: Action): number {
  const extra = a.kind === 'forcing' ? 6 : 0;
  return Math.max(ACTION_MIN_WIDTH, snapUp(textWidth(a.text || ' ') + 2 * ACTION_PAD + extra));
}

/** Distance of the condition line, stored-action arrow or event flag from the box's side. */
export const ACTION_MARK_INSET = 12;
/** Length of the stored-action arrow outside the box (the condition line is shorter). */
export const ACTION_MARK_RISE = 14;
const HEAD = 5;
const HEAD_HALF = 3.6;

/**
 * What is drawn around an action box (IEC 60848): the condition line with its condition on top;
 * the ↑ arrow of an action stored on activation above the box, the ↓ arrow of one stored on
 * deactivation below it (each with its optional condition); or the flag of an action stored on an
 * event at the top right, with the event to its left.
 * Paths are absolute so the canvas and the exports draw exactly the same marks.
 */
export interface ActionDecor {
  /** Vertical line from the box's top (or bottom) edge. */
  stem?: string;
  /** Filled arrowhead or flag. */
  mark?: string;
  /** Condition or event text, vertically centred on y, starting at (or ending at) x. */
  text?: { source: string; x: number; y: number; anchor: 'start' | 'end' };
}

export function actionDecor(a: Action, box: Rect): ActionDecor {
  const top = box.y;
  const cond = a.condition?.trim() ? a.condition : undefined;
  const textY = top - 9;
  if (a.kind === 'storedOnEvent') {
    const x = box.x + box.width - ACTION_MARK_INSET;
    const y = top - ACTION_MARK_RISE - 2;
    return {
      stem: `M${x} ${top}V${y}`,
      mark: `M${x} ${y}L${x + 9} ${y + 3.5}L${x} ${y + 7}Z`,
      ...(cond ? { text: { source: cond, x: x - 5, y: textY, anchor: 'end' as const } } : {}),
    };
  }
  const x = box.x + ACTION_MARK_INSET;
  if (a.kind === 'storedOnActivation' || a.kind === 'storedOnDeactivation') {
    const up = a.kind === 'storedOnActivation';
    const edge = up ? top : top + box.height;
    const tip = up ? edge - ACTION_MARK_RISE : edge + ACTION_MARK_RISE;
    const base = up ? tip + HEAD : tip - HEAD;
    return {
      stem: `M${x} ${edge}V${tip}`,
      mark: `M${x} ${tip}L${x - HEAD_HALF} ${base}L${x + HEAD_HALF} ${base}Z`,
      ...(cond
        ? {
            text: { source: cond, x: x + 6, y: up ? edge - 9 : edge + 9, anchor: 'start' as const },
          }
        : {}),
    };
  }
  if (!cond) return {};
  return {
    stem: `M${x} ${top}V${top - 10}`,
    text: { source: cond, x: x + 4, y: textY, anchor: 'start' },
  };
}

/** Action boxes are chained left to right, starting ACTION_GAP right of the step. */
export function layoutActions(s: Step, actions: readonly Action[]): ActionBox[] {
  let x = s.position.x + STEP_HALF + ACTION_GAP;
  const y = s.position.y - ACTION_HEIGHT / 2;
  return actions.map((a) => {
    const width = actionWidth(a);
    const box = { id: a.id, x, y, width, height: ACTION_HEIGHT };
    x += width;
    return box;
  });
}

export function commentRect(c: Comment): Rect {
  const lines = c.text.split('\n');
  const longest = Math.max(...lines.map((l) => textWidth(l)));
  return {
    x: c.position.x,
    y: c.position.y,
    width: Math.max(80, snapUp(longest + 16)),
    height: Math.max(30, lines.length * LINE_HEIGHT + 12),
  };
}

// ---------------------------------------------------------------------------------------------
// Links

export interface LinkGeom {
  /** `${transitionId}:${side}:${stepId}` */
  key: string;
  transitionId: Id;
  stepId: Id;
  /** 'in' = step → transition (upstream of the transition); 'out' = transition → step. */
  side: 'in' | 'out';
  points: Point[];
  /** Middle of the upward segment for links flowing upward (drawn with an arrow). */
  arrow?: Point;
}

export interface BarGeom {
  key: string;
  transitionId: Id;
  /** join = AND convergence (above the transition); split = AND divergence (below). */
  kind: 'join' | 'split';
  x1: number;
  x2: number;
  y: number;
  stem: [Point, Point];
}

export interface StubGeom {
  key: string;
  transitionId: Id;
  kind: 'source' | 'sink';
  points: [Point, Point];
}

export interface GrafcetGeometry {
  index: GrafcetIndex;
  links: LinkGeom[];
  bars: BarGeom[];
  stubs: StubGeom[];
}

export const linkKey = (transitionId: Id, side: 'in' | 'out', stepId: Id) =>
  `${transitionId}:${side}:${stepId}`;

const joinY = (t: Transition) => t.position.y - BAR_OFFSET;
const splitY = (t: Transition) => t.position.y + BAR_OFFSET;

interface PendingUpward {
  link: LinkGeom;
  start: Point;
  dropY: number;
  junctionY: number;
  end: Point;
  target: Id;
  override?: number;
}

/** Leftmost x occupied by elements in a vertical band (labels included). */
function leftExtent(g: Grafcet, yMin: number, yMax: number, fallback: number): number {
  let min = fallback;
  for (const s of Object.values(g.steps)) {
    if (s.position.y + STEP_HALF < yMin || s.position.y - STEP_HALF > yMax) continue;
    const label = s.label ? textWidth(s.label, LABEL_FONT_SIZE) + 8 : 0;
    min = Math.min(min, s.position.x - STEP_HALF - label);
  }
  for (const t of Object.values(g.transitions)) {
    if (t.position.y < yMin || t.position.y > yMax) continue;
    const label = t.number !== undefined ? textWidth(`(${t.number})`) + 6 : 0;
    min = Math.min(min, t.position.x - TRANSITION_WIDTH / 2 - label);
  }
  return min;
}

function upwardPoints(p: PendingUpward, sideX: number): Point[] {
  const pts: Point[] = [p.start];
  pts.push({ x: p.start.x, y: p.dropY });
  pts.push({ x: sideX, y: p.dropY });
  pts.push({ x: sideX, y: p.junctionY });
  pts.push({ x: p.end.x, y: p.junctionY });
  pts.push(p.end);
  return pts;
}

/**
 * Orthogonal routing of every link of a grafcet. Downward links go straight or with one elbow on
 * the OR line; upward links (loops) drop below their source, run up a side lane left of the
 * diagram and enter their target from above, with an arrow on the upward segment.
 */
export function computeGeometry(
  g: Grafcet,
  index: GrafcetIndex = indexGrafcet(g),
): GrafcetGeometry {
  const links: LinkGeom[] = [];
  const bars: BarGeom[] = [];
  const stubs: StubGeom[] = [];
  const upward: PendingUpward[] = [];

  // Step outputs: step → transition (upstream side of the transition).
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
      if (end.y <= divY) {
        upward.push({
          link,
          start,
          dropY: divY,
          junctionY: end.y - OR_LINE_OFFSET,
          end,
          target: t.id,
          override: t.routing?.sideX,
        });
      } else if (outs.length === 1 && end.x === start.x) {
        link.points = [start, end];
      } else {
        link.points = [start, { x: start.x, y: divY }, { x: end.x, y: divY }, end];
      }
    }
  }

  // Step inputs: transition → step (downstream side of the transition).
  for (const s of Object.values(g.steps)) {
    const ins = index.incoming.get(s.id);
    if (!ins) continue;
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
      if (start.y >= convY) {
        const dropY = start.y + (t.to.length > 1 ? OR_LINE_OFFSET : LOOP_DROP);
        upward.push({
          link,
          start,
          dropY,
          junctionY: convY,
          end,
          target: s.id,
          override: t.routing?.sideX,
        });
      } else if (ins.length === 1 && start.x === end.x) {
        link.points = [start, end];
      } else {
        link.points = [start, { x: start.x, y: convY }, { x: end.x, y: convY }, end];
      }
    }
  }

  // Upward links: assign side lanes, shortest spans innermost; links to the same target share a lane.
  upward.sort((a, b) => a.dropY - a.junctionY - (b.dropY - b.junctionY));
  const lanes: { target: Id; yMin: number; yMax: number }[][] = [];
  for (const p of upward) {
    let sideX: number;
    if (p.override !== undefined) {
      sideX = p.override;
    } else {
      const yMin = p.junctionY;
      const yMax = p.dropY;
      let lane = 0;
      for (; lane < lanes.length; lane++) {
        const used = lanes[lane]!;
        if (!used.some((u) => u.target !== p.target && u.yMin <= yMax && yMin <= u.yMax)) break;
      }
      (lanes[lane] ??= []).push({ target: p.target, yMin, yMax });
      const left = leftExtent(g, yMin, yMax, Math.min(p.start.x, p.end.x) - STEP_HALF);
      sideX = snap(left - LOOP_MARGIN) - lane * LOOP_LANE;
    }
    p.link.points = upwardPoints(p, sideX);
    p.link.arrow = { x: sideX, y: (p.dropY + p.junctionY) / 2 };
  }

  // AND double bars and source/sink stubs.
  for (const t of Object.values(g.transitions)) {
    const tp = t.position;
    if (t.from.length > 1) {
      const xs = [tp.x, ...t.from.map((id) => g.steps[id]?.position.x ?? tp.x)];
      const y = joinY(t);
      bars.push({
        key: `${t.id}:join`,
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
        key: `${t.id}:split`,
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

  return { index, links, bars, stubs };
}

// ---------------------------------------------------------------------------------------------
// Bounds

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
    for (const b of boxes) {
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
  }
  for (const t of Object.values(g.transitions)) {
    if (!take(t.id)) continue;
    const a = transitionTextAnchor(t);
    unionInto(acc, transitionHitRect(t));
    unionInto(acc, { x: a.x, y: a.y - 10, width: expressionWidth(t.receptivity), height: 20 });
  }
  for (const c of Object.values(g.comments)) if (take(c.id)) unionInto(acc, commentRect(c));
  for (const l of geom.links) {
    if (only && !(only.has(l.stepId) && only.has(l.transitionId))) continue;
    for (const p of l.points) unionInto(acc, { x: p.x, y: p.y, width: 0, height: 0 });
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
  if (a) {
    const step = g.steps[a.stepId];
    if (!step) return null;
    return (
      layoutActions(step, geom.index.actions.get(step.id) ?? []).find((b) => b.id === id) ?? null
    );
  }
  return null;
}

/** Link ports: where links leave (out, bottom) or enter (in, top) a step or transition. */
export function portPosition(g: Grafcet, id: Id, port: 'in' | 'out'): Point | null {
  const s = g.steps[id];
  if (s) return { x: s.position.x, y: s.position.y + (port === 'in' ? -STEP_HALF : STEP_HALF) };
  const t = g.transitions[id];
  if (t) return { x: t.position.x, y: t.position.y + (port === 'in' ? -10 : 10) };
  return null;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}
