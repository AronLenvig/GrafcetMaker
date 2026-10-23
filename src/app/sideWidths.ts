import { useSyncExternalStore } from 'react';
import { useSim } from '@/editor/simulation/simStore';
import { useHelp } from './help/helpStore';
import { usePrefs } from './prefs';
import { PANEL_TABS, usePropertiesVisible, useSheet, type SheetTab } from './sheet';

/** Width the panel card takes on the right (card + gap), 0 when closed. */
export function usePanelSpace(): number {
  const open = useSheet((s) => s.open && (PANEL_TABS as readonly SheetTab[]).includes(s.tab));
  const width = usePrefs((s) => s.panelWidth);
  return open ? width + 8 : 0;
}

/**
 * Desktops: how far the floating cards reach into the canvas from each side, in px from the
 * window edge: left, the properties card (or the simulation card while simulating); right, the
 * panel card and the help. Fit/reveal and the hints keep clear of them.
 */
export function useSideWidths(): { left: number; right: number } {
  const properties = usePropertiesVisible();
  const simulating = useSim((s) => s.on);
  const simCollapsed = useSheet((s) => s.simCollapsed);
  const help = useHelp((s) => s.open);
  const panel = usePanelSpace();
  const left = simulating ? (simCollapsed ? 0 : 344) : properties ? 312 : 0;
  const right = (panel ? panel + 12 : 0) + (help ? Math.min(440, window.innerWidth * 0.4) + 20 : 0);
  return { left, right };
}

/** The window width, updated on resize. */
export function useWindowWidth(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange);
      return () => window.removeEventListener('resize', onChange);
    },
    () => window.innerWidth,
  );
}
