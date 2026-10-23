/**
 * Diagrams of the help pages, built with the same model and SVG exporter as user projects so they
 * always match what the editor draws.
 */
import { createGrafcet } from '@/core/model/factory';
import { addAction, addComment, addStep, addTransition } from '@/core/model/ops';
import type { ActionKind, Grafcet, Id, StepKind } from '@/core/model/types';

const X = 100;
const at = (row: number, x = X) => ({ x, y: 60 + row * 60 });

interface Builder {
  g: Grafcet;
  step(
    n: number,
    row: number,
    opts?: { x?: number; kind?: StepKind; actions?: [ActionKind, string, string?][] },
  ): Id;
  tr(from: Id[], to: Id[], receptivity: string, row: number, x?: number): Id;
  note(text: string, row: number, x: number): void;
}

export function build(make: (b: Builder) => void): Grafcet {
  const g = createGrafcet('G1');
  const b: Builder = {
    g,
    step(n, row, opts = {}) {
      const s = addStep(g, at(row, opts.x), opts.kind ?? 'normal', n);
      for (const [kind, text, condition] of opts.actions ?? []) {
        const a = addAction(g, s.id, kind, text);
        if (condition) a.condition = condition;
      }
      return s.id;
    },
    tr(from, to, receptivity, row, x) {
      return addTransition(g, at(row, x), from, to, receptivity).id;
    },
    note(text, row, x) {
      addComment(g, { x, y: at(row).y - 15 }, text);
    },
  };
  make(b);
  return g;
}

export const FIGURES: Record<string, () => Grafcet> = {
  /** A first sequence with a loop back to the initial step. */
  sequence: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial' });
      const s1 = b.step(1, 2, { actions: [['continuous', 'Pump']] });
      const s2 = b.step(2, 4, { actions: [['continuous', 'Valve']] });
      b.tr([s0], [s1], 'start', 1);
      b.tr([s1], [s2], 'full', 3);
      b.tr([s2], [s0], 'empty', 5);
    }),

  /** The parts of a grafcet, labelled. */
  anatomy: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial' });
      const s1 = b.step(1, 2, { actions: [['continuous', 'Motor']] });
      b.tr([s0], [s1], 'start', 1);
      b.tr([s1], [s0], 'stop', 3);
      b.note('initial step', 0, 170);
      b.note('transition + receptivity', 1, 170);
      b.note('step with an action', 2, 270);
      b.note('loop back (upward arrow)', 3, 170);
    }),

  /** OR divergence and convergence: one of two branches. */
  or: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial', x: 150 });
      const s1 = b.step(1, 2, { x: 100, actions: [['continuous', 'Left']] });
      const s2 = b.step(2, 2, { x: 260, actions: [['continuous', 'Right']] });
      const s3 = b.step(3, 4, { x: 150 });
      b.tr([s0], [s1], 'a', 1, 100);
      b.tr([s0], [s2], '/a * b', 1, 260);
      b.tr([s1], [s3], 'c', 3, 100);
      b.tr([s2], [s3], 'd', 3, 260);
    }),

  /** AND divergence and convergence: both branches at once. */
  and: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial', x: 150 });
      const s1 = b.step(1, 2, { x: 100, actions: [['continuous', 'Drill']] });
      const s2 = b.step(2, 2, { x: 260, actions: [['continuous', 'Clamp']] });
      const s3 = b.step(3, 4, { x: 150 });
      b.tr([s0], [s1, s2], 'start', 1, 150);
      b.tr([s1, s2], [s3], 'done1 * done2', 3, 150);
    }),

  /** Continuous actions, with and without an assignment condition. */
  continuous: () =>
    build((b) => {
      b.step(4, 0, {
        actions: [
          ['continuous', 'Lamp'],
          ['continuous', 'Horn', 'alarm'],
        ],
      });
    }),

  /** Stored actions: on activation, on deactivation, on event. */
  stored: () =>
    build((b) => {
      b.step(5, 0, {
        actions: [
          ['storedOnActivation', 'C := C + 1'],
          ['storedOnDeactivation', 'Motor := 0'],
          ['storedOnEvent', 'C := 0', '↑reset'],
        ],
      });
    }),

  /** A timer receptivity. */
  timer: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial' });
      const s1 = b.step(1, 2, { actions: [['continuous', 'Heater']] });
      b.tr([s0], [s1], 'start', 1);
      b.tr([s1], [s0], '5s/X1', 3);
    }),

  /** Rising and falling edges. */
  edges: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial' });
      const s1 = b.step(1, 2, { actions: [['continuous', 'Lamp']] });
      b.tr([s0], [s1], '↑button', 1);
      b.tr([s1], [s0], '↓button', 3);
    }),

  /** A macro-step in its grafcet. */
  macro: () =>
    build((b) => {
      const s0 = b.step(0, 0, { kind: 'initial' });
      const m = b.step(10, 2, { kind: 'macro' });
      b.tr([s0], [m], 'start', 1);
      b.tr([m], [s0], 'end', 3);
      b.note('macro-step: double-click to open its expansion', 2, 150);
    }),
};
