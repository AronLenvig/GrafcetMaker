import type { Point } from '@/core/model/types';

/** Baseline offset that vertically centers text of a given size on a y coordinate. */
export const baseline = (y: number, size: number) => y + size * 0.35;

export const pointsToPath = (pts: readonly Point[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('');
