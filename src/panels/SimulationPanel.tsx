import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project, Variable } from '@/core/model/types';
import type { Value } from '@/core/simulation/engine';
import type { CycleRecord } from '@/core/simulation/session';
import { TrashIcon } from '@/app/ui/icons';
import { Button, cx, IconButton, Switch } from '@/app/ui/primitives';
import { formatSimTime } from '@/editor/canvas/SimOverlay';
import { useDoc } from '@/editor/store/document';
import {
  deleteScenario,
  replayScenario,
  setCursor,
  setInput,
  useSim,
} from '@/editor/simulation/simStore';

const MAX_LOG_ROWS = 300;

function formatValue(v: Value | undefined): string {
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
}

/** On/off shown by shape (filled vs hollow) and text, not by color alone. */
function BoolValue({ on }: { on: boolean }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1 font-mono', on ? 'text-success' : 'text-muted')}
    >
      <svg width="10" height="10" aria-hidden="true">
        <circle
          cx="5"
          cy="5"
          r="4"
          fill={on ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      {on ? '1' : '0'}
    </span>
  );
}

const InputRow = memo(function InputRow({
  v,
  value,
  disabled,
}: {
  v: Variable;
  value: Value | undefined;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const name = v.name.toLowerCase();
  const [draft, setDraft] = useState(formatValue(value));
  useEffect(() => setDraft(formatValue(value)), [value]);
  if (v.type === 'BOOL') {
    const on = value === true;
    const press = (pressed: boolean) => void setInput(name, pressed);
    return (
      <li className="flex items-center gap-2 px-2 py-1">
        <span className="min-w-0 flex-1 truncate font-mono" title={v.comment}>
          {v.name}
        </span>
        <Switch
          tone="success"
          checked={on}
          label={t('simulation.toggle', { name: v.name })}
          disabled={disabled}
          onChange={(next) => void setInput(name, next)}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={t('simulation.hold', { name: v.name })}
          title={t('simulation.hold', { name: v.name })}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            press(true);
          }}
          onPointerUp={() => press(false)}
          onPointerCancel={() => press(false)}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              press(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') press(false);
          }}
          className="h-6 rounded border border-border px-2 text-xs select-none hover:bg-surface-2 active:bg-accent-soft disabled:opacity-50 pointer-coarse:h-9 pointer-coarse:px-3"
        >
          {t('simulation.momentary')}
        </button>
        <BoolValue on={on} />
      </li>
    );
  }
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n !== value)
      void setInput(name, v.type === 'INT' ? Math.trunc(n) : n);
    else setDraft(formatValue(value));
  };
  return (
    <li className="flex items-center gap-2 px-2 py-1">
      <span className="min-w-0 flex-1 truncate font-mono">{v.name}</span>
      <input
        type="number"
        value={draft}
        disabled={disabled}
        aria-label={t('simulation.numeric', { name: v.name, type: v.type })}
        step={v.type === 'REAL' ? 0.1 : v.type === 'TIME' ? 100 : 1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="gm-input gm-input-sm gm-input-mono w-28 text-right"
      />
      <span className="w-8 text-xs text-muted">{v.type === 'TIME' ? 'ms' : ''}</span>
    </li>
  );
});

function describeCycle(
  t: (k: string, o?: Record<string, unknown>) => string,
  c: CycleRecord,
  project: Project,
): string[] {
  const stepLabel = (id: string) => {
    for (const g of Object.values(project.grafcets))
      if (g.steps[id]) return `${g.name}.X${g.steps[id].number}`;
    return '?';
  };
  const transitionLabel = (id: string) => {
    for (const g of Object.values(project.grafcets)) {
      const tr = g.transitions[id];
      if (tr)
        return `${g.name}: ${tr.from.map((s) => g.steps[s]?.number ?? '?').join(',') || '–'} → ${tr.to.map((s) => g.steps[s]?.number ?? '?').join(',') || '–'}`;
    }
    return '?';
  };
  const lines = c.iterations.map((it, i) =>
    t('simulation.iteration', {
      n: i + 1,
      cleared: it.cleared.map(transitionLabel).join('; '),
      on: it.activated.map(stepLabel).join(' ') || '–',
      off: it.deactivated.map(stepLabel).join(' ') || '–',
    }),
  );
  for (const f of c.forced) {
    const g = project.grafcets[f.grafcet];
    lines.push(
      t('simulation.forcedLine', {
        grafcet: g?.name ?? '?',
        steps: f.active.map(stepLabel).join(' ') || '{}',
      }),
    );
  }
  if (c.error) lines.push(t('simulation.transientLoop'));
  return lines;
}

