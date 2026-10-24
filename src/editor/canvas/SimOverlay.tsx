import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '@/app/prefs';
import { flowOf, LABEL_FONT_SIZE, STEP_HALF, transitionBar } from '@/core/layout/geometry';
import type { Grafcet, Id } from '@/core/model/types';
import { useSim } from '../simulation/simStore';
import { baseline } from './svg';

export function formatSimTime(ms: number): string {
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 600_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  return `${m} min ${((ms % 60_000) / 1000).toFixed(0)} s`;
}

/**
 * Simulation markers drawn over the diagram: enabled transitions (a ▶ marker), transitions just
 * cleared (flash, skipped with reduced motion), and the time each active step has been active.
 */
function SimOverlayView({
  g,
  active,
  enabled,
  time,
  activatedAt,
}: {
  g: Grafcet;
  active: ReadonlySet<Id>;
  enabled: ReadonlySet<Id>;
  time: number;
  activatedAt: Record<Id, number> | null;
}) {
  const { t } = useTranslation();
  const flash = useSim((s) => s.flash);
  const showFlash = usePrefs((s) => s.simFlash);
  const showTimers = usePrefs((s) => s.simStepTimers);
  return (
    <g className="gm-overlay">
      {Object.values(g.transitions).map((tr) => {
        if (!enabled.has(tr.id)) return null;
        // A triangle pointing at the bar: from its left end, or from below a vertical bar.
        const bar = transitionBar(tr);
        const x = bar.x - 4;
        const y = tr.position.y;
        const by = bar.y + bar.height + 4;
        const d =
          flowOf(tr) === 'left'
            ? `M${tr.position.x - 5} ${by + 8}L${tr.position.x} ${by}L${tr.position.x + 5} ${by + 8}Z`
            : `M${x - 8} ${y - 5}L${x} ${y}L${x - 8} ${y + 5}Z`;
        return (
          <path key={tr.id} className="gm-enabled" d={d}>
            <title>{t('simulation.enabled')}</title>
          </path>
        );
      })}
      {flash &&
        showFlash &&
        flash.ids.map((id) => {
          const tr = g.transitions[id];
          if (!tr) return null;
          const bar = transitionBar(tr);
          return (
            <rect
              key={`${flash.at}:${id}`}
              className="gm-fired"
              x={bar.x - 4.5}
              y={bar.y - 4.5}
              width={bar.width + 9}
              height={bar.height + 9}
              rx={3}
            />
          );
        })}
      {activatedAt &&
        showTimers &&
        Object.values(g.steps).map((s) => {
          if (!active.has(s.id) || activatedAt[s.id] === undefined) return null;
          const x = s.position.x + STEP_HALF + 4;
          const y = s.position.y + STEP_HALF + 10;
          return (
            <text key={s.id} className="gm-label gm-timer" x={x} y={baseline(y, LABEL_FONT_SIZE)}>
              {formatSimTime(time - activatedAt[s.id]!)}
            </text>
          );
        })}
    </g>
  );
}

/** Memoized: the canvas re-renders on every pan and zoom frame. */
export const SimOverlay = memo(SimOverlayView);
