import { useSyncExternalStore } from 'react';

/**
 * Phones (portrait or landscape): one canvas with a bottom toolbar, the panels in a sheet and the
 * menus in a drawer. Tablets and desktops keep the side panels.
 */
export const COMPACT_QUERY = '(max-width: 639px), (max-height: 479px)';

/** Touch screens: no hover, fingers instead of a mouse (bigger targets, a selection toolbar). */
export const COARSE_QUERY = '(pointer: coarse)';

interface MediaQuery {
  subscribe: (onChange: () => void) => () => void;
  matches: () => boolean;
}

/**
 * One MediaQueryList and one stable subscribe function per query: hooks on the canvas re-render on
 * every pan frame, and a new subscribe function would make React resubscribe each time.
 */
const queries = new Map<string, MediaQuery>();

function mediaQuery(query: string): MediaQuery {
  let q = queries.get(query);
  if (!q) {
    const mql = typeof matchMedia === 'function' ? matchMedia(query) : null;
    q = {
      subscribe: (onChange) => {
        mql?.addEventListener('change', onChange);
        return () => mql?.removeEventListener('change', onChange);
      },
      matches: () => mql?.matches ?? false,
    };
    queries.set(query, q);
  }
  return q;
}

function useMedia(query: string): boolean {
  const q = mediaQuery(query);
  return useSyncExternalStore(q.subscribe, q.matches);
}

export const useCompact = (): boolean => useMedia(COMPACT_QUERY);
export const useCoarsePointer = (): boolean => useMedia(COARSE_QUERY);
export const isCompact = (): boolean => mediaQuery(COMPACT_QUERY).matches();
