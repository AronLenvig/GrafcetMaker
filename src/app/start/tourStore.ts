import { create } from 'zustand';
import { setPrefs } from '../prefs';

/** The guided tour: index of the step shown, or null when it is not running. */
export const useTour = create<{ step: number | null }>(() => ({ step: null }));

export function startTour(): void {
  useTour.setState({ step: 0 });
}

export function endTour(): void {
  useTour.setState({ step: null });
  setPrefs({ tourDone: true });
}
