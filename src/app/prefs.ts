import { create } from 'zustand';
import { showSheet } from './sheet';
import { isCompact } from './ui/media';

/** Per-device UI preferences persisted in localStorage (best effort: storage may be unavailable). */
export interface Prefs {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  bottomTab: string;
  /** Right panel: element properties or the variable list. */
  rightTab: 'properties' | 'variables' | 'outline';
  /** Textbook display of expressions (overbar NOT, · and +) instead of the typed ASCII. */
  textbookNotation: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  /** Contextual hints at the bottom of the canvas. */
  showHints: boolean;
  /** Split view: share of the first pane. */
  splitRatio: number;
  /** Show the start screen when the app opens. */
  showStartScreen: boolean;
  /** The guided tour was finished or skipped. */
  tourDone: boolean;
  /** Simulation speed used when a simulation starts ("fast" or a factor such as "1"). */
  simSpeed: string;
  /** Simulation: briefly highlight transitions as they clear (never with reduced motion). */
  simFlash: boolean;
  /** Simulation: show for how long each active step has been active. */
  simStepTimers: boolean;
}

const KEY = 'grafcetmaker.prefs';

export const DEFAULT_PREFS: Prefs = {
  leftWidth: 48,
  rightWidth: 300,
  bottomHeight: 220,
  leftCollapsed: false,
  rightCollapsed: false,
  bottomCollapsed: false,
  bottomTab: 'variables',
  rightTab: 'properties',
  textbookNotation: true,
  showGrid: true,
  snapToGrid: true,
  showHints: true,
  splitRatio: 0.5,
  showStartScreen: true,
  tourDone: false,
  simSpeed: '1',
  simFlash: true,
  simStepTimers: true,
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const out = { ...DEFAULT_PREFS };
    for (const k of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
      if (typeof parsed[k] === typeof DEFAULT_PREFS[k])
        (out as Record<string, unknown>)[k] = parsed[k];
    }
    return out;
  } catch {
    return DEFAULT_PREFS;
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

/** Back to the defaults (layout, view and simulation preferences). */
export function resetPrefs(): void {
  usePrefs.setState(DEFAULT_PREFS);
}

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
}

/** Opens the bottom panel on a tab (Variables, Problems, …); on phones, the panel sheet. */
export function showBottomTab(id: string): void {
  setPrefs({ bottomTab: id, bottomCollapsed: false });
  if (isCompact()) showSheet(id);
}

/** Opens the side panel on a tab (Properties, Variables, Outline); on phones, the panel sheet. */
export function showSideTab(tab: Prefs['rightTab']): void {
  setPrefs({ rightTab: tab, rightCollapsed: false });
  if (isCompact()) showSheet(tab);
}
