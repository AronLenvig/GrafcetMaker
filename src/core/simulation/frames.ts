import type { Id } from '../model/types';
import type { CycleLog } from './engine';

/** One situation the diagram goes through, and the transitions cleared to reach it. */
export interface Frame {
  active: Id[];
  cleared: Id[];
}

/**
 * The situations a batch of cycles goes through, one per evolution: each iteration of the search
 * for stability, unstable situations included, and then the stable situation each cycle ends in
 * (with forcing applied). For showing the evolution step by step; the simulation itself is not
 * slowed down (IEC 60848: an unstable situation lasts no time).
 */
export function framesOf(from: readonly Id[], cycles: readonly CycleLog[]): Frame[] {
  const frames: Frame[] = [];
  let active = new Set(from);
  const same = (ids: readonly Id[]) =>
    ids.length === active.size && ids.every((id) => active.has(id));
  for (const c of cycles) {
    c.iterations.forEach((it, i) => {
      // Deactivated, then activated: a step both deactivated and activated stays active.
      for (const id of it.deactivated) active.delete(id);
      for (const id of it.activated) active.add(id);
      if (i === c.iterations.length - 1) active = new Set(c.active);
      frames.push({ active: [...active], cleared: it.cleared });
    });
    if (!c.iterations.length && !same(c.active)) {
      active = new Set(c.active);
      frames.push({ active: [...active], cleared: [] });
    }
  }
  return frames;
}
