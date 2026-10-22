import { useTranslation } from 'react-i18next';
import {
  LABEL_FONT_SIZE,
  STEP_HALF,
  TRANSITION_WIDTH,
  type GrafcetGeometry,
} from '@/core/layout/geometry';
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
export function SimOverlay({
  g,
  active,
  enabled,
  time,
  activatedAt,
}: {
  g: Grafcet;
  geom: GrafcetGeometry;
  active: ReadonlySet<Id>;
  enabled: ReadonlySet<Id>;
  time: number;
  activatedAt: Record<Id, number> | null;
}) {
  const { t } = useTranslation();
  const flash = useSim((s) => s.flash);
  return (
    <g className="gm-overlay">
      {Object.values(g.transitions).map((tr) => {
        if (!enabled.has(tr.id)) return null;
        const x = tr.position.x - TRANSITION_WIDTH / 2 - 4;
        const y = tr.position.y;
        return (
          <path
            key={tr.id}
            className="gm-enabled"
            d={`M${x - 8} ${y - 5}L${x} ${y}L${x - 8} ${y + 5}Z`}
          >
            <title>{t('simulation.enabled')}</title>
          </path>
        );
      })}
      {flash &&
        flash.ids.map((id) => {
          const tr = g.transitions[id];
          if (!tr) return null;
          return (
            <rect
              key={`${flash.at}:${id}`}
              className="gm-fired"
              x={tr.position.x - TRANSITION_WIDTH / 2 - 4}
              y={tr.position.y - 6}
              width={TRANSITION_WIDTH + 8}
              height={12}
              rx={3}
            />
          );
        })}
      {activatedAt &&
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
