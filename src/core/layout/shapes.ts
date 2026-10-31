/** Shapes of the diagram's elements: rects, anchors, text widths and action boxes. */
import { cachedBool, memoBySource } from '../expr/cache';
import { formatTextbook } from '../expr/format';
import { indexGrafcet, type GrafcetIndex } from '../model/graph';
import type { Action, Comment, Grafcet, Id, Point, Step, Transition } from '../model/types';
import {
  ACTION_GAP,
  ACTION_HEIGHT,
  ACTION_MIN_WIDTH,
  ACTION_PAD,
  CHAR_WIDTH_EM,
  FONT_SIZE,
  GRID,
  JUMP_LENGTH,
  LINE_HEIGHT,
  ROW,
  STEP_HALF,
  STEP_SIZE,
  TRANSITION_THICKNESS,
  TRANSITION_WIDTH,
} from './constants';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const snap = (v: number, grid = GRID) => Math.round(v / grid) * grid;
export const snapUp = (v: number, grid = GRID) => Math.ceil(v / grid) * grid;

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
 * Null over anything else: the action is dropped without a step. A drag passes the index of the
 * grafcet once (the other actions stay put meanwhile).
 */
export function actionDropAt(
  g: Grafcet,
  actionId: Id,
  p: Point,
  graph: GrafcetIndex = indexGrafcet(g),
): ActionDrop | null {
  const a = g.actions[actionId];
  if (!a) return null;
  const left = a.position?.x ?? p.x;
  for (const s of Object.values(g.steps)) {
    if (Math.abs(p.y - s.position.y) > ACTION_HEIGHT / 2 || p.x < s.position.x - STEP_HALF)
      continue;
    const actions = (graph.actions.get(s.id) ?? []).filter((x) => x.id !== actionId);
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

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}
