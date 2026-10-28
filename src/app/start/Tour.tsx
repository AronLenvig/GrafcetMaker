import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Grafcet, Id, Project } from '@/core/model/types';
import { useSim } from '@/editor/simulation/simStore';
import { useActiveGrafcet, useDoc } from '@/editor/store/document';
import { useUi, type EditTarget } from '@/editor/store/uiStore';
import { Button, cx } from '../ui/primitives';
import { endTour, useTour } from './tourStore';

/**
 * The tour draws and simulates a first sequence with the user, one action per step, and moves on
 * when the action is done. Its card sits where it hides nothing (`corner`: the canvas is worked
 * on) or next to the control it is about.
 */
const STEPS = [
  { id: 'initialStep', place: 'corner' },
  { id: 'sequence', place: 'corner' },
  { id: 'action', place: 'corner' },
  { id: 'simulate', place: 'below' },
  { id: 'done', place: 'above' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

const CARD_W = 320;
const GAP = 12;
/** How long a step shows as done before the next one. */
const ADVANCE_MS = 900;

interface State {
  project: Project;
  g: Grafcet | undefined;
  selection: Record<Id, true>;
  editing: EditTarget | null;
  simOn: boolean;
  active: readonly Id[] | undefined;
  known: ReadonlySet<Id>;
}

const single = (s: State) => {
  const ids = Object.keys(s.selection);
  return ids.length === 1 ? ids[0]! : null;
};
const grafcets = (s: State) => Object.values(s.project.grafcets);

/** The user did what the step asks. */
function isDone(id: StepId, s: State): boolean {
  switch (id) {
    case 'initialStep': {
      const sel = single(s);
      return !!sel && !!s.g?.steps[sel];
    }
    case 'sequence':
      return (
        !s.editing &&
        grafcets(s).some((g) =>
          Object.values(g.transitions).some((t) => !s.known.has(t.id) && t.receptivity.trim()),
        )
      );
    case 'action':
      return (
        !s.editing &&
        grafcets(s).some((g) =>
          Object.values(g.actions).some((a) => !s.known.has(a.id) && a.text.trim()),
        )
      );
    case 'simulate':
      // A transition has cleared: a step other than an initial one is active.
      return (
        s.simOn &&
        (s.active ?? []).some((id) =>
          grafcets(s).some((g) => g.steps[id] && g.steps[id].kind !== 'initial'),
        )
      );
    case 'done':
      return false;
  }
}

/** What the step is about on the screen (CSS selector), outlined for the user. */
function targetOf(id: StepId, s: State): string {
  const el = (eid: Id) => `[data-el][data-id="${eid}"]`;
  const steps = Object.values(s.g?.steps ?? {});
  const start = steps.find((x) => x.kind === 'initial') ?? steps[0];
  const sel = single(s);
  switch (id) {
    case 'initialStep':
      return start ? el(start.id) : '[data-tour="canvas"]';
    case 'sequence':
    case 'action':
      return sel ? el(sel) : start ? el(start.id) : '[data-tour="canvas"]';
    case 'simulate':
      return s.simOn ? '[data-tour="sim-card"]' : '[data-tour="simulate"]';
    case 'done':
      return '[data-tour="help"]';
  }
}

const sameRect = (a: DOMRect | null, b: DOMRect | null) =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

/**
 * A skippable five-step tour that is done rather than read: the initial step, a transition and
 * step, an action, a simulation, then where help is. The page stays usable; Esc in the card ends
 * the tour.
 */
export function Tour() {
  const { t } = useTranslation();
  const step = useTour((s) => s.step);
  const known = useTour((s) => s.known);
  const project = useDoc((s) => s.project);
  const g = useActiveGrafcet();
  const selection = useUi((s) => s.selection);
  const editing = useUi((s) => s.editing);
  const simOn = useSim((s) => s.on);
  const active = useSim((s) => s.snapshot?.active);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(180);
  const card = useRef<HTMLDivElement>(null);

  const current = step === null ? null : STEPS[step];
  const state: State = { project, g, selection, editing, simOn, active, known };
  const selector = current ? targetOf(current.id, state) : null;
  const done = !!current && isDone(current.id, state);

  // The target moves with the diagram (pan, zoom, new elements): follow it every frame.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  useEffect(() => {
    if (step === null) return;
    let frame = 0;
    const measure = () => {
      const target = selectorRef.current && document.querySelector(selectorRef.current);
      const r = target ? target.getBoundingClientRect() : null;
      setRect((prev) => (sameRect(prev, r) ? prev : r));
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  // The card's height (its text changes with the step) places it above its target.
  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
  }, [step, done, rect]);

  useEffect(() => {
    if (!done || step === null) return;
    const timer = setTimeout(() => useTour.setState({ step: step + 1 }), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [done, step]);

  if (step === null || !current) return null;
  const go = (d: number) => {
    const next = step + d;
    if (next >= STEPS.length) endTour();
    else if (next >= 0) useTour.setState({ step: next });
  };
  const last = step === STEPS.length - 1;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.max(16, Math.min(vw - CARD_W - 16, x));
  const clampY = (y: number) => Math.max(16, Math.min(vh - cardH - 16, y));
  const r = rect;
  // While simulating, the target is the simulation card: the tour card keeps to the corner.
  const pos =
    current.place === 'corner' || !r || (current.id === 'simulate' && simOn)
      ? { left: vw - CARD_W - 16, top: 72 }
      : current.place === 'below'
        ? { left: clampX(r.left + r.width / 2 - CARD_W / 2), top: clampY(r.bottom + GAP) }
        : { left: clampX(r.right - CARD_W), top: clampY(r.top - cardH - GAP) };

  return (
    <>
      {r && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 rounded-md outline-2 outline-offset-4 outline-accent motion-safe:animate-pulse"
          style={{
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
            outlineStyle: 'solid',
          }}
        />
      )}
      <section
        ref={card}
        aria-labelledby="tour-title"
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.stopPropagation();
          endTour();
        }}
        className="fixed z-50 flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 text-text shadow-pop"
        style={{ width: CARD_W, ...pos }}
      >
        <div className="flex items-baseline gap-2">
          <h2 id="tour-title" className="flex-1 font-semibold">
            {t(`tour.steps.${current.id}.title`)}
          </h2>
          <span className="text-xs text-muted tabular-nums">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <p aria-live="polite" className="leading-relaxed">
          {t(`tour.steps.${current.id}.text`)}
        </p>
        {!last && (
          <p
            aria-live="polite"
            className={cx('text-xs', done ? 'font-medium text-success' : 'text-muted')}
          >
            {done ? `✓ ${t('tour.wellDone')}` : t('tour.auto')}
          </p>
        )}
        <div className="flex items-center gap-2">
          {!last && (
            <Button variant="ghost" size="sm" onClick={endTour}>
              {t('tour.skip')}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {step > 0 && (
              <Button size="sm" onClick={() => go(-1)}>
                {t('tour.back')}
              </Button>
            )}
            <Button size="sm" variant={last ? 'primary' : 'default'} onClick={() => go(1)}>
              {last ? t('tour.done') : t('tour.next')}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
