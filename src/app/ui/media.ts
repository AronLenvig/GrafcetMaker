import { useSyncExternalStore } from 'react';

/**
 * Phones (portrait or landscape): one canvas with a bottom toolbar, the panels in a sheet and the
 * menus in a drawer. Tablets and desktops keep the side panels.
 */
export const COMPACT_QUERY = '(max-width: 639px), (max-height: 479px)';

/** Touch screens: no hover, fingers instead of a mouse (bigger targets, a selection toolbar). */
export const COARSE_QUERY = '(pointer: coarse)';

function matches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof matchMedia !== 'function') return () => {};
      const mq = matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => matches(query),
  );
}

export const useCompact = (): boolean => useMedia(COMPACT_QUERY);
export const useCoarsePointer = (): boolean => useMedia(COARSE_QUERY);
export const isCompact = (): boolean => matches(COMPACT_QUERY);
