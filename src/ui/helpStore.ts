import { create } from 'zustand';
import { useLanguage } from '@/i18n';

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
  // The full path: a bare `#…` would resolve against the <base> (the app's root) and drop `de/`.
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

export function openHelp(page: string = HELP_HOME, anchor: string | null = null): void {
  useHelp.setState({ open: true, page, anchor });
  writeHash(useHelp.getState());
}

export function closeHelp(): void {
  useHelp.setState({ open: false, anchor: null });
  writeHash(useHelp.getState());
}

/** The website's GRAFCET guide (src/site), bundled with the app, in the language of the app. */
export function guideUrl(): string {
  return `./${useLanguage.getState().language}/guide/`;
}

/** Opens the page named in the URL (a shared #help/... link). */
export function openHelpFromHash(): void {
  const m = /^#help(?:\/([\w-]+)(?:\/([\w-]+))?)?$/.exec(location.hash);
  if (m) openHelp(m[1] ?? HELP_HOME, m[2] ?? null);
}
