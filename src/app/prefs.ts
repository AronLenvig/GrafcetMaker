import { create } from 'zustand';

/** Per-device UI preferences persisted in localStorage (best effort: storage may be unavailable). */
export interface Prefs {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  bottomTab: string;
  /** Textbook display of expressions (overbar NOT, · and +) instead of the typed ASCII. */
  textbookNotation: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
}

const KEY = 'grafcetmaker.prefs';

const DEFAULTS: Prefs = {
  leftWidth: 48,
  rightWidth: 300,
  bottomHeight: 220,
  leftCollapsed: false,
  rightCollapsed: false,
  bottomCollapsed: false,
  bottomTab: 'variables',
  textbookNotation: true,
  showGrid: true,
  snapToGrid: true,
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as (keyof Prefs)[]) {
      if (typeof parsed[k] === typeof DEFAULTS[k]) (out as Record<string, unknown>)[k] = parsed[k];
    }
    return out;
  } catch {
    return DEFAULTS;
  }
}

export const usePrefs = create<Prefs>(load);

usePrefs.subscribe((state) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable or full: preferences simply aren't remembered.
  }
});

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
}
