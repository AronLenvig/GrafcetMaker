import { create } from 'zustand';
import type { ActionDrop, Rect } from '@/core/layout/geometry';
import type { Id, Point } from '@/core/model/types';

export interface LinkDrag {
  from: Id;
  fromKind: 'step' | 'transition';
  port: 'in' | 'out';
  origin: Point;
  current: Point;
  /** Valid element under the pointer, if any. */
  target: Id | null;
}

/** Transient pointer-interaction state rendered by the overlay layer only. */
export interface InteractionState {
  marquee: Rect | null;
  link: LinkDrag | null;
  hover: Id | null;
  panning: boolean;
  /** True while elements are being dragged (handles are hidden). */
  moving: boolean;
  /** Where the action being dragged would be attached (null: dropped without a step). */
  dropTarget: ActionDrop | null;
  /**
   * Where a placing tool would place its element (snapped, diagram units), and the step an action
   * would be attached to; null when a click would place nothing.
   */
  cursor: { at: Point; stepId: Id | null } | null;
  /** Where the context menu was opened (snapped, diagram units): "Add step here". */
  menuAt: Point | null;
  /**
   * The text being typed in place (the field of `ui.editing`), drawn live: the boxes around it grow
   * as it is typed; the document changes only when the edit is applied.
   */
  draft: string | null;
  /**
   * Simulation: the numeric variable (lower case) whose value is being typed in place, over the
   * value shown at `at` (diagram units).
   */
  valueEdit: { name: string; at: Point } | null;
}

export const useInteraction = create<InteractionState>(() => ({
  marquee: null,
  link: null,
  hover: null,
  panning: false,
  moving: false,
  dropTarget: null,
  cursor: null,
  menuAt: null,
  draft: null,
  valueEdit: null,
}));
