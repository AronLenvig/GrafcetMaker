/**
 * Offline support: the service worker precaches the whole app (it then works without a network,
 * also on-premise). A new version is installed in the background and applied when the user
 * chooses to reload; the version seen last is remembered to offer "What's new".
 */
import i18next from 'i18next';
import { registerSW } from 'virtual:pwa-register';
import { create } from 'zustand';
import { toast } from './toasts';

export const usePwa = create<{
  /** A new version is installed and waiting. */
  needRefresh: boolean;
  /** The app was just updated from this version (for "What's new"). */
  updatedFrom: string | null;
}>(() => ({ needRefresh: false, updatedFrom: null }));

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

const VERSION_KEY = 'grafcetmaker.version';
const HOUR = 60 * 60 * 1000;

export function startPwa(): void {
  try {
    const seen = localStorage.getItem(VERSION_KEY);
    if (seen && seen !== __APP_VERSION__) usePwa.setState({ updatedFrom: seen });
    localStorage.setItem(VERSION_KEY, __APP_VERSION__);
  } catch {
    // Storage unavailable: no "What's new".
  }
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  applyUpdate = registerSW({
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    onOfflineReady: () => toast(i18next.t('pwa.offlineReady'), 'success', 5000),
    // Long sessions look for updates every hour (a request to this site only).
    onRegisteredSW: (_url, registration) => {
      if (registration) setInterval(() => void registration.update(), HOUR);
    },
  });
}

/** Activates the waiting version and reloads (the work is kept by autosave). */
export function reloadToUpdate(): void {
  void applyUpdate?.(true);
}

export function dismissUpdate(): void {
  usePwa.setState({ needRefresh: false });
}
