import { create } from 'zustand';
import { useUi } from '@/editor/store/uiStore';

/**
 * The panels, shown only when needed. Phones: one sheet over the lower part of the canvas with
 * every panel as a tab. Desktops: a floating card on the right for Variables, Problems,
 * Chronogram and Outline, the properties card on the left while something is selected, and the
 * simulation card on the left while simulating. Not persisted: every visit starts with the whole
 * diagram.
 */
export type SheetTab =
  'properties' | 'variables' | 'problems' | 'simulation' | 'chronogram' | 'outline';

export const SHEET_TABS: readonly SheetTab[] = [
  'properties',
  'variables',
  'problems',
  'simulation',
  'chronogram',
  'outline',
];

/** Desktops: the right card's tabs (properties and simulation have their own cards). */
export const PANEL_TABS = [
  'variables',
  'problems',
  'chronogram',
  'outline',
] as const satisfies readonly SheetTab[];

interface PanelState {
  open: boolean;
  tab: SheetTab;
  /** Properties card opened with nothing selected (grafcet and project properties). */
  pinned: boolean;
  /** Properties card closed for this selection (it shows again for the next one). */
  hiddenFor: string | null;
  /** Desktops: the simulation card folded to its title. */
  simCollapsed: boolean;
  /** The simulation's evolution log unfolded (folded until asked for). */
  simLogOpen: boolean;
}

export const useSheet = create<PanelState>(() => ({
  open: false,
  tab: 'properties',
  pinned: false,
  hiddenFor: null,
  simCollapsed: false,
  simLogOpen: false,
}));

export function showSheet(tab: string): void {
  const known = SHEET_TABS.find((x) => x === tab);
  useSheet.setState({ open: true, ...(known ? { tab: known } : {}) });
}

export function closeSheet(): void {
  useSheet.setState({ open: false });
}

/** The panel button: opens that panel, or closes it when it is the one showing. */
export function togglePanel(tab: SheetTab): void {
  const s = useSheet.getState();
  if (s.open && s.tab === tab) closeSheet();
  else showSheet(tab);
}

type UiSlice = Pick<ReturnType<typeof useUi.getState>, 'selection' | 'selectedLink'>;

/** What the properties card is about: the selected elements or link ('' = nothing selected). */
function selectionKey(s: UiSlice): string {
  return Object.keys(s.selection).sort().join(',') || s.selectedLink || '';
}

function propertiesVisible(): boolean {
  const ui = useUi.getState();
  const { pinned, hiddenFor } = useSheet.getState();
  if (ui.focusedVariable) return true;
  const key = selectionKey(ui);
  return key ? hiddenFor !== key : pinned;
}

/** Desktops: whether the floating properties card shows. */
export function usePropertiesVisible(): boolean {
  const key = useUi(selectionKey);
  const variable = useUi((s) => s.focusedVariable);
  const pinned = useSheet((s) => s.pinned);
  const hiddenFor = useSheet((s) => s.hiddenFor);
  if (variable) return true;
  return key ? hiddenFor !== key : pinned;
}

export function openProperties(): void {
  const key = selectionKey(useUi.getState());
  useSheet.setState(key ? { hiddenFor: null } : { pinned: true });
}

/** The properties toggle and the card's ×. */
export function toggleProperties(): void {
  if (!propertiesVisible()) return openProperties();
  const ui = useUi.getState();
  if (ui.focusedVariable) useUi.setState({ focusedVariable: null });
  const key = selectionKey(ui);
  useSheet.setState(key ? { hiddenFor: key } : { pinned: false });
}

// Selecting something replaces the grafcet and project properties opened with nothing selected.
useUi.subscribe((s, prev) => {
  if (selectionKey(s) && !selectionKey(prev) && useSheet.getState().pinned)
    useSheet.setState({ pinned: false });
});
