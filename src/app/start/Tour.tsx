import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/primitives';
import { endTour, useTour } from './tourStore';

/** The five stops of the tour: an element marked `data-tour` and where the card goes. */
const STEPS = [
  { id: 'canvas', place: 'inside' },
  { id: 'tools', place: 'below' },
  { id: 'side', place: 'below' },
  { id: 'problems', place: 'below' },
  { id: 'bottom', place: 'above' },
] as const;

const CARD_W = 340;

function goTo(next: number): void {
  if (next >= STEPS.length) endTour();
  else if (next >= 0) useTour.setState({ step: next });
}
const GAP = 12;

/**
 * A skippable five-step tour: dims the page around one region and explains it. Keyboard: → / Enter
 * next, ← back, Esc ends the tour.
 */
export function Tour() {
  const { t } = useTranslation();
  const step = useTour((s) => s.step);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(180);
  const card = useRef<HTMLDivElement>(null);
  const current = step === null ? null : STEPS[step];

  useLayoutEffect(() => {
    if (!current) return;
    const measure = () =>
      setRect(
        document.querySelector(`[data-tour="${current.id}"]`)?.getBoundingClientRect() ?? null,
      );
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [current]);

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
    card.current?.focus();
  }, [step, rect]);

  useEffect(() => {
    if (step === null) return;
    const go = (d: number) => goTo(step + d);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [step]);

  if (step === null || !current) return null;
  const go = (d: number) => goTo(step + d);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = rect ?? new DOMRect(vw / 2, vh / 2, 0, 0);
  const clampX = (x: number) => Math.max(16, Math.min(vw - CARD_W - 16, x));
  const clampY = (y: number) => Math.max(16, Math.min(vh - cardH - 16, y));
  const pos =
    current.place === 'inside'
      ? {
          left: clampX(r.left + r.width / 2 - CARD_W / 2),
          top: clampY(r.top + r.height / 2 - cardH / 2),
        }
      : current.place === 'below'
        ? { left: clampX(r.left + r.width / 2 - CARD_W / 2), top: clampY(r.bottom + GAP) }
        : { left: clampX(r.right - CARD_W), top: clampY(r.top - cardH - GAP) };

  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      {/* Everything but the highlighted region is dimmed (a full-screen path with a hole). */}
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0" width={vw} height={vh}>
        <path
          fill="var(--overlay)"
          fillRule="evenodd"
          d={`M0 0H${vw}V${vh}H0Z M${r.left} ${r.top}H${r.right}V${r.bottom}H${r.left}Z`}
        />
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed rounded-sm outline outline-2 outline-accent"
        style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
      />
      <div
        ref={card}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        tabIndex={-1}
        className="fixed flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-text shadow-pop outline-none"
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
        <p id="tour-text" className="leading-relaxed">
          {t(`tour.steps.${current.id}.text`)}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={endTour}>
            {t('tour.skip')}
          </Button>
          <div className="ml-auto flex gap-2">
            {step > 0 && (
              <Button size="sm" onClick={() => go(-1)}>
                {t('tour.back')}
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={() => go(1)}>
              {step === STEPS.length - 1 ? t('tour.done') : t('tour.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
