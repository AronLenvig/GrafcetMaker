import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  commentRect,
  layoutActions,
  STEP_HALF,
  expressionWidth,
  transitionTextAnchor,
  type GrafcetGeometry,
} from '@/core/layout/geometry';
import type { Grafcet, Id, Point } from '@/core/model/types';
import { SEVERITY_ORDER, type Issue, type Severity } from '@/core/validation/types';
import { issueMessage } from '../validation/actions';
import { useProblems } from '../validation/problems';

function anchor(g: Grafcet, geom: GrafcetGeometry, id: Id): { at: Point; kind: string } | null {
  const s = g.steps[id];
  if (s) return { at: { x: s.position.x + STEP_HALF, y: s.position.y - STEP_HALF }, kind: 'step' };
  const t = g.transitions[id];
  if (t) {
    const a = transitionTextAnchor(t);
    return {
      at: { x: a.x + expressionWidth(t.receptivity || ' ') + 10, y: a.y },
      kind: 'transition',
    };
  }
  const act = g.actions[id];
  if (act) {
    const step = g.steps[act.stepId];
    const box =
      step && layoutActions(step, geom.index.actions.get(step.id) ?? []).find((b) => b.id === id);
    return box ? { at: { x: box.x + box.width, y: box.y }, kind: 'action' } : null;
  }
  const c = g.comments[id];
  if (c) {
    const r = commentRect(c);
    return { at: { x: r.x + r.width, y: r.y }, kind: 'comment' };
  }
  return null;
}

/** Badge glyph: circle "!" (error), triangle "!" (warning), circle "i" (info). */
const Badge = memo(function Badge({
  x,
  y,
  severity,
  title,
  kind,
  id,
}: {
  x: number;
  y: number;
  severity: Severity;
  title: string;
  kind: string;
  id: Id;
}) {
  return (
    <g
      className={`gm-badge gm-badge-${severity}`}
      data-badge={kind}
      data-id={id}
      transform={`translate(${x} ${y})`}
    >
      <title>{title}</title>
      {severity === 'warning' ? (
        <path className="gm-badge-shape" d="M0 -7L7 5.5H-7Z" />
      ) : (
        <circle className="gm-badge-shape" r={6.5} />
      )}
      {severity === 'info' ? (
        <path className="gm-badge-glyph" d="M0 -3.5V-3M0 -0.5V3.5" />
      ) : (
        <path
          className="gm-badge-glyph"
          d={severity === 'warning' ? 'M0 -2.5V1M0 3V3.4' : 'M0 -3.5V0.5M0 2.6V3.1'}
        />
      )}
    </g>
  );
});

/** On-element problem badges for the active grafcet (worst severity per element). */
export function IssueBadges({ g, geom }: { g: Grafcet; geom: GrafcetGeometry }) {
  const { t } = useTranslation();
  const byElement = useProblems((s) => s.byElement);
  const badges: { id: Id; severity: Severity; title: string; at: Point; kind: string }[] = [];
  for (const [id, list] of byElement) {
    const relevant: Issue[] = list.filter((i) => i.grafcetId === g.id && i.elementIds[0] === id);
    if (!relevant.length) continue;
    const a = anchor(g, geom, id);
    if (!a) continue;
    const worst = relevant.reduce(
      (w, i) => (SEVERITY_ORDER[i.severity] < SEVERITY_ORDER[w] ? i.severity : w),
      'info' as Severity,
    );
    badges.push({
      id,
      severity: worst,
      title: relevant.map((i) => issueMessage(t, i)).join('\n'),
      ...a,
    });
  }
  return (
    <g>
      {badges.map((b) => (
        <Badge
          key={b.id}
          id={b.id}
          kind={b.kind}
          x={b.at.x}
          y={b.at.y}
          severity={b.severity}
          title={b.title}
        />
      ))}
    </g>
  );
}
