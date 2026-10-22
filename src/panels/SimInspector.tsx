import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeCondition } from '@/core/expr/check';
import type { Value } from '@/core/simulation/engine';
import { formatSimTime } from '@/editor/canvas/SimOverlay';
import { useActiveGrafcet, useDoc } from '@/editor/store/document';
import { stateAt, useSim } from '@/editor/simulation/simStore';
import { useUi } from '@/editor/store/uiStore';
import { useExprEnv } from './ExpressionInput';
import { Section } from './fields';

const fmt = (v: Value | undefined) =>
  v === undefined ? '—' : typeof v === 'boolean' ? (v ? '1' : '0') : String(v);

/** Right panel during simulation: live state of the selection, or a summary. */
export function SimInspector() {
  const { t } = useTranslation();
  const g = useActiveGrafcet();
  const env = useExprEnv(g?.id ?? null);
  const selection = useUi((s) => s.selection);
  const snapshot = useSim((s) => s.snapshot);
  const cursor = useSim((s) => s.cursor);
  const variables = useDoc((s) => s.project.variables);
  const past = useMemo(() => (cursor !== null ? stateAt(cursor) : null), [cursor]);
  if (!g || !snapshot) return null;
  const active = past ? past.active : new Set(snapshot.active);
  const values = past ? past.values : snapshot.values;
  const time = cursor ?? snapshot.time;
  const id = Object.keys(selection).length === 1 ? Object.keys(selection)[0]! : null;
  const step = id ? g.steps[id] : undefined;
  const tr = id ? g.transitions[id] : undefined;

  const varList = (names: Iterable<string>) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
      {[...names].map((n) => {
        const v = Object.values(variables).find((x) => x.name.toLowerCase() === n);
        return (
          <div key={n} className="contents">
            <dt>{v?.name ?? n}</dt>
            <dd className="tabular-nums">{fmt(values[n])}</dd>
          </div>
        );
      })}
    </dl>
  );

  return (
    <div className="h-full overflow-y-auto">
      {step && (
        <Section title={t('props.step.title', { n: step.number })}>
          <p>{active.has(step.id) ? t('simulation.stepActive') : t('simulation.stepInactive')}</p>
          {!past && active.has(step.id) && snapshot.activatedAt[step.id] !== undefined && (
            <p className="text-muted">
              {t('simulation.activeFor', {
                time: formatSimTime(time - snapshot.activatedAt[step.id]!),
                since: formatSimTime(snapshot.activatedAt[step.id]!),
              })}
            </p>
          )}
        </Section>
      )}
      {tr && (
        <Section title={t('props.transition.title')}>
          <p className="font-mono">{tr.receptivity || '—'}</p>
          <p>
            {tr.from.every((s) => active.has(s))
              ? t('simulation.enabled')
              : t('simulation.notEnabled')}
          </p>
          {varList(analyzeCondition(tr.receptivity, env).references)}
        </Section>
      )}
      {!step && !tr && (
        <Section title={t('simulation.inspector')}>
          <p className="tabular-nums">
            {t('simulation.clock', { time: formatSimTime(time), cycle: snapshot.cycle })}
          </p>
          <p>
            {t('simulation.activeSteps')}:{' '}
            <span className="font-mono">
              {Object.values(g.steps)
                .filter((s) => active.has(s.id))
                .map((s) => s.number)
                .sort((a, b) => a - b)
                .join(', ') || '—'}
            </span>
          </p>
          <p className="text-muted">{t('simulation.inspectorHint')}</p>
        </Section>
      )}
    </div>
  );
}
