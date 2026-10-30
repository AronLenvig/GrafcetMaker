import { cachedBool, memoBySource } from '../expr/cache';
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
/** Length of a jump arrow, from its transition (or into the step it leads to). */
export const JUMP_LENGTH = 30;

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

/** Characters of an expression as drawn: the longer of the typed text and its textbook form. */
const drawnLength = memoBySource((source: string): number => {
  const r = source.trim() ? cachedBool(source) : null;
  const display = r?.ok
    ? formatTextbook(r.value)
        .map((x) => x.text)
        .join('')
    : '';
  return Math.max([...display].length, [...source].length);
});

/** Width of an expression as drawn: the longer of the typed text and its textbook form. */
export function expressionWidth(source: string, fontSize = FONT_SIZE): number {
  return drawnLength(source) * fontSize * CHAR_WIDTH_EM;
}

export function stepRect(s: Step): Rect {
  return {
    x: s.position.x - STEP_HALF,
    y: s.position.y - STEP_HALF,
    width: STEP_SIZE,
    height: STEP_SIZE,
  };
}

/**
 * Direction of the flow through a transition as drawn: top to bottom, or right to left
 * (`flow: 'left'`). A transition with AND links is always drawn top to bottom: its double bars are
 * horizontal.
 */
export function flowOf(t: Transition): 'down' | 'left' {
  return t.flow === 'left' && t.from.length <= 1 && t.to.length <= 1 ? 'left' : 'down';
}

/** The bar of a transition: horizontal (top to bottom), vertical (right to left). */
export function transitionBar(t: Transition): Rect {
  const { x, y } = t.position;
  return flowOf(t) === 'left'
    ? {
        x: x - TRANSITION_THICKNESS / 2,
        y: y - TRANSITION_WIDTH / 2,
        width: TRANSITION_THICKNESS,
        height: TRANSITION_WIDTH,
      }
    : {
        x: x - TRANSITION_WIDTH / 2,
        y: y - TRANSITION_THICKNESS / 2,
        width: TRANSITION_WIDTH,
        height: TRANSITION_THICKNESS,
      };
}

/**
 * Start of the receptivity (left end, vertical center): right of a horizontal bar; above the
 * incoming link of a vertical one.
 */
export function transitionTextAnchor(t: Transition): Point {
  const { x, y } = t.position;
  return flowOf(t) === 'left'
    ? { x: x + 6, y: y - TRANSITION_WIDTH / 2 - 8 }
    : { x: x + TRANSITION_WIDTH / 2 + 8, y };
}

/** End of the transition number `(n)` (right-aligned): left of the bar, or above it on the left. */
export function transitionNumberAnchor(t: Transition): Point {
  const { x, y } = t.position;
  return flowOf(t) === 'left'
    ? { x: x - 6, y: y - TRANSITION_WIDTH / 2 - 8 }
    : { x: x - TRANSITION_WIDTH / 2 - 6, y };
}

/**
 * Whether the link of a transition to its step is drawn as a jump: an arrow marked with the step
 * (X10) instead of a line to it.
 */
export const isJump = (t: Transition): boolean => t.jump === true && t.to.length === 1;

/** How a jump to step `n` is written. */
export const jumpText = (n: number) => `X${n}`;

/**
 * Where the step of a jump is written: right of the arrow's tip under the bar (left-aligned), or
 * left of its tip for a transition flowing right to left (right-aligned).
 */
export function jumpLabelAnchor(t: Transition): Point & { anchor: 'start' | 'end' } {
  const { x, y } = t.position;
  return flowOf(t) === 'left'
    ? { x: x - JUMP_LENGTH - 4, y, anchor: 'end' }
    : { x: x + 8, y: y + JUMP_LENGTH - 6, anchor: 'start' };
}

