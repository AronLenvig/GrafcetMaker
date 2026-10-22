import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Variable, VariableDirection, VariableType } from '@/core/model/types';
import { formatInitialValue, parseInitialValue, variableUsage } from '@/core/model/variables';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, SearchIcon, TrashIcon } from '@/app/ui/icons';
import { Button, cx, IconButton, Select } from '@/app/ui/primitives';
import {
  addVariable,
  confirmDeleteVariable,
  renameVariable,
  showVariable,
  updateVariable,
} from '@/editor/commands/variables';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import {
  countByDirection,
  DEFAULT_QUERY,
  DIRECTIONS,
  queryVariables,
  TYPES,
  type DirectionFilter,
  type SortKey,
  type TypeFilter,
  type VariableQuery,
} from './variables/model';
import { VariablesFileMenu } from './variables/VariablesFileMenu';

/** Fixed row height: lets long tables render only the rows in view. */
const ROW = 34;
const WINDOW_FROM = 120;
const OVERSCAN = 10;

/**
 * Table cell input: commits on Enter, blur or when scrolled out of view; Escape reverts;
 * invalid input keeps the cell open with its reason.
 */
function CellInput({
  value,
  label,
  onCommit,
  mono,
  autoFocus,
  placeholder,
}: {
  value: string;
  label: string;
  onCommit: (v: string) => string | null;
  mono?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const latest = useRef({ draft, value, onCommit });
  latest.current = { draft, value, onCommit };
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value);
  }, [value]);
  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [autoFocus]);
  // A row leaving the rendered window takes its pending edit along.
  useEffect(
    () => () => {
      const l = latest.current;
      if (l.draft !== l.value) l.onCommit(l.draft);
    },
    [],
  );
  const commit = () => {
    if (draft === value) return true;
    const err = onCommit(draft);
    setError(err);
    return !err;
  };
  return (
    <div className="relative">
      <input
        ref={ref}
        value={draft}
        aria-label={label}
        aria-invalid={!!error}
        title={error ?? undefined}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className={cx('gm-input gm-input-sm gm-input-ghost', mono && 'gm-input-mono')}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={() => {
          if (!commit()) {
            setDraft(value);
            setError(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            e.stopPropagation();
            setDraft(value);
            setError(null);
          }
        }}
      />
      {error && (
        <div
          role="alert"
          className="absolute top-full left-0 z-20 mt-0.5 w-max max-w-72 rounded bg-danger-soft px-2 py-1 text-xs text-danger shadow-pop"
        >
          {error}
        </div>
      )}
    </div>
  );
}

