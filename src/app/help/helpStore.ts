import { create } from 'zustand';

/** The help panel: open state and the page shown, mirrored in the URL as #help/<page>[/<anchor>]. */
export interface HelpState {
  open: boolean;
  page: string;
  anchor: string | null;
}

export const HELP_HOME = 'index';

export const useHelp = create<HelpState>(() => ({ open: false, page: HELP_HOME, anchor: null }));

function writeHash(s: HelpState): void {
  const hash = s.open ? `#help/${s.page}${s.anchor ? `/${s.anchor}` : ''}` : '';
  if (location.hash === hash || (!hash && !location.hash)) return;
  history.replaceState(null, '', hash || `${location.pathname}${location.search}`);
}

export function openHelp(page: string = HELP_HOME, anchor: string | null = null): void {
  useHelp.setState({ open: true, page, anchor });
  writeHash(useHelp.getState());
}

export function closeHelp(): void {
  useHelp.setState({ open: false, anchor: null });
  writeHash(useHelp.getState());
}

export function toggleHelp(): void {
  if (useHelp.getState().open) closeHelp();
  else openHelp(useHelp.getState().page);
}

/** The website's GRAFCET guide (src/site), bundled with the app, in the browser's language if any. */
export function guideUrl(): string {
  const lang = navigator.language.slice(0, 2).toLowerCase();
  return `./${['fr', 'de', 'es'].includes(lang) ? lang : 'en'}/`;
}

/** Opens the page named in the URL (a shared #help/... link). */
export function openHelpFromHash(): void {
  const m = /^#help(?:\/([\w-]+)(?:\/([\w-]+))?)?$/.exec(location.hash);
  if (m) openHelp(m[1] ?? HELP_HOME, m[2] ?? null);
}
