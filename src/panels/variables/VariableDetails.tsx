import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Variable, VariableDirection, VariableType } from '@/core/model/types';
import { formatInitialValue, parseInitialValue, variableReferences } from '@/core/model/variables';
import { TrashIcon } from '@/app/ui/icons';
import { Button } from '@/app/ui/primitives';
import { revealInGrafcet } from '@/editor/commands/edit';
import { confirmDeleteVariable, renameVariable, updateVariable } from '@/editor/commands/variables';
import { useDoc } from '@/editor/store/document';
import { CommitField, SelectField } from '../fields';
import { DIRECTIONS, TYPES } from './model';

/** Where a variable is used: each receptivity or action, click to jump to it. */
function WhereUsed({ v }: { v: Variable }) {
  const { t } = useTranslation();
  const project = useDoc((s) => s.project);
  const refs = useMemo(() => variableReferences(project, v.name), [project, v.name]);
  if (!refs.length) return <p className="text-xs text-muted">{t('variables.notUsed')}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {refs.map((r, i) => {
        const g = project.grafcets[r.grafcetId]!;
        const tr = g.transitions[r.elementId];
        const act = g.actions[r.elementId];
        const num = (sid: string) => g.steps[sid]?.number ?? '?';
        const where = tr
          ? t('problems.location.transition', {
              from: tr.from.map(num).join(', ') || '–',
              to: tr.to.map(num).join(', ') || '–',
            })
          : act
            ? t('problems.location.action', { n: num(act.stepId) })
            : '';
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => revealInGrafcet(g.id, [r.elementId])}
              className="flex w-full flex-col items-start rounded-md border border-border px-2 py-1.5 text-left hover:border-accent hover:bg-accent-soft"
            >
              <span className="flex w-full items-center gap-2 text-xs">
                <span className="font-medium">
                  {g.name} · {where}
                </span>
                <span className="ml-auto rounded bg-surface-3 px-1.5 text-[10px] text-muted uppercase">
                  {r.writes ? t('variables.writes') : t('variables.reads')}
                </span>
              </span>
              <span className="w-full truncate font-mono text-xs text-muted">{r.source}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Full editor of one variable, with its uses. Renaming updates every expression. */
export function VariableDetails({ v, locked }: { v: Variable; locked: boolean }) {
  const { t } = useTranslation();
  return (
    <fieldset disabled={locked} className="flex min-w-0 flex-col gap-3">
      <CommitField
        label={t('variables.columns.name')}
        value={v.name}
        mono
        onCommit={(name) => {
          const err = renameVariable(v.id, name.trim());
          return err ? t(`variables.nameErrors.${err}`) : null;
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t('variables.columns.type')}
          value={v.type}
          options={TYPES.map((ty) => ({ value: ty, label: ty }))}
          onChange={(ty: VariableType) =>
            updateVariable(v.id, (x) => {
              x.type = ty;
              delete x.initialValue;
            })
          }
        />
        <SelectField
          label={t('variables.columns.direction')}
          value={v.direction}
          options={DIRECTIONS.map((d) => ({ value: d, label: t(`variables.directions.${d}`) }))}
          onChange={(d: VariableDirection) => updateVariable(v.id, (x) => void (x.direction = d))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CommitField
          label={t('variables.columns.initial')}
          value={formatInitialValue(v)}
          mono
          placeholder={v.type === 'BOOL' ? 'FALSE' : '0'}
          validate={(text) =>
            'error' in parseInitialValue(v.type, text)
              ? t(`variables.initialErrors.${v.type}`)
              : null
          }
          onCommit={(text) => {
            const r = parseInitialValue(v.type, text);
            if ('error' in r) return;
            updateVariable(v.id, (x) => {
              if (r.value === undefined) delete x.initialValue;
              else x.initialValue = r.value;
            });
          }}
        />
        <CommitField
          label={t('variables.columns.address')}
          value={v.address ?? ''}
          mono
          placeholder="%I0.0"
          onCommit={(text) =>
            updateVariable(v.id, (x) => {
              if (text.trim()) x.address = text.trim();
              else delete x.address;
            })
          }
        />
      </div>
      <CommitField
        label={t('variables.columns.comment')}
        value={v.comment ?? ''}
        multiline
        onCommit={(text) =>
          updateVariable(v.id, (x) => {
            if (text.trim()) x.comment = text.trim();
            else delete x.comment;
          })
        }
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">{t('variables.usedIn')}</span>
        <WhereUsed v={v} />
      </div>
      <div>
        <Button size="sm" variant="danger" onClick={() => void confirmDeleteVariable(v.id)}>
          <TrashIcon size={13} /> {t('variables.delete', { name: v.name })}
        </Button>
      </div>
    </fieldset>
  );
}
