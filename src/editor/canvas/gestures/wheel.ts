import { useEffect, type RefObject } from 'react';
import type { Id, Point } from '@/core/model/types';
import { panBy, zoomAt } from '../viewport';

/** Wheel: pan, Ctrl/Cmd (and trackpad pinch) zooms around the pointer. Must be non-passive. */
export function useWheel(
  containerRef: RefObject<HTMLDivElement | null>,
  gid: Id | null,
  local: (e: { clientX: number; clientY: number }) => Point,
): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !gid) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) zoomAt(gid, Math.exp(-dy * 0.002), local(e));
      else if (e.shiftKey && dx === 0) panBy(gid, -dy, 0);
      else panBy(gid, -dx, -dy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, gid, local]);
}
