import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Variable, VariableDirection } from '@/core/model/types';
import { variableUsage } from '@/core/model/variables';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, SearchIcon } from '@/app/ui/icons';
import { Button, cx, IconButton } from '@/app/ui/primitives';
import { addVariable } from '@/editor/commands/variables';
import { getProject, useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { VariableDetails } from './VariableDetails';
import { countByDirection, DIRECTIONS, queryVariables, type DirectionFilter } from './model';
import { VariablesFileMenu } from './VariablesFileMenu';

const TYPE_TONE: Record<string, string> = {
  BOOL: 'bg-accent-soft text-accent',
  INT: 'bg-success-soft text-success',
  REAL: 'bg-info-soft text-info',
  TIME: 'bg-warning-soft text-warning',
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cx('rounded px-1.5 py-px font-mono text-[10px] font-semibold', TYPE_TONE[type])}
    >
      {type}
    </span>
  );
}

/**
 * Compact variable browser for the side panel: search, direction filter, collapsible groups,
 * keyboard navigation (↑ ↓, Enter to open, Esc to close) and an inline editor with uses.
 */
export function VariablesSidePanel() {
  const { t } = useTranslation();
  const variables = useDoc((s) => s.project.variables);
  const grafcets = useDoc((s) => s.project.grafcets);
  const locked = useUi((s) => s.mode === 'simulate');
  const focused = useUi((s) => s.focusedVariable);
  const [text, setText] = useState('');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [collapsed, setCollapsed] = useState<Record<VariableDirection, boolean>>({
    input: false,
    output: false,
    internal: false,
  });
  const [cursor, setCursor] = useState<string | null>(null);
  /** The variable just created with Add: its name field takes the focus. */
  const [added, setAdded] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => Object.values(variables), [variables]);
  const usage = useMemo(() => variableUsage({ variables, grafcets }), [variables, grafcets]);
  const counts = useMemo(() => countByDirection(all), [all]);
  const list = useMemo(
    () =>
      queryVariables(all, usage, { text, direction, type: 'all', sort: 'name', descending: false }),
    [all, usage, text, direction],
  );
  const groups = DIRECTIONS.map((d) => ({
    d,
    items: list.filter((v) => v.direction === d),
  })).filter((g) => g.items.length);
  const visible = groups.flatMap((g) => (collapsed[g.d] ? [] : g.items));
  // The row reached with Tab: the cursor, or the first row when the cursor is filtered out.
  const tabStop = visible.some((v) => v.id === cursor) ? cursor : visible[0]?.id;

  // Opening a variable from elsewhere (table, Problems) scrolls it into view. Only when the
  // opened variable changes: editing it must not move the list.
  useEffect(() => {
    if (!focused) return;
    setCursor(focused);
    const v = getProject().variables[focused];
    if (v) setCollapsed((c) => ({ ...c, [v.direction]: false }));
    requestAnimationFrame(() =>
      document.getElementById(`var-${focused}`)?.scrollIntoView({ block: 'nearest' }),
    );
  }, [focused]);

  const open = (id: string | null) => useUi.setState({ focusedVariable: id });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.target instanceof HTMLElement) || !e.target.matches('[data-var-row]')) return;
    const i = visible.findIndex((v) => v.id === cursor);
    const move = (n: number) => {
      const next = visible[Math.max(0, Math.min(visible.length - 1, n))];
      if (!next) return;
      setCursor(next.id);
      document.getElementById(`var-${next.id}`)?.focus();
    };
    if (e.key === 'ArrowDown') move(i + 1);
    else if (e.key === 'ArrowUp') move(i - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(visible.length - 1);
    else if (e.key === 'Escape') open(null);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const add = () => {
    const id = addVariable(direction === 'all' ? {} : { direction });
    setText('');
    setAdded(id);
    open(id);
  };

  const row = (v: Variable) => {
    const expanded = focused === v.id;
    const uses = usage.get(v.name.toLowerCase()) ?? 0;
    return (
      <li key={v.id} className={cx('border-b border-border', expanded && 'bg-surface-2')}>
        <button
          id={`var-${v.id}`}
          type="button"
          data-var-row
          aria-expanded={expanded}
          tabIndex={v.id === tabStop ? 0 : -1}
          onFocus={() => setCursor(v.id)}
          onClick={() => open(expanded ? null : v.id)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2 focus-visible:-outline-offset-2"
        >
          {expanded ? (
            <ChevronDownIcon size={13} className="text-muted" />
          ) : (
            <ChevronRightIcon size={13} className="text-muted" />
          )}
          <span className="min-w-0 flex-1 truncate font-mono">{v.name}</span>
          {v.address && <span className="truncate font-mono text-xs text-muted">{v.address}</span>}
          <TypeBadge type={v.type} />
          <span
            className={cx(
              'w-6 text-right text-xs tabular-nums',
              uses ? 'text-muted' : 'text-warning',
            )}
            title={t('variables.usesTitle', { count: uses })}
          >
            {uses}
          </span>
        </button>
        {expanded && (
          <div className="px-3 pt-1 pb-3">
            <VariableDetails v={v} locked={locked} focusName={added === v.id} />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
            />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('variables.filter')}
              aria-label={t('variables.filter')}
              className="gm-input gm-input-sm pl-8"
            />
          </div>
          <IconButton
            label={t('variables.add')}
            title={t('variables.add')}
            disabled={locked}
            onClick={add}
          >
            <PlusIcon size={16} />
          </IconButton>
          <VariablesFileMenu />
        </div>
        <div
          role="radiogroup"
          aria-label={t('variables.columns.direction')}
          className="flex flex-wrap gap-0.5"
        >
          {(['all', ...DIRECTIONS] as DirectionFilter[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => setDirection(d)}
              className={cx(
                'flex h-6 items-center gap-1 rounded-full border px-2 text-[11px]',
                direction === d
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-muted hover:text-text',
              )}
            >
              {d === 'all' ? t('variables.all') : t(`variables.directionsPlural.${d}`)}
              <span className="tabular-nums opacity-70">{counts[d]}</span>
            </button>
          ))}
        </div>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto" onKeyDown={onKeyDown}>
        {all.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-4 text-muted">
            <p>{t('variables.empty')}</p>
            <Button size="sm" disabled={locked} onClick={add}>
              <PlusIcon size={14} /> {t('variables.add')}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="p-4 text-muted">{t('variables.noMatch')}</p>
        ) : (
          groups.map((g) => (
            <section key={g.d} aria-label={t(`variables.directionsPlural.${g.d}`)}>
              <button
                type="button"
                aria-expanded={!collapsed[g.d]}
                onClick={() => setCollapsed((c) => ({ ...c, [g.d]: !c[g.d] }))}
                className="sticky top-0 z-10 flex w-full items-center gap-1.5 border-b border-border bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase hover:text-text"
              >
                {collapsed[g.d] ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                {t(`variables.directionsPlural.${g.d}`)}
                <span className="ml-auto tabular-nums">{g.items.length}</span>
              </button>
              {!collapsed[g.d] && <ul>{g.items.map(row)}</ul>}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
