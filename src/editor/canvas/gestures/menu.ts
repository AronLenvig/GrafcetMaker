import { useEffect, useRef, type RefObject } from 'react';

/** The browser's context menu event this soon after the right button is released belongs to it. */
const MENU_AFTER_RELEASE_MS = 500;

/**
 * The context menu opens when the right button is released without panning. The browser's own
 * context menu event for the right button (on press, or on release on Windows) is swallowed;
 * `openMenu` replays one under the pointer instead.
 */
export function useMenuReplay(containerRef: RefObject<HTMLDivElement | null>) {
  // The right button: held down, or when it was released; and the menu being opened by openMenu.
  const rightButton = useRef({ down: false, upAt: -Infinity });
  const replaying = useRef(false);

  useEffect(() => {
    const swallow = (e: MouseEvent) => {
      const right = rightButton.current;
      if (replaying.current) return;
      if (!right.down && e.timeStamp - right.upAt >= MENU_AFTER_RELEASE_MS) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('contextmenu', swallow, true);
    return () => window.removeEventListener('contextmenu', swallow, true);
  }, []);

  /** Opens the context menu under the pointer, as the browser would: a right-click released. */
  const openMenu = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    const under = document.elementFromPoint(clientX, clientY);
    const target = under && container?.contains(under) ? under : container;
    if (!target) return;
    replaying.current = true;
    try {
      target.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          button: 2,
          view: window,
        }),
      );
    } finally {
      replaying.current = false;
    }
  };

  return { rightButton, openMenu };
}
