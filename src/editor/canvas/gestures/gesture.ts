import type { MutableRefObject } from 'react';
import type { Rect } from '@/core/layout/geometry';
import type { GrafcetIndex } from '@/core/model/graph';
import type { Id, Point } from '@/core/model/types';
import type { LinkDrag } from '../interactionStore';

/** What a pointer (or two fingers) on the canvas is doing, from press to release. */
export type Gesture =
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
      /** For where the action would be attached: the grafcet's index, made once per drag. */
      drops?: GrafcetIndex;
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

export type GestureOf<K extends Gesture['kind']> = Extract<Gesture, { kind: K }>;

/**
 * What the gestures share: the gesture in progress, whether the diagram is locked (simulating) and
 * the coordinate helpers of the canvas.
 */
export interface GestureContext {
  gesture: MutableRefObject<Gesture>;
  readOnly: boolean;
  /** Canvas coordinates (relative to the container) to diagram coordinates. */
  toDiagram: (p: Point) => Point;
  /** Snapped to the grid when the preference asks for it. */
  snapPoint: (p: Point) => Point;
  /** Runs the step of a drag on the next animation frame (see frame.ts). */
  nextFrame: (run: () => void) => void;
}

export const DRAG_THRESHOLD = 3;
/** Fingers jitter: movement below this is still a tap. */
export const TOUCH_SLOP = 8;

export interface Hit {
  kind: string;
  id: string | null;
  key: string | null;
  field: string | null;
}

export function elementAt(el: Element | null): Hit | null {
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

export function rectFrom(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}