function CycleLogList() {
  const { t } = useTranslation();
  const cycles = useSim((s) => s.cycles);
  const cursor = useSim((s) => s.cursor);
  const project = useDoc((s) => s.project);
  const rows = cycles.slice(-MAX_LOG_ROWS).reverse();
  if (!rows.length) return <p className="p-2 text-muted">{t('simulation.logEmpty')}</p>;
  return (
    <ol className="divide-y divide-border">
      {rows.map((c) => (
        <li key={c.cycle}>
          <button
            type="button"
            onClick={() => setCursor(c.time)}
            aria-current={cursor === c.time ? 'time' : undefined}
            className={cx(
              'w-full px-2 py-1 text-left hover:bg-surface-2',
              cursor === c.time && 'bg-accent-soft',
            )}
          >
            <div className="flex gap-2 text-xs">
              <span className="font-medium">{t('simulation.cycle', { n: c.cycle })}</span>
              <span className="text-muted tabular-nums">{formatSimTime(c.time)}</span>
              <span className="text-muted">{t(`simulation.trigger.${c.trigger}`)}</span>
              <span className="truncate font-mono text-muted">
                {c.inputs.map((i) => `${i.name}=${formatValue(i.value)}`).join(' ')}
              </span>
            </div>
            {describeCycle(t as never, c, project).map((line, i) => (
              <div key={i} className="truncate pl-2 font-mono text-xs">
                {line}
              </div>
            ))}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Scenarios() {
  const { t } = useTranslation();
  const scenarios = useDoc((s) => s.project.scenarios);
  const list = Object.values(scenarios ?? {});
  if (!list.length) return <p className="p-2 text-muted">{t('simulation.noScenarios')}</p>;
  return (
    <ul className="divide-y divide-border">
      {list.map((sc) => (
        <li key={sc.id} className="flex items-center gap-2 px-2 py-1">
          <span className="min-w-0 flex-1 truncate">{sc.name}</span>
          <span className="text-xs text-muted">
            {t('simulation.events', { count: sc.events.length })}
          </span>
          <Button size="sm" onClick={() => void replayScenario(sc)}>
            {t('simulation.replay')}
          </Button>
          <IconButton
            label={t('simulation.deleteScenario', { name: sc.name })}
            className="h-6 w-6"
            onClick={() => deleteScenario(sc.id)}
          >
            <TrashIcon size={13} />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

/** Bottom panel during simulation: inputs, live values, cycle log and scenarios. */
export function SimulationPanel() {
  const { t } = useTranslation();
  const on = useSim((s) => s.on);
  const values = useSim((s) => s.snapshot?.values);
  const error = useSim((s) => s.snapshot?.error);
  const replaying = useSim((s) => !!s.replay);
  const variables = useDoc((s) => s.project.variables);
  if (!on) {
    return <p className="p-4 text-muted">{t('simulation.notRunning')}</p>;
  }
  const byDir = (d: Variable['direction']) =>
    Object.values(variables)
      .filter((v) => v.direction === d)
      .sort((a, b) => a.name.localeCompare(b.name));
  const inputs = byDir('input');
  const shown = [...byDir('output'), ...byDir('internal')];
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(240px,1fr)_minmax(200px,1fr)_minmax(280px,1.6fr)] divide-x divide-border compact:flex compact:h-auto compact:flex-col compact:divide-x-0 compact:divide-y">
      <section aria-label={t('simulation.inputs')} className="flex min-h-0 flex-col">
        <h2 className="border-b border-border px-2 py-1 text-xs font-semibold text-muted uppercase">
          {t('simulation.inputs')}
        </h2>
        <ul className="min-h-0 flex-1 overflow-auto">
          {inputs.length === 0 && <li className="p-2 text-muted">{t('simulation.noInputs')}</li>}
          {inputs.map((v) => (
            <InputRow
              key={v.id}
              v={v}
              value={values?.[v.name.toLowerCase()]}
              disabled={!!error || replaying}
            />
          ))}
        </ul>
      </section>
      <section aria-label={t('simulation.values')} className="flex min-h-0 flex-col">
        <h2 className="border-b border-border px-2 py-1 text-xs font-semibold text-muted uppercase">
          {t('simulation.values')}
        </h2>
        <ul className="min-h-0 flex-1 overflow-auto">
          {shown.map((v) => {
            const value = values?.[v.name.toLowerCase()];
            return (
              <li key={v.id} className="flex items-center gap-2 px-2 py-1">
                <span className="min-w-0 flex-1 truncate font-mono">{v.name}</span>
                <span className="text-xs text-muted">
                  {t(`variables.directions.${v.direction}`)}
                </span>
                {typeof value === 'boolean' ? (
                  <BoolValue on={value} />
                ) : (
                  <span className="font-mono tabular-nums">{formatValue(value)}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-label={t('simulation.log')} className="flex min-h-0 flex-col">
        <h2 className="border-b border-border px-2 py-1 text-xs font-semibold text-muted uppercase">
          {t('simulation.log')}
        </h2>
        <div className="min-h-0 flex-1 overflow-auto">
          <CycleLogList />
        </div>
        <h2 className="border-y border-border px-2 py-1 text-xs font-semibold text-muted uppercase">
          {t('simulation.scenarios')}
        </h2>
        <div className="max-h-32 overflow-auto">
          <Scenarios />
        </div>
      </section>
    </div>
  );
}
