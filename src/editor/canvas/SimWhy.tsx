import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { usePrefs } from '@/app/prefs';
import type { BoolNode } from '@/core/expr/ast';
import { cachedBool } from '@/core/expr/cache';
import { buildEnv } from '@/core/expr/check';
import { formatTextbook, runsToPlainText } from '@/core/expr/format';
import { stateValue, waitingTerms, type TimerNode } from '@/core/expr/signals';
import { flowOf, FONT_SIZE, transitionBar, transitionTextAnchor } from '@/core/layout/geometry';
import type { Grafcet, Id, Transition } from '@/core/model/types';
import type { Value } from '@/core/simulation/engine';
import { getProject } from '../store/document';
import { useUi, type Viewport } from '../store/uiStore';
import { useInteraction } from './interactionStore';
import { formatSimTime } from './SimOverlay';

interface SimState {
  active: ReadonlySet<Id>;
  values: Record<string, Value>;
}

/** Why a transition has not cleared: the steps it waits for, or its receptivity's false terms. */
function explain(
  t: TFunction,
  g: Grafcet,
  tr: Transition,
  sim: SimState,
  enabled: boolean,
  time: number,
  activatedAt: Record<Id, number> | null,
  textbook: boolean,
): string {
  if (!enabled) {
    const steps = tr.from
      .filter((id) => !sim.active.has(id))
      .map((id) => g.steps[id]?.number)
      .filter((n) => n !== undefined);
    return t('simulation.why.steps', { count: steps.length, steps: steps.join(', ') });
  }
  if (!tr.receptivity.trim()) return t('simulation.why.empty');
  const r = cachedBool(tr.receptivity);
  if (!r.ok) return t('simulation.why.invalid');
  const env = buildEnv(getProject(), g.id);
  const stepOf = (n: number) => {
    const s = env.resolveStep(n);
    return typeof s === 'object' ? s.stepId : null;
  };
  const stepActive = (n: number) => {
    const id = stepOf(n);
    return id !== null && sim.active.has(id);
  };
  /** Time left before `t/Xn` (step n active) is true; null when it cannot be told. */
  const left = (n: TimerNode): number | null => {
    if (n.operand.type !== 'step' || !activatedAt) return null;
    const id = stepOf(n.operand.number);
    if (id === null || !sim.active.has(id) || activatedAt[id] === undefined) return null;
    return n.t1 - (time - activatedAt[id]);
  };
  const value = (x: BoolNode) =>
    stateValue(
      x,
      (name) => (Object.hasOwn(sim.values, name) ? sim.values[name] : undefined),
      stepActive,
      (n) => (left(n) ?? 1) <= 0,
    );
  const { any, terms } = waitingTerms(r.value, value);
  if (!terms.length) return t('simulation.why.ready');
  const text = (x: BoolNode) => {
    const s = textbook ? runsToPlainText(formatTextbook(x)) : tr.receptivity.slice(x.start, x.end);
    const ms = x.type === 'timer' ? left(x) : null;
    return ms !== null && ms > 0
      ? t('simulation.why.timeLeft', { term: s, time: formatSimTime(ms) })
      : s;
  };
  return t(any ? 'simulation.why.any' : 'simulation.why.all', {
    terms: terms.map(text).join(', '),
  });
}

/**
 * Simulation: under the hovered transition (or the selected one, for fingers), what it is waiting
 * for: the steps that must be active first, or the terms of its receptivity still false.
 */
export function SimWhy({
  g,
  sim,
  enabled,
  time,
  activatedAt,
  viewport,
}: {
  g: Grafcet;
  sim: SimState;
  enabled: ReadonlySet<Id>;
  time: number;
  activatedAt: Record<Id, number> | null;
  viewport: Viewport;
}) {
  const { t } = useTranslation();
  const textbook = usePrefs((s) => s.textbookNotation);
  const hover = useInteraction((s) => s.hover);
  const selected = useUi(useShallow((s) => Object.keys(s.selection)));
  const id =
    hover && g.transitions[hover]
      ? hover
      : selected.length === 1 && g.transitions[selected[0]!]
        ? selected[0]!
        : null;
  const tr = id ? g.transitions[id] : undefined;
  if (!tr) return null;
  const message = explain(t, g, tr, sim, enabled.has(tr.id), time, activatedAt, textbook);
  const at = transitionTextAnchor(tr);
  // Under the receptivity; under the bar when the text is above it (right to left).
  const bar = transitionBar(tr);
  const below = flowOf(tr) === 'left' ? bar.y + bar.height : at.y + FONT_SIZE / 2;
  const z = viewport.zoom;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 max-w-80 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-pop"
      style={{
        left: (at.x - viewport.x) * z,
        top: (below - viewport.y) * z + 6,
      }}
    >
      {message}
    </div>
  );
}
