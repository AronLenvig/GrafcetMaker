import { create } from 'zustand';
import type { Id } from '@/core/model/types';
import { getProject } from '@/editor/store/document';
import { setPrefs } from '../prefs';

interface TourState {
  /** Index of the step shown, or null when the tour is not running. */
  step: number | null;
  /** Transitions and actions that existed when the tour began: it moves on when new ones appear. */
  known: ReadonlySet<Id>;
}

export const useTour = create<TourState>(() => ({ step: null, known: new Set() }));

export function startTour(): void {
  const known = new Set<Id>();
  for (const g of Object.values(getProject().grafcets))
    for (const id of [...Object.keys(g.transitions), ...Object.keys(g.actions)]) known.add(id);
  useTour.setState({ step: 0, known });
}

export function endTour(): void {
  useTour.setState({ step: null });
  setPrefs({ tourDone: true });
}