/** What is drawn for a transition: its bar, number and receptivity (lines of text included). */
export function transitionBox(t: Transition): Rect {
  const bar = transitionBar(t);
  const text = transitionTextAnchor(t);
  const num = transitionNumberAnchor(t);
  const x1 = t.number !== undefined ? Math.min(bar.x, num.x - textWidth(`(${t.number})`)) : bar.x;
  const x2 = Math.max(bar.x + bar.width, text.x + expressionWidth(t.receptivity));
  const y1 = Math.min(bar.y, text.y - LINE_HEIGHT / 2);
  const y2 = Math.max(bar.y + bar.height, text.y + LINE_HEIGHT / 2);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Margin of the clickable area around a transition bar. */
const HIT_MARGIN = 8;

/**
 * Clickable area of a transition: a generous margin around its thin bar, its number and its
 * receptivity (a click on the text selects the transition).
 */
export function transitionHitRect(t: Transition): Rect {
  const box = transitionBox(t);
  const bar = transitionBar(t);
  const text = transitionTextAnchor(t);
  const x1 = Math.min(box.x, bar.x - HIT_MARGIN);
  const x2 = Math.max(box.x + box.width, bar.x + bar.width + HIT_MARGIN, text.x + textWidth('?'));
  const y1 = Math.min(box.y - 2, bar.y - HIT_MARGIN);
  const y2 = Math.max(box.y + box.height + 2, bar.y + bar.height + HIT_MARGIN);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Where `Enter` adds the step a transition leads to: below it, or below its left end. */
export function nextStepPosition(t: Transition): Point {
  const { x, y } = t.position;
  return flowOf(t) === 'left' ? { x: x - ROW, y: y + ROW } : { x, y: y + ROW };
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
  if (!cond) {
    // A conditional action whose condition is not written yet still shows its condition line.
    return a.kind === 'continuous' && a.condition !== undefined
      ? { stem: `M${x} ${top}V${top - 10}` }
      : {};
  }
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

/** Box of an action that is not attached to a step, at its own position. */
export function freeActionBox(a: Action): ActionBox {
  const p = a.position ?? { x: 0, y: 0 };
  return { id: a.id, x: p.x, y: p.y, width: actionWidth(a), height: ACTION_HEIGHT };
}

/** Where a dragged action would be attached: a step, its place among the step's actions, its x. */
export interface ActionDrop {
  stepId: Id;
  index: number;
  x: number;
}

/**
 * Where the action being dragged (unattached meanwhile, at its `position`) would be attached
 * with the pointer at `p`: the step whose row (the step, its actions and room for this one) is
 * under the pointer, at the place among its actions nearest the left edge of the dragged box.
 * Null over anything else: the action is dropped without a step.
 */
export function actionDropAt(g: Grafcet, actionId: Id, p: Point): ActionDrop | null {
  const a = g.actions[actionId];
  if (!a) return null;
  const left = a.position?.x ?? p.x;
  for (const s of Object.values(g.steps)) {
    if (Math.abs(p.y - s.position.y) > ACTION_HEIGHT / 2 || p.x < s.position.x - STEP_HALF)
      continue;
    const actions = Object.values(g.actions)
      .filter((x) => x.stepId === s.id && x.id !== actionId)
      .sort((x, y) => x.order - y.order);
    const edges = [
      s.position.x + STEP_HALF + ACTION_GAP,
      ...layoutActions(s, actions).map((b) => b.x + b.width),
    ];
    if (p.x > edges[edges.length - 1]! + actionWidth(a)) continue;
    let index = 0;
    edges.forEach((x, k) => {
      if (Math.abs(x - left) < Math.abs(edges[index]! - left)) index = k;
    });
    return { stepId: s.id, index, x: edges[index]! };
  }
  return null;
}

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
  /** Links flowing upward (loops): x of their side lane (`points` go source, below it, lane foot, lane top, above the target, target). */
  loop?: { sideX: number };
  /** Middle of the upward segment, drawn with an arrow (once per lane shared by loops to one target). */
  arrow?: Point;
  /**
   * Arrow showing the direction of a link into or out of a transition flowing right to left (IEC
   * 60848: links not drawn top to bottom carry an arrow).
   */
  flowArrow?: Point & { dir: ArrowDir };
}

export type ArrowDir = 'up' | 'down' | 'left' | 'right';

/** Filled arrowhead centred on `p`, pointing `dir`. */
export function arrowPath(p: Point, dir: ArrowDir): string {
  const { x, y } = p;
  switch (dir) {
    case 'up':
      return `M${x} ${y - 6}L${x - 4.5} ${y + 3}L${x + 4.5} ${y + 3}Z`;
    case 'down':
      return `M${x} ${y + 6}L${x - 4.5} ${y - 3}L${x + 4.5} ${y - 3}Z`;
    case 'left':
      return `M${x - 6} ${y}L${x + 3} ${y - 4.5}L${x + 3} ${y + 4.5}Z`;
    case 'right':
      return `M${x + 6} ${y}L${x - 3} ${y - 4.5}L${x - 3} ${y + 4.5}Z`;
  }
}

/** The direction arrow of a link, if it has one: loops point up, links of right-to-left transitions left. */
export function linkArrow(l: LinkGeom): string | undefined {
  if (l.flowArrow) return arrowPath(l.flowArrow, l.flowArrow.dir);
  return l.arrow ? arrowPath(l.arrow, 'up') : undefined;
}

/** A polyline without repeated points or points in the middle of a straight run. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    const prev = out[out.length - 2];
    if (
      prev &&
      last &&
      ((prev.x === last.x && last.x === p.x) || (prev.y === last.y && last.y === p.y))
    )
      out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

/**
 * Step → transition flowing right to left: the link enters the bar from the right, straight from
 * a step above on its right (down, then left), otherwise below the step (on its OR line), along
 * a lane STUB right of the bar and into it.
 */
function leftwardIn(
  start: Point,
  t: Transition,
  divY: number,
): Pick<LinkGeom, 'points' | 'flowArrow'> {
  const end = { ...t.position };
  const lane = end.x + STUB;
  const points = simplify(
    start.x >= lane && start.y + OR_LINE_OFFSET <= end.y
      ? [start, { x: start.x, y: end.y }, end]
      : [start, { x: start.x, y: divY }, { x: lane, y: divY }, { x: lane, y: end.y }, end],
  );
  const from = points[points.length - 2]!;
  return { points, flowArrow: { x: (from.x + end.x) / 2, y: end.y, dir: 'left' } };
}

/**
 * Transition flowing right to left → step: the link leaves the bar on the left, straight to a
 * step below on its left (left, then down), otherwise along a lane STUB left of the bar to the
 * step's OR line and into its top.
 */
function leftwardOut(
  t: Transition,
  end: Point,
  convY: number,
): Pick<LinkGeom, 'points' | 'flowArrow'> {
  const start = { ...t.position };
  const lane = start.x - STUB;
  const points = simplify(
    end.x <= lane && start.y <= convY
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: lane, y: start.y }, { x: lane, y: convY }, { x: end.x, y: convY }, end],
  );
  const to = points[1]!;
  return { points, flowArrow: { x: (start.x + to.x) / 2, y: start.y, dir: 'left' } };
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

/**
 * A jump (IEC 60848 interrupted link): an arrow from the transition marked with the step it leads
 * to, and, above a step reached only by jumps, an arrow into it marked with the steps they come
 * from.
 */
export interface JumpGeom {
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

export const linkKey = (transitionId: Id, side: 'in' | 'out', stepId: Id) =>
  `${transitionId}:${side}:${stepId}`;

export const barKey = (transitionId: Id, kind: BarGeom['kind']) => `${transitionId}:${kind}`;

/** What a link key names (see linkKey, barKey): one link, or an AND bar and the links it joins. */
export type LinkRef =
  | { kind: 'link'; transitionId: Id; side: 'in' | 'out'; stepId: Id }
  | { kind: 'bar'; transitionId: Id; bar: BarGeom['kind'] };

export function parseLinkKey(key: string): LinkRef | null {
  const [transitionId, part, stepId, rest] = key.split(':');
  if (!transitionId || rest !== undefined) return null;
  if ((part === 'join' || part === 'split') && stepId === undefined)
    return { kind: 'bar', transitionId, bar: part };
  if ((part === 'in' || part === 'out') && stepId)
    return { kind: 'link', transitionId, side: part, stepId };
  return null;
}

const joinY = (t: Transition) => t.position.y - BAR_OFFSET;
const splitY = (t: Transition) => t.position.y + BAR_OFFSET;

interface PendingUpward {
  link: LinkGeom;
  start: Point;
  dropY: number;
  junctionY: number;
  end: Point;
  target: Id;
  /** Where the loop starts: the step under a transition it goes back up to, or the transition. */
  source: Id;
  /** The transition whose routing applies (and whose sequence the loop belongs to). */
  owner: Id;
  override?: number;
  dropOverride?: number;
  /** x of its side lane: first just left of its body, then clear of what is in the way. */
  laneX: number;
}

/** Room kept between a loop's bottom line and what it passes under. */
const CLEARANCE = 6;

/** An area a loop's bottom line must not cross (an element, its texts, or a wire). */
interface Box {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * Connected sequences: each step and transition mapped to a representative of the steps and
 * transitions linked to it. Loops are routed around their own sequence only, not around a
 * separate sequence drawn next to it.
 */
function sequences(g: Grafcet): Map<Id, Id> {
  const parent = new Map<Id, Id>();
  for (const id of Object.keys(g.steps)) parent.set(id, id);
  for (const id of Object.keys(g.transitions)) parent.set(id, id);
  const find = (id: Id): Id => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    for (let x = id; x !== root;) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  for (const t of Object.values(g.transitions)) {
    for (const id of [...t.from, ...t.to]) {
      if (!parent.has(id)) continue;
      const a = find(t.id);
      const b = find(id);
      if (a !== b) parent.set(a, b);
    }
  }
  const out = new Map<Id, Id>();
  for (const id of parent.keys()) out.set(id, find(id));
  return out;
}

/**
 * The body of a loop: what lies on the way down from its target to its source, following only the
 * links that go down (other loops do not count). Its lane runs just left of it, so a loop inside a
 * branch stays beside that branch.
 */
function loopBody(down: Map<Id, Id[]>, up: Map<Id, Id[]>, target: Id, source: Id): Set<Id> {
  const reach = (from: Id, next: Map<Id, Id[]>) => {
    const seen = new Set<Id>();
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const m of next.get(n) ?? []) stack.push(m);
    }
    return seen;
  };
  const above = reach(source, up);
  const body = new Set([...reach(target, down)].filter((id) => above.has(id)));
  body.add(target);
  body.add(source);
  return body;
}

/** Leftmost x of the elements of a loop's body (step labels and transition numbers included). */
function bodyLeft(g: Grafcet, body: ReadonlySet<Id>): number {
  let min = Infinity;
  for (const id of body) {
    const s = g.steps[id];
    if (s) {
      const label = s.label ? textWidth(s.label, LABEL_FONT_SIZE) + 8 : 0;
      min = Math.min(min, s.position.x - STEP_HALF - label);
    }
    const t = g.transitions[id];
    if (t) min = Math.min(min, transitionBox(t).x);
  }
  return min;
}

/** The area covered by a polyline segment. */
function segmentBox(a: Point, b: Point): Box {
  return {
    x1: Math.min(a.x, b.x),
    x2: Math.max(a.x, b.x),
    y1: Math.min(a.y, b.y),
    y2: Math.max(a.y, b.y),
  };
}

/**
 * Everything a loop's bottom line could run into, by sequence: steps with their labels and
 * actions, transitions with their number and receptivity, and the wires drawn so far.
 */
function obstaclesBySequence(
  g: Grafcet,
  index: GrafcetIndex,
  seq: Map<Id, Id>,
  wires: { transitionId: Id; points: readonly Point[] }[],
): Map<Id, Box[]> {
  const out = new Map<Id, Box[]>();
  const add = (id: Id, b: Box) => {
    const root = seq.get(id);
    if (root === undefined) return;
    const list = out.get(root);
    if (list) list.push(b);
    else out.set(root, [b]);
  };
  for (const s of Object.values(g.steps)) {
    const { x, y } = s.position;
    const label = s.label ? textWidth(s.label, LABEL_FONT_SIZE) + 8 : 0;
    add(s.id, {
      x1: x - STEP_HALF - label,
      x2: x + STEP_HALF,
      y1: y - STEP_HALF,
      y2: y + STEP_HALF,
    });
    for (const box of layoutActions(s, index.actions.get(s.id) ?? [])) {
      // Arrows and flags of stored actions stand out above and below the box.
      add(s.id, {
        x1: box.x,
        x2: box.x + box.width,
        y1: box.y - ACTION_MARK_RISE,
        y2: box.y + box.height + ACTION_MARK_RISE,
      });
    }
  }
  for (const t of Object.values(g.transitions)) {
    const r = transitionBox(t);
    add(t.id, { x1: r.x, x2: r.x + r.width, y1: r.y, y2: r.y + r.height });
  }
  for (const w of wires)
    for (let i = 1; i < w.points.length; i++)
      add(w.transitionId, segmentBox(w.points[i - 1]!, w.points[i]!));
  return out;
}

/**
 * Where a loop's bottom line runs: the first y from `yStart` down at which a line from x0 left to
 * its lane at `laneX` crosses nothing of its sequence. A loop from a branch on the right thus
 * passes below the elements and wires on its way instead of through them.
 */
function freeDropY(boxes: readonly Box[], x0: number, yStart: number, laneX: number): number {
  const left = boxes
    .filter((b) => b.x1 < x0 - 1 && b.x2 >= laneX - CLEARANCE)
    .sort((a, b) => a.y1 - b.y1);
  let y = yStart;
  for (const b of left) {
    if (b.y1 - CLEARANCE > y) break;
    if (b.y2 + CLEARANCE >= y) y = snapUp(b.y2 + LOOP_DROP);
  }
  return y;
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
 * the OR line; upward links (loops) drop below their source (far enough not to cross their own
 * sequence), run up a side lane left of that sequence and enter their target from above, with an
 * arrow on the upward segment.
 */
export function computeGeometry(
  g: Grafcet,
  index: GrafcetIndex = indexGrafcet(g),
): GrafcetGeometry {
  const links: LinkGeom[] = [];
  const bars: BarGeom[] = [];
  const stubs: StubGeom[] = [];
  const upward: PendingUpward[] = [];
  // The links that go down (successors and predecessors), for the bodies of loops.
  const down = new Map<Id, Id[]>();
  const up = new Map<Id, Id[]>();
  const goesDown = (from: Id, to: Id) => {
    const d = down.get(from);
    if (d) d.push(to);
    else down.set(from, [to]);
    const u = up.get(to);
    if (u) u.push(from);
    else up.set(to, [from]);
  };

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
      goesDown(s.id, t.id);
      if (flowOf(t) === 'left') {
        Object.assign(link, leftwardIn(start, t, divY));
      } else if (outs.length === 1 && end.x === start.x) {
        link.points = [start, end];
      } else {
        link.points = [start, { x: start.x, y: divY }, { x: end.x, y: divY }, end];
      }
    }
  }

  // Step inputs: transition → step (downstream side of the transition).
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
      goesDown(t.id, s.id);
      if (flowOf(t) === 'left') {
        Object.assign(link, leftwardOut(t, end, convY));
      } else if (ins.length === 1 && start.x === end.x) {
        link.points = [start, end];
      } else {
        link.points = [start, { x: start.x, y: convY }, { x: end.x, y: convY }, end];
      }
    }
  }

  // AND double bars and source/sink stubs.
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

  const jumps = jumpGeometry(g, index);

  // Upward links (loops). 1. Bottom lines, sources from left to right: each drops below its source
  // until its line to its lane (just left of the loop's body) crosses nothing of its own sequence
  // (wires, elements, the bottom lines of loops further left), or stays where it was dragged.
  const seq = upward.length ? sequences(g) : new Map<Id, Id>();
  const obstacles = upward.length
    ? obstaclesBySequence(g, index, seq, [
        ...links.filter((l) => l.points.length),
        ...bars.map((b) => ({
          transitionId: b.transitionId,
          points: [{ x: b.x1, y: b.y }, { x: b.x2, y: b.y }, ...b.stem],
        })),
        ...stubs,
      ])
    : new Map<Id, Box[]>();
  const listOf = (map: Map<Id, Box[]>, p: PendingUpward): Box[] => {
    const root = seq.get(p.owner);
    if (root === undefined) return [];
    let list = map.get(root);
    if (!list) map.set(root, (list = []));
    return list;
  };
  const loopLines = new Map<Id, Box[]>();
  for (const p of [...upward].sort((a, b) => a.start.x - b.start.x || b.start.y - a.start.y)) {
    p.laneX = p.override ?? snap(bodyLeft(g, loopBody(down, up, p.target, p.source)) - LOOP_MARGIN);
    const lines = listOf(loopLines, p);
    p.dropY =
      p.dropOverride !== undefined
        ? Math.max(p.dropOverride, p.start.y + OR_LINE_OFFSET)
        : freeDropY([...listOf(obstacles, p), ...lines], p.start.x, p.dropY, p.laneX);
    lines.push(segmentBox(p.start, { x: p.start.x, y: p.dropY }));
    lines.push({ x1: p.laneX, x2: p.start.x, y1: p.dropY, y2: p.dropY });
  }

  // 2. Side lanes, higher bottom lines first (inside) and lower ones outside, so nested loops do
  // not cross. A lane moves left from beside its body past whatever is in its way: an element or
  // a wire of its sequence, another loop's lane or the lines into it. Loops to one target share
  // the leftmost of their lanes.
  upward.sort((a, b) => a.dropY - b.dropY || a.dropY - a.junctionY - (b.dropY - b.junctionY));
  const lanes: {
    root: Id | undefined;
    target: Id;
    x: number;
    yMin: number;
    yMax: number;
    sourceX: number;
    endX: number;
  }[] = [];
  for (const p of upward) {
    const root = seq.get(p.owner);
    const yMin = p.junctionY;
    const yMax = p.dropY;
    let x = p.laneX;
    if (p.override === undefined) {
      const boxes = listOf(obstacles, p);
      const near = lanes.filter((l) => l.root === root && l.yMin <= yMax && yMin <= l.yMax);
      // A line of another loop at height y from x1 to x2, crossed by this lane at `at`.
      const crosses = (at: number, x1: number, x2: number, y: number) =>
        y >= yMin &&
        y <= yMax &&
        at > Math.min(x1, x2) - CLEARANCE &&
        at < Math.max(x1, x2) + CLEARANCE;
      for (let moved = true; moved;) {
        let next = x;
        for (const l of near) {
          if (l.target === p.target) next = Math.min(next, l.x);
          else if (
            Math.abs(l.x - next) < LOOP_LANE ||
            crosses(next, l.x, l.sourceX, l.yMax) ||
            crosses(next, l.x, l.endX, l.yMin)
          )
            next = Math.min(next, l.x - LOOP_LANE);
        }
        for (const b of boxes)
          if (b.x1 - CLEARANCE <= next && next <= b.x2 + CLEARANCE && b.y1 <= yMax && yMin <= b.y2)
            next = Math.min(next, snap(b.x1 - LOOP_MARGIN));
        moved = next !== x;
        x = next;
      }
    }
    lanes.push({ root, target: p.target, x, yMin, yMax, sourceX: p.start.x, endX: p.end.x });
    p.link.points = upwardPoints(p, x);
    p.link.loop = { sideX: x };
    p.link.arrow = { x, y: (p.dropY + p.junctionY) / 2 };
  }
  // Loops to one target sharing a lane draw one line: one arrow, on the longest of them.
  const shared = new Map<string, PendingUpward>();
  for (const p of upward) {
    const key = `${p.target}:${p.link.loop!.sideX}`;
    const kept = shared.get(key);
    if (!kept) shared.set(key, p);
    else if (p.dropY > kept.dropY) {
      delete kept.link.arrow;
      shared.set(key, p);
    } else delete p.link.arrow;
  }

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
      key: `${t.id}:jump`,
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

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}