const VariableRow = memo(function VariableRow({
  v,
  uses,
  isNew,
}: {
  v: Variable;
  uses: number;
  isNew: boolean;
}) {
  const { t } = useTranslation();
  return (
    <tr className="border-b border-border hover:bg-surface-2" style={{ height: ROW }}>
      <td className="px-1">
        <CellInput
          value={v.name}
          mono
          autoFocus={isNew}
          label={t('variables.columns.name')}
          onCommit={(name) => {
            const err = renameVariable(v.id, name.trim());
            return err ? t(`variables.nameErrors.${err}`) : null;
          }}
        />
      </td>
      <td className="px-1">
        <Select
          small
          ghost
          aria-label={t('variables.columns.type')}
          value={v.type}
          onChange={(e) =>
            updateVariable(v.id, (x) => {
              x.type = e.target.value as VariableType;
              delete x.initialValue;
            })
          }
        >
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-1">
        <Select
          small
          ghost
          aria-label={t('variables.columns.direction')}
          value={v.direction}
          onChange={(e) =>
            updateVariable(v.id, (x) => void (x.direction = e.target.value as VariableDirection))
          }
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {t(`variables.directions.${d}`)}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-1">
        <CellInput
          value={formatInitialValue(v)}
          mono
          placeholder={v.type === 'BOOL' ? 'FALSE' : '0'}
          label={t('variables.columns.initial')}
          onCommit={(text) => {
            const r = parseInitialValue(v.type, text);
            if ('error' in r) return t(`variables.initialErrors.${v.type}`);
            updateVariable(v.id, (x) => {
              if (r.value === undefined) delete x.initialValue;
              else x.initialValue = r.value;
            });
            return null;
          }}
        />
      </td>
      <td className="px-1">
        <CellInput
          value={v.address ?? ''}
          mono
          label={t('variables.columns.address')}
          onCommit={(text) => {
            updateVariable(v.id, (x) => {
              if (text.trim()) x.address = text.trim();
              else delete x.address;
            });
            return null;
          }}
        />
      </td>
      <td className="px-1">
        <CellInput
          value={v.comment ?? ''}
          label={t('variables.columns.comment')}
          onCommit={(text) => {
            updateVariable(v.id, (x) => {
              if (text.trim()) x.comment = text.trim();
              else delete x.comment;
            });
            return null;
          }}
        />
      </td>
      <td className="px-1 text-right">
        <button
          type="button"
          onClick={() => showVariable(v.id)}
          title={t('variables.showUses', { name: v.name })}
          className={cx(
            'h-7 min-w-8 rounded px-2 tabular-nums hover:bg-accent-soft hover:text-text',
            uses ? 'text-muted' : 'text-warning',
          )}
        >
          {uses}
        </button>
      </td>
      <td className="px-1">
        <IconButton
          label={t('variables.delete', { name: v.name })}
          className="h-7 w-7"
          onClick={() => void confirmDeleteVariable(v.id)}
        >
          <TrashIcon size={14} />
        </IconButton>
      </td>
    </tr>
  );
});

function SortHeader({
  k,
  label,
  query,
  setQuery,
  className,
}: {
  k: SortKey;
  label: string;
  query: VariableQuery;
  setQuery: (q: VariableQuery) => void;
  className?: string;
}) {
  const active = query.sort === k;
  return (
    <th
      aria-sort={active ? (query.descending ? 'descending' : 'ascending') : 'none'}
      className={cx('px-1 py-1 font-medium', className)}
    >
      <button
        type="button"
        onClick={() =>
          setQuery({ ...query, sort: k, descending: active ? !query.descending : false })
        }
        className={cx(
          'inline-flex h-6 items-center gap-1 rounded px-1.5 hover:bg-surface-2 hover:text-text',
          active && 'text-text',
        )}
      >
        {label}
        {active ? (
          query.descending ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronUpIcon size={12} />
          )
        ) : (
          <span className="w-3" />
        )}
      </button>
    </th>
  );
}

