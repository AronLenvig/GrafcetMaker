import { create } from 'zustand';
import { openProperties, showSheet, useSheet } from './sheet';
import { isCompact } from './ui/media';

/** Per-device UI preferences persisted in localStorage (best effort: storage may be unavailable). */
export interface Prefs {
  /** Width of the floating panel card on the right (Variables, Problems…). */
  panelWidth: number;
  /** Textbook display of expressions (overbar NOT, · and +) instead of the typed ASCII. */
  textbookNotation: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  /** Contextual hints under the toolbar. */
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
  /** Live sessions: the name shown to the others. */
  liveName: string;
  /** Live sessions: random id of this device (picks its color for the others). */
  liveId: string;
}

const KEY = 'grafcetmaker.prefs';

export const DEFAULT_PREFS: Prefs = {
  panelWidth: 420,
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
  liveName: '',
  liveId: '',
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
  // The live session identity is not a preference: the others know this device by it.
  usePrefs.setState((s) => ({ ...DEFAULT_PREFS, liveName: s.liveName, liveId: s.liveId }));
}

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
}

/** Opens a panel (Variables, Problems, Simulation, Chronogram, Outline). */
export function showBottomTab(id: string): void {
  // Desktops: the simulation has its own card, unfolded here.
  if (id === 'simulation' && !isCompact()) useSheet.setState({ simCollapsed: false });
  else showSheet(id);
}

/** Opens the properties (the floating card; on phones, the panel sheet) or another panel. */
export function showSideTab(tab: 'properties' | 'variables' | 'outline'): void {
  if (tab === 'properties' && !isCompact()) openProperties();
  else showSheet(tab);
}
