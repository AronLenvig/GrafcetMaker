import { create } from 'zustand';

/**
 * Phones: the side and bottom panels share one sheet over the lower part of the canvas (see
 * MobileSheet). Not persisted: the sheet starts closed so the diagram gets the whole screen.
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

export const useSheet = create<{ open: boolean; tab: SheetTab }>(() => ({
  open: false,
  tab: 'properties',
}));

export function showSheet(tab: string): void {
  const known = SHEET_TABS.find((x) => x === tab);
  useSheet.setState({ open: true, ...(known ? { tab: known } : {}) });
}

export function closeSheet(): void {
  useSheet.setState({ open: false });
}
