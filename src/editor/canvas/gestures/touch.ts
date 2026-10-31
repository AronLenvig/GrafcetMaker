import type { MutableRefObject } from 'react';
import type { Id, Point } from '@/core/model/types';
import { ui } from '../../store/uiStore';
import { useInteraction } from '../interactionStore';
import { panBy, zoomAt } from '../viewport';
import { rectFrom, type Gesture, type GestureOf } from './gesture';

const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DISTANCE = 24;
/** Holding a finger still this long on the empty canvas starts a selection rectangle. */
const LONG_PRESS_MS = 450;

export function pinchOf(points: Map<number, Point>): GestureOf<'pinch'> {
  const [a, b] = [...points.values()];
  return {
    kind: 'pinch',
    dist: Math.hypot(b!.x - a!.x, b!.y - a!.y),
    mid: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
  };
}

/** Two fingers moved: zoom by their distance, pan by their midpoint. */
export function movePinch(
  gesture: MutableRefObject<Gesture>,
  gid: Id,
  g0: GestureOf<'pinch'>,
  touches: Map<number, Point>,
): void {
  if (touches.size < 2) return;
  const next = pinchOf(touches);
  panBy(gid, next.mid.x - g0.mid.x, next.mid.y - g0.mid.y);
  if (g0.dist > 0 && next.dist > 0) zoomAt(gid, next.dist / g0.dist, next.mid);
  gesture.current = next;
}

/** A finger of a pinch lifted: the other one keeps panning. */
export function endPinch(gesture: MutableRefObject<Gesture>, touches: Map<number, Point>): void {
  const rest = [...touches.values()][0];
  gesture.current = rest ? { kind: 'pan', last: rest, moved: true } : { kind: 'idle' };
  if (!rest) useInteraction.setState({ panning: false });
}

/**
 * A finger lifted without moving at `p`: whether it is the second tap of a double-tap (close in
 * time and place to the last one). The tap is remembered for the next one otherwise.
 */
export function isDoubleTap(
  lastTap: MutableRefObject<{ time: number; p: Point } | null>,
  timeStamp: number,
  p: Point,
): boolean {
  const prev = lastTap.current;
  if (
    prev &&
    timeStamp - prev.time < DOUBLE_TAP_MS &&
    Math.hypot(p.x - prev.p.x, p.y - prev.p.y) < DOUBLE_TAP_DISTANCE
  ) {
    lastTap.current = null;
    return true;
  }
  lastTap.current = { time: timeStamp, p };
  return false;
}

/**
 * A finger on the empty canvas pans; held still, it draws a selection rectangle from `d` instead.
 */
export function panOrLongPress(
  gesture: MutableRefObject<Gesture>,
  longPress: MutableRefObject<number | undefined>,
  p: Point,
  d: Point,
  capture: () => void,
): void {
  gesture.current = { kind: 'pan', last: p, start: p, tap: 'empty' };
  capture();
  window.clearTimeout(longPress.current);
  longPress.current = window.setTimeout(() => {
    const g1 = gesture.current;
    if (g1.kind !== 'pan' || g1.tap !== 'empty' || g1.moved) return;
    ui.clearSelection();
    gesture.current = { kind: 'marquee', startD: d, additive: false };
    useInteraction.setState({ marquee: rectFrom(d, d) });
    navigator.vibrate?.(10);
  }, LONG_PRESS_MS);
}
