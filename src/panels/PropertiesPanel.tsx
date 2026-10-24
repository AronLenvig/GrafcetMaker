import { useMemo, useState } from 'react';
import { TermHelp, type Term } from '@/app/ui/TermHelp';
import { useTranslation } from 'react-i18next';
import { indexGrafcet } from '@/core/model/graph';
import type { Action, Grafcet, Id, Step, Transition } from '@/core/model/types';
import { ChevronDownIcon, ChevronUpIcon, InfoIcon, PlusIcon, TrashIcon } from '@/app/ui/icons';
import { Button, cx, IconButton } from '@/app/ui/primitives';
import {
  addActionTo,
  deleteSelection,
  editActive,
  renameGrafcet,
  validateGrafcetName,
} from '@/editor/commands/edit';
import { doc, getProject, useActiveGrafcet, useDoc } from '@/editor/store/document';
import { ui, useUi } from '@/editor/store/uiStore';
import { actionTextKind } from '@/core/expr/check';
import { setUiKind, uiKindOf } from '@/core/model/actionKind';
import { parentOf } from '@/core/model/hierarchy';
import { goToParent, openChild, setStepKind } from '@/editor/commands/hierarchy';
import { editExpression } from '@/editor/commands/variables';
import { issueMessage } from '@/editor/validation/actions';
import { useProblems } from '@/editor/validation/problems';
import { tDynamic } from '@/i18n/dynamic';
import { ActionKindIcon, ActionKindPicker } from './ActionKindPicker';
import { StepKindPicker } from './StepKindPicker';
import { TransitionFlowPicker } from './TransitionFlowPicker';
import { canFlowLeft, setTransitionFlow } from '@/core/model/ops';
import { CommitField, ExpressionField, Section } from './fields';
import { QuickFixButton, SeverityIcon } from './ProblemsPanel';

function useNumberValidator() {
  const { t } = useTranslation();
  return (v: string) => (/^\d{1,6}$/.test(v.trim()) ? null : t('editor.invalidNumber'));
}

function stepName(g: Grafcet, id: Id): string {
  const s = g.steps[id];
  return s ? String(s.number) : '?';
}

/** The glossary term of an action's kind. */
function actionTerm(action: Action): Term {
  return action.kind === 'forcing'
    ? 'forcingOrder'
    : action.kind === 'continuous'
      ? 'action'
      : 'storedAction';
}

/** Move left/right (actions of a step) and delete. */
function ActionTools({ action, index, count }: { action: Action; index: number; count: number }) {
  const { t } = useTranslation();
  const move = (delta: -1 | 1) =>
    editActive('history.reorderActions', (g) => {
      const list = action.stepId ? (indexGrafcet(g).actions.get(action.stepId) ?? []) : [];
      const i = list.findIndex((a) => a.id === action.id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      list.forEach((a, k) => (a.order = k));
    });
  return (
    <>
      {action.stepId !== null && (
        <>
          <IconButton
            label={t('props.action.moveUp')}
            onClick={() => move(-1)}
            disabled={index === 0}
            className="h-6 w-6"
          >
            <ChevronUpIcon size={14} />
          </IconButton>
          <IconButton
            label={t('props.action.moveDown')}
            onClick={() => move(1)}
            disabled={index === count - 1}
            className="h-6 w-6"
          >
            <ChevronDownIcon size={14} />
          </IconButton>
        </>
      )}
      <IconButton
        label={t('props.action.delete')}
        onClick={() => editActive('history.delete', (g) => void delete g.actions[action.id])}
        className="h-6 w-6"
      >
        <TrashIcon size={14} />
      </IconButton>
    </>
  );
}

/**
 * Output (or assignment, forcing order) first, then the kind and the condition or event that is
 * part of it. The step is chosen by dragging the action on the diagram.
 */
function ActionFields({ action }: { action: Action }) {
  const { t } = useTranslation();
  const update = (recipe: (a: Action) => void) =>
    editActive('history.edit', (g) => {
      const a = g.actions[action.id];
      if (a) recipe(a);
    });
  /** Writes the text or the condition; names it uses that are not variables yet are declared. */
  const write = (field: 'text' | 'condition', v: string) =>
    editExpression('history.edit', (g) => {
      const a = g.actions[action.id];
      if (!a) return null;
      const value = v.trim();
      if (field === 'text') a.text = value;
      else if (value) a.condition = value;
      else delete a.condition;
      return { kind: field === 'text' ? actionTextKind(a.kind) : 'condition', source: value };
    });
  const kind = uiKindOf(action);
  return (
    <>
      <ExpressionField
        kind={actionTextKind(action.kind)}
        label={t(`props.action.textLabel.${action.kind}`)}
        value={action.text}
        placeholder={t(`props.action.textPlaceholder.${action.kind}`)}
        onCommit={(v) => write('text', v)}
      />
      <ActionKindPicker value={kind} onChange={(k) => update((a) => setUiKind(a, k))} />
      {/* Part of the kind: the condition of a conditional action, the event of an event action. */}
      {(kind === 'conditional' || kind === 'storedOnEvent') && (
        <ExpressionField
          kind="condition"
          label={kind === 'storedOnEvent' ? t('props.action.event') : t('props.action.condition')}
          term={kind === 'storedOnEvent' ? 'event' : 'assignmentCondition'}
          value={action.condition ?? ''}
          placeholder={kind === 'storedOnEvent' ? '↑b' : t('props.action.conditionPlaceholder')}
          onCommit={(v) => write('condition', v)}
        />
      )}
      {/* Files may hold a condition on a stored action: shown so it can be changed or cleared. */}
      {(kind === 'storedOnActivation' || kind === 'storedOnDeactivation') &&
        action.condition !== undefined && (
          <ExpressionField
            kind="condition"
            label={t('props.action.onlyIf')}
            value={action.condition}
            onCommit={(v) => write('condition', v)}
          />
        )}
      {action.stepId === null && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <InfoIcon size={13} className="shrink-0" />
          {t('props.action.unattachedHint')}
        </p>
      )}
    </>
  );
}