/** Variable table: filter, sort and edit many variables; renaming updates every expression. */
export function VariablesPanel() {
  const { t } = useTranslation();
  const variables = useDoc((s) => s.project.variables);
  const grafcets = useDoc((s) => s.project.grafcets);
  const locked = useUi((s) => s.mode === 'simulate');
  const [query, setQuery] = useState<VariableQuery>(DEFAULT_QUERY);
  const [newId, setNewId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, height: 400 });

  const all = useMemo(() => Object.values(variables), [variables]);
  const usage = useMemo(() => variableUsage({ variables, grafcets }), [variables, grafcets]);
  const counts = useMemo(() => countByDirection(all), [all]);
  // A just-added variable stays visible whatever the filter, until another is added.
  const list = useMemo(() => {
    const found = queryVariables(all, usage, query);
    const added = newId ? variables[newId] : undefined;
    return added && !found.includes(added) ? [added, ...found] : found;
  }, [all, usage, query, newId, variables]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setView({ top: el.scrollTop, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const windowed = list.length > WINDOW_FROM;
  const first = windowed ? Math.max(0, Math.floor(view.top / ROW) - OVERSCAN) : 0;
  const last = windowed
    ? Math.min(list.length, Math.ceil((view.top + view.height) / ROW) + OVERSCAN)
    : list.length;

  const add = () => {
    const id = addVariable(query.direction === 'all' ? {} : { direction: query.direction });
    setNewId(id);
    scroller.current?.scrollTo({ top: 0 });
  };

  const filtered = query.text.trim() !== '' || query.direction !== 'all' || query.type !== 'all';

  return (
    <fieldset disabled={locked} className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
        <Button size="sm" onClick={add}>
          <PlusIcon size={14} /> {t('variables.add')}
        </Button>
        <div className="relative w-56">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
          />
          <input
            value={query.text}
            onChange={(e) => setQuery({ ...query, text: e.target.value })}
            placeholder={t('variables.filter')}
            aria-label={t('variables.filter')}
            className="gm-input gm-input-sm pl-8"
          />
        </div>
        <div
          role="radiogroup"
          aria-label={t('variables.columns.direction')}
          className="flex items-center gap-1"
        >
          {(['all', ...DIRECTIONS] as DirectionFilter[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={query.direction === d}
              onClick={() => setQuery({ ...query, direction: d })}
              className={cx(
                'flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs',
                query.direction === d
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-muted hover:text-text',
              )}
            >
              {d === 'all' ? t('variables.all') : t(`variables.directionsPlural.${d}`)}
              <span className="tabular-nums opacity-70">{counts[d]}</span>
            </button>
          ))}
        </div>
        <div className="w-32">
          <Select
            small
            aria-label={t('variables.columns.type')}
            value={query.type}
            onChange={(e) => setQuery({ ...query, type: e.target.value as TypeFilter })}
          >
            <option value="all">{t('variables.allTypes')}</option>
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {ty}
              </option>
            ))}
          </Select>
        </div>
        {filtered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setQuery({ ...DEFAULT_QUERY, sort: query.sort, descending: query.descending })
            }
          >
            {t('variables.clearFilters')}
          </Button>
        )}
        <span className="ml-auto text-xs text-muted" aria-live="polite">
          {filtered
            ? t('variables.shown', { shown: list.length, count: all.length })
            : t('variables.count', { count: all.length })}
        </span>
        <VariablesFileMenu />
      </div>
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(e) =>
          setView({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight })
        }
      >
        {all.length === 0 ? (
          <p className="p-4 text-muted">{t('variables.empty')}</p>
        ) : (
          <table className="w-full min-w-[820px] border-collapse" aria-rowcount={list.length + 1}>
            <thead className="sticky top-0 z-10 bg-surface text-left text-xs text-muted">
              <tr className="border-b border-border">
                <SortHeader
                  k="name"
                  label={t('variables.columns.name')}
                  query={query}
                  setQuery={setQuery}
                  className="w-48"
                />
                <SortHeader
                  k="type"
                  label={t('variables.columns.type')}
                  query={query}
                  setQuery={setQuery}
                  className="w-24"
                />
                <SortHeader
                  k="direction"
                  label={t('variables.columns.direction')}
                  query={query}
                  setQuery={setQuery}
                  className="w-28"
                />
                <th className="w-28 px-2.5 py-1 font-medium">{t('variables.columns.initial')}</th>
                <SortHeader
                  k="address"
                  label={t('variables.columns.address')}
                  query={query}
                  setQuery={setQuery}
                  className="w-28"
                />
                <th className="px-2.5 py-1 font-medium">{t('variables.columns.comment')}</th>
                <SortHeader
                  k="uses"
                  label={t('variables.columns.uses')}
                  query={query}
                  setQuery={setQuery}
                  className="w-20 text-right"
                />
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {first > 0 && <tr aria-hidden="true" style={{ height: first * ROW }} />}
              {list.slice(first, last).map((v) => (
                <VariableRow
                  key={v.id}
                  v={v}
                  uses={usage.get(v.name.toLowerCase()) ?? 0}
                  isNew={v.id === newId}
                />
              ))}
              {last < list.length && (
                <tr aria-hidden="true" style={{ height: (list.length - last) * ROW }} />
              )}
            </tbody>
          </table>
        )}
        {all.length > 0 && list.length === 0 && (
          <p className="p-4 text-muted">{t('variables.noMatch')}</p>
        )}
      </div>
    </fieldset>
  );
}
