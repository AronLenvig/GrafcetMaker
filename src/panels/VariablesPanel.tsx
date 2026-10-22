import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Variable, VariableDirection, VariableType } from '@/core/model/types';
import { formatInitialValue, parseInitialValue, variableUsage } from '@/core/model/variables';
import { showDialog } from '@/app/dialogs/dialogStore';
import { PlusIcon, SearchIcon, TrashIcon } from '@/app/ui/icons';
import { Button, cx, IconButton } from '@/app/ui/primitives';
import {
  addVariable,
  deleteVariable,
  renameVariable,
  updateVariable,
} from '@/editor/commands/variables';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';

const TYPES: VariableType[] = ['BOOL', 'INT', 'REAL', 'TIME'];
const DIRECTIONS: VariableDirection[] = ['input', 'output', 'internal'];
const DIRECTION_ORDER: Record<VariableDirection, number> = { input: 0, output: 1, internal: 2 };

const cellInput =
  'h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-text outline-none hover:border-border focus:border-accent focus:bg-surface aria-[invalid=true]:border-danger';

/** Table cell input: commits on Enter/blur, Escape reverts, invalid input shows its reason. */
function CellInput({
  value,
  label,
  onCommit,
  mono,
  autoFocus,
}: {
  value: string;
  label: string;
  onCommit: (v: string) => string | null;
  mono?: boolean;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value);
  }, [value]);
  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [autoFocus]);
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
        spellCheck={false}
        className={cx(cellInput, mono && 'font-mono')}
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
            setDraft(value);
            setError(null);
          }
        }}
      />
      {error && (
        <div
          role="alert"
          className="absolute top-full left-0 z-20 mt-0.5 w-max max-w-72 rounded bg-danger-soft px-2 py-1 text-xs text-danger"
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
  const confirmDelete = async () => {
    if (uses > 0) {
      const choice = await showDialog({
        title: t('variables.deleteTitle', { name: v.name }),
        message: t('variables.deleteUsed', { count: uses }),
        actions: [
          { id: 'cancel', label: t('common.cancel') },
          { id: 'delete', label: t('common.delete'), variant: 'danger' },
        ],
        cancelId: 'cancel',
      });
      if (choice !== 'delete') return;
    }
    deleteVariable(v.id);
  };
  return (
    <tr className="border-b border-border hover:bg-surface-2">
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
        <select
          aria-label={t('variables.columns.type')}
          className={cellInput}
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
        </select>
      </td>
      <td className="px-1">
        <select
          aria-label={t('variables.columns.direction')}
          className={cellInput}
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
        </select>
      </td>
      <td className="px-1">
        <CellInput
          value={formatInitialValue(v)}
          mono
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
      <td className="px-2 text-right tabular-nums text-muted">{uses}</td>
      <td className="px-1">
        <IconButton
          label={t('variables.delete', { name: v.name })}
          className="h-7 w-7"
          onClick={() => void confirmDelete()}
        >
          <TrashIcon size={14} />
        </IconButton>
      </td>
    </tr>
  );
});

/** Variable table: declare inputs/outputs/internals; renaming updates every expression. */
export function VariablesPanel() {
  const { t } = useTranslation();
  const variables = useDoc((s) => s.project.variables);
  const grafcets = useDoc((s) => s.project.grafcets);
  const [filter, setFilter] = useState('');
  const [newId, setNewId] = useState<string | null>(null);
  const usage = useMemo(() => variableUsage({ variables, grafcets }), [variables, grafcets]);
  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return Object.values(variables)
      .filter(
        (v) =>
          !f ||
          v.name.toLowerCase().includes(f) ||
          (v.comment ?? '').toLowerCase().includes(f) ||
          (v.address ?? '').toLowerCase().includes(f),
      )
      .sort(
        (a, b) =>
          DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction] ||
          a.name.localeCompare(b.name),
      );
  }, [variables, filter]);
  const total = Object.keys(variables).length;
  const locked = useUi((s) => s.mode === 'simulate');

  return (
    <fieldset disabled={locked} className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <Button size="sm" onClick={() => setNewId(addVariable())}>
          <PlusIcon size={14} /> {t('variables.add')}
        </Button>
        <div className="relative">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute top-1.5 left-2 text-muted"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('variables.filter')}
            aria-label={t('variables.filter')}
            className="h-7 w-48 rounded border border-border bg-surface pr-2 pl-7 outline-none focus:border-accent"
          />
        </div>
        <span className="ml-auto text-xs text-muted">{t('variables.count', { count: total })}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {total === 0 ? (
          <p className="p-4 text-muted">{t('variables.empty')}</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="sticky top-0 z-10 bg-surface text-left text-xs text-muted">
              <tr className="border-b border-border">
                <th className="w-44 px-2 py-1.5 font-medium">{t('variables.columns.name')}</th>
                <th className="w-24 px-2 py-1.5 font-medium">{t('variables.columns.type')}</th>
                <th className="w-28 px-2 py-1.5 font-medium">{t('variables.columns.direction')}</th>
                <th className="w-28 px-2 py-1.5 font-medium">{t('variables.columns.initial')}</th>
                <th className="w-28 px-2 py-1.5 font-medium">{t('variables.columns.address')}</th>
                <th className="px-2 py-1.5 font-medium">{t('variables.columns.comment')}</th>
                <th className="w-16 px-2 py-1.5 text-right font-medium">
                  {t('variables.columns.uses')}
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <VariableRow
                  key={v.id}
                  v={v}
                  uses={usage.get(v.name.toLowerCase()) ?? 0}
                  isNew={v.id === newId}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </fieldset>
  );
}
