import { create } from 'zustand';
import type { Rect } from '@/core/layout/geometry';
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
}

export const useInteraction = create<InteractionState>(() => ({
  marquee: null,
  link: null,
  hover: null,
  panning: false,
  moving: false,
}));