/** The selected action: its number and tools, then its fields. */
function ActionEditor({ action, index, count }: { action: Action; index: number; count: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-1">
        <span className="flex flex-1 items-center gap-1.5 text-xs font-medium text-muted">
          {/* Numbered among its step's actions; one without a step goes by its kind. */}
          {index >= 0
            ? t('props.action.title', { n: index + 1 })
            : tDynamic(t, `props.action.kinds.${uiKindOf(action)}.label`)}
          <TermHelp term={actionTerm(action)} />
        </span>
        <ActionTools action={action} index={index} count={count} />
      </div>
      <ActionFields action={action} />
    </div>
  );
}

/** An action of the selected step as one row (symbol, text, condition) that unfolds into its fields. */
function ActionRow({
  action,
  index,
  count,
  open,
  onToggle,
}: {
  action: Action;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const kind = uiKindOf(action);
  return (
    <li className="rounded-md border border-border">
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md pl-1.5 text-left hover:bg-surface-2"
        >
          <ChevronDownIcon
            size={14}
            className={cx('shrink-0 text-muted transition-transform', !open && '-rotate-90')}
          />
          <ActionKindIcon kind={kind} />
          <span className="sr-only">{tDynamic(t, `props.action.kinds.${kind}.label`)}:</span>
          <span className={cx('min-w-0 truncate font-mono text-xs', !action.text && 'text-muted')}>
            {action.text || t('props.action.noText')}
          </span>
          {action.condition && (
            <span className="min-w-0 shrink-[2] truncate font-mono text-xs text-muted">
              {action.condition}
            </span>
          )}
        </button>
        {open && (
          <>
            <TermHelp term={actionTerm(action)} />
            <ActionTools action={action} index={index} count={count} />
          </>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <ActionFields action={action} />
        </div>
      )}
    </li>
  );
}

function StepProps({ g, step }: { g: Grafcet; step: Step }) {
  const { t } = useTranslation();
  // Only the name of its sub-grafcet: the whole project changes on every edit.
  const childName = useDoc((s) =>
    step.refGrafcetId ? s.project.grafcets[step.refGrafcetId]?.name : undefined,
  );
  const validateNumber = useNumberValidator();
  const actions = useMemo(() => indexGrafcet(g).actions.get(step.id) ?? [], [g, step.id]);
  // Actions unfolded for editing (all folded when the step is selected).
  const [open, setOpen] = useState<ReadonlySet<Id>>(() => new Set());
  const toggle = (id: Id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  // The new action unfolds in the list; the step stays selected and the focus stays here.
  const addAction = () => {
    const id = addActionTo(step.id);
    if (id) setOpen((prev) => new Set(prev).add(id));
  };
  const update = (recipe: (s: Step) => void) =>
    editActive('history.edit', (gd) => {
      const s = gd.steps[step.id];
      if (s) recipe(s);
    });
  const duplicate = Object.values(g.steps).some(
    (s) => s.id !== step.id && s.number === step.number,
  );
  return (
    <>
      <Section
        title={t('props.step.title', { n: step.number })}
        term={
          step.kind === 'macro' ? 'macroStep' : step.kind === 'enclosing' ? 'enclosingStep' : 'step'
        }
      >
        <CommitField
          label={t('props.step.number')}
          value={String(step.number)}
          inputMode="numeric"
          validate={validateNumber}
          onCommit={(v) => update((s) => void (s.number = Number(v.trim())))}
          hint={
            duplicate ? (
              <span className="text-xs text-danger">{t('props.step.duplicate')}</span>
            ) : undefined
          }
        />
        <CommitField
          label={t('props.step.label')}
          value={step.label ?? ''}
          placeholder={t('props.step.labelPlaceholder')}
          onCommit={(v) =>
            update((s) => {
              if (v.trim()) s.label = v.trim();
              else delete s.label;
            })
          }
        />
        <StepKindPicker
          value={step.kind}
          enclosed={g.kind === 'enclosed'}
          onChange={(k) => setStepKind(step.id, k)}
        />
        {childName !== undefined && (
          <Button size="sm" onClick={() => openChild(step.id)}>
            {t('props.step.openChild', { name: childName })}
          </Button>
        )}
      </Section>
      <Section
        title={t('props.step.actions')}
        actions={
          <Button size="sm" variant="ghost" onClick={addAction}>
            <PlusIcon size={14} /> {t('props.step.addAction')}
          </Button>
        }
      >
        {actions.length === 0 ? (
          <p className="text-muted">{t('props.step.noActions')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {actions.map((a, i) => (
              <ActionRow
                key={a.id}
                action={a}
                index={i}
                count={actions.length}
                open={open.has(a.id)}
                onToggle={() => toggle(a.id)}
              />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function TransitionProps({ g, transition }: { g: Grafcet; transition: Transition }) {
  const { t } = useTranslation();
  const update = (recipe: (tr: Transition) => void) =>
    editActive('history.edit', (gd) => {
      const tr = gd.transitions[transition.id];
      if (tr) recipe(tr);
    });
  const list = (ids: Id[]) => (ids.length ? ids.map((id) => stepName(g, id)).join(', ') : '—');
  return (
    <Section title={t('props.transition.title')} term="transition">
      <ExpressionField
        kind="condition"
        label={t('props.transition.receptivity')}
        term="receptivity"
        value={transition.receptivity}
        placeholder="a * /b"
        onCommit={(v) =>
          editExpression('history.edit', (gd) => {
            const tr = gd.transitions[transition.id];
            if (!tr) return null;
            tr.receptivity = v.trim();
            return { kind: 'condition', source: tr.receptivity };
          })
        }
        hint={<span className="text-xs text-muted">{t('props.transition.receptivityHint')}</span>}
      />
      <CommitField
        label={t('props.transition.number')}
        value={transition.number === undefined ? '' : String(transition.number)}
        inputMode="numeric"
        validate={(v) =>
          v.trim() === '' || /^\d{1,6}$/.test(v.trim()) ? null : t('editor.invalidNumber')
        }
        onCommit={(v) =>
          update((tr) => {
            if (v.trim() === '') delete tr.number;
            else tr.number = Number(v.trim());
          })
        }
      />
      {canFlowLeft(transition) ? (
        <TransitionFlowPicker
          value={transition.flow === 'left' ? 'left' : 'down'}
          onChange={(flow) =>
            editActive('history.rotate', (gd) => setTransitionFlow(gd, [transition.id], flow))
          }
        />
      ) : (
        <p className="text-xs text-muted">{t('props.transition.flowAnd')}</p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted">{t('props.transition.upstream')}</dt>
        <dd>{list(transition.from)}</dd>
        <dt className="text-muted">{t('props.transition.downstream')}</dt>
        <dd>{list(transition.to)}</dd>
      </dl>
    </Section>
  );
}

function GrafcetAndProjectProps({ g }: { g: Grafcet }) {
  const { t } = useTranslation();
  const project = useDoc((s) => s.project);
  const parent = parentOf(project, g.id);
  const validateName = (v: string) => {
    const err = validateGrafcetName(getProject(), g.id, v.trim());
    return err ? t(`grafcet.nameErrors.${err}`) : null;
  };
  const meta = (key: 'author' | 'company' | 'revision') => (
    <CommitField
      label={t(`props.project.${key}`)}
      value={project.meta[key]}
      onCommit={(v) => doc.execute('history.editProject', (p) => void (p.meta[key] = v.trim()))}
    />
  );
  return (
    <>
      <Section title={t('props.grafcet.title')} term="partialGrafcet">
        <CommitField
          label={t('props.grafcet.name')}
          value={g.name}
          mono
          validate={validateName}
          onCommit={(v) => renameGrafcet(g.id, v.trim())}
        />
        <p className="text-muted">
          {t('props.grafcet.steps', { count: Object.keys(g.steps).length })},{' '}
          {t('props.grafcet.transitions', { count: Object.keys(g.transitions).length })}
        </p>
        <p>{t(`props.grafcet.kinds.${g.kind}`)}</p>
        {parent && (
          <Button size="sm" onClick={goToParent}>
            {t('props.grafcet.goToParent', {
              grafcet: parent.grafcet.name,
              step: parent.step.number,
            })}
          </Button>
        )}
      </Section>
      <Section title={t('props.project.title')}>
        <CommitField
          label={t('props.project.name')}
          value={project.name}
          validate={(v) => (v.trim() ? null : t('props.project.nameRequired'))}
          onCommit={(v) => doc.execute('history.editProject', (p) => void (p.name = v.trim()))}
        />
        {meta('author')}
        {meta('company')}
        {meta('revision')}
      </Section>
    </>
  );
}

/** Problems of the selected element, with their quick fixes. */
function ElementProblems({ id }: { id: Id }) {
  const { t } = useTranslation();
  const issues = useProblems((s) => s.byElement.get(id));
  if (!issues?.length) return null;
  return (
    <Section title={t('panels.problems')}>
      <ul className="flex flex-col gap-2">
        {issues.map((issue, i) => (
          <li key={i} className="flex flex-col gap-1">
            <span className="flex items-start gap-2">
              <SeverityIcon severity={issue.severity} />
              <span>{issueMessage(t, issue)}</span>
            </span>
            <span className="pl-6">
              <QuickFixButton issue={issue} />
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Right panel: properties of the selection, or of the grafcet/project when nothing is selected. */
export function PropertiesPanel() {
  const { t } = useTranslation();
  const g = useActiveGrafcet();
  const selection = useUi((s) => s.selection);
  const selectedLink = useUi((s) => s.selectedLink);
  if (!g) return null;
  const ids = Object.keys(selection);

  let body: React.ReactNode;
  if (selectedLink) {
    const [tid, side, sid] = selectedLink.split(':') as [Id, 'in' | 'out', Id];
    const tr = g.transitions[tid];
    body = (
      <Section title={t('props.link.title')}>
        <p>
          {side === 'in'
            ? t('props.link.stepToTransition', {
                step: stepName(g, sid),
                receptivity: tr?.receptivity || '—',
              })
            : t('props.link.transitionToStep', {
                step: stepName(g, sid),
                receptivity: tr?.receptivity || '—',
              })}
        </p>
        <Button variant="danger" onClick={() => deleteSelection()}>
          <TrashIcon size={14} /> {t('props.link.delete')}
        </Button>
      </Section>
    );
  } else if (ids.length === 0) {
    body = <GrafcetAndProjectProps g={g} />;
  } else if (ids.length > 1) {
    body = (
      <Section title={t('props.multi.title', { count: ids.length })}>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => deleteSelection()}>
            <TrashIcon size={14} /> {t('commands.edit.delete')}
          </Button>
          <Button onClick={() => ui.clearSelection()}>{t('props.multi.clear')}</Button>
        </div>
      </Section>
    );
  } else {
    const id = ids[0]!;
    const step = g.steps[id];
    const tr = g.transitions[id];
    const action = g.actions[id];
    const comment = g.comments[id];
    if (step) body = <StepProps key={step.id} g={g} step={step} />;
    else if (tr) body = <TransitionProps g={g} transition={tr} />;
    else if (action) {
      const list = action.stepId ? (indexGrafcet(g).actions.get(action.stepId) ?? []) : [];
      body = (
        <Section
          title={
            action.stepId
              ? t('props.action.ofStep', { n: stepName(g, action.stepId) })
              : t('props.action.unattachedTitle')
          }
        >
          <ActionEditor
            key={id}
            action={action}
            index={list.findIndex((a) => a.id === id)}
            count={list.length}
          />
        </Section>
      );
    } else if (comment) {
      body = (
        <Section title={t('props.comment.title')}>
          <CommitField
            label={t('props.comment.text')}
            value={comment.text}
            multiline
            onCommit={(v) =>
              editActive('history.edit', (gd) => {
                const c = gd.comments[id];
                if (c) c.text = v.replace(/\s+$/, '');
              })
            }
          />
        </Section>
      );
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {body}
      {ids.length === 1 && <ElementProblems id={ids[0]!} />}
    </div>
  );
}
