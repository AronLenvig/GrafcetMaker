import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, CommentIcon, StepIcon, TransitionIcon, TrashIcon } from '@/app/ui/icons';
import { Button, cx, Tip } from '@/app/ui/primitives';
import { uiKindOf } from '@/core/model/actionKind';
import { elementKind, indexGrafcet } from '@/core/model/graph';
import { stepOrder } from '@/core/model/renumber';
import type { ElementKind, Grafcet, Id, Transition } from '@/core/model/types';
import { deleteSelection, revealInGrafcet } from '@/editor/commands/edit';
import { formatKeys } from '@/editor/commands/registry';
import { ui } from '@/editor/store/uiStore';
import { tDynamic } from '@/i18n/dynamic';
import { ActionKindIcon } from './ActionKindPicker';
import { Section } from './fields';
import { StepKindIcon } from './StepKindPicker';

interface Row {
  id: Id;
  kind: ElementKind;
  level: 1 | 2;
  /** False for a step shown only because something under it is selected. */
  selected: boolean;
}

const KINDS: readonly ElementKind[] = ['step', 'transition', 'action', 'comment'];
const KIND_ICONS = {
  step: StepIcon,
  transition: TransitionIcon,
  action: ActionIcon,
  comment: CommentIcon,
} as const;
/** Lines listed at most: a select-all of a large chart stays quick to show. */
const MAX_ROWS = 200;

const byPosition = (a: { position: { x: number; y: number } }, b: typeof a) =>
  a.position.y - b.position.y || a.position.x - b.position.x;

/**
 * The selection as a tree in reading order: each step with its selected actions and outgoing
 * transitions under it. A step that is not selected appears (faded) when something under it is;
 * source transitions, actions without a step and comments follow at the top level.
 */
function overviewRows(g: Grafcet, selected: ReadonlySet<Id>): Row[] {
  const index = indexGrafcet(g);
  // A transition goes under a selected upstream step if it has one (AND convergence), else its first.
  const parentOf = (t: Transition) => t.from.find((s) => selected.has(s)) ?? t.from[0];
  const rows: Row[] = [];
  for (const sid of stepOrder(g)) {
    const actions = (index.actions.get(sid) ?? []).filter((a) => selected.has(a.id));
    const transitions = (index.outgoing.get(sid) ?? []).filter(
      (t) => selected.has(t.id) && parentOf(t) === sid,
    );
    if (!selected.has(sid) && !actions.length && !transitions.length) continue;
    rows.push({ id: sid, kind: 'step', level: 1, selected: selected.has(sid) });
    for (const a of actions) rows.push({ id: a.id, kind: 'action', level: 2, selected: true });
    for (const t of transitions)
      rows.push({ id: t.id, kind: 'transition', level: 2, selected: true });
  }
  const top = (kind: ElementKind, items: { id: Id; position: { x: number; y: number } }[]) => {
    for (const x of items.filter((x) => selected.has(x.id)).sort(byPosition))
      rows.push({ id: x.id, kind, level: 1, selected: true });
  };
  top(
    'transition',
    Object.values(g.transitions).filter((t) => !t.from.length),
  );
  top(
    'action',
    Object.values(g.actions)
      .filter((a) => a.stepId === null)
      .map((a) => ({ id: a.id, position: { x: a.order, y: 0 } })),
  );
  top('comment', Object.values(g.comments));
  return rows;
}

/** One line of the tree: the element's symbol and what identifies it. */
function RowContent({ g, row }: { g: Grafcet; row: Row }) {
  const { t } = useTranslation();
  const step = g.steps[row.id];
  const tr = g.transitions[row.id];
  const action = g.actions[row.id];
  const comment = g.comments[row.id];
  if (step)
    return (
      <>
        <StepKindIcon kind={step.kind} />
        <span className="shrink-0">{t('outline.step', { n: step.number })}</span>
        {step.label && <span className="min-w-0 truncate text-muted">{step.label}</span>}
      </>
    );
  if (tr) {
    const to = tr.to.map((id) => g.steps[id]?.number ?? '?').join(', ');
    return (
      <>
        <TransitionIcon size={15} className="shrink-0" />
        <span className="sr-only">{t('props.transition.title')}:</span>
        <span className={cx('min-w-0 truncate font-mono text-xs', !tr.receptivity && 'text-muted')}>
          {tr.receptivity || '–'}
        </span>
        {to && <span className="ml-auto shrink-0 text-xs text-muted">→ {to}</span>}
      </>
    );
  }
  if (action) {
    const kind = uiKindOf(action);
    return (
      <>
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
      </>
    );
  }
  if (comment)
    return (
      <>
        <CommentIcon size={15} className="shrink-0" />
        <span className="sr-only">{t('props.comment.title')}:</span>
        <span className="min-w-0 truncate">{comment.text.split('\n')[0] || '–'}</span>
      </>
    );
  return null;
}

/**
 * Several elements selected: how many of each kind (a click keeps only that kind) and the
 * selection as a compact tree. A line shows its element alone; Ctrl+click takes it out.
 */
export function SelectionOverview({ g, ids }: { g: Grafcet; ids: Id[] }) {
  const { t } = useTranslation();
  const selected = useMemo(() => new Set(ids), [ids]);
  const rows = useMemo(() => overviewRows(g, selected), [g, selected]);
  const byKind = useMemo(() => {
    const out: Record<ElementKind, Id[]> = { step: [], transition: [], action: [], comment: [] };
    for (const id of ids) {
      const k = elementKind(g, id);
      if (k) out[k].push(id);
    }
    return out;
  }, [g, ids]);
  const kinds = KINDS.filter((k) => byKind[k].length);
  const shown = rows.slice(0, MAX_ROWS);
  const [cursor, setCursor] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const focusRow = (i: number) => {
    const n = Math.max(0, Math.min(shown.length - 1, i));
    setCursor(n);
    list.current?.querySelectorAll<HTMLElement>('[role="treeitem"]')[n]?.focus();
  };
  const choose = (row: Row, toggle: boolean) => {
    if (toggle) ui.select([row.id], 'toggle');
    else revealInGrafcet(g.id, [row.id]);
  };

  return (
    <Section title={t('props.multi.title', { count: ids.length })}>
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => {
          const Icon = KIND_ICONS[k];
          const label = tDynamic(t, `props.multi.${k}s`, { count: byKind[k].length });
          const chip =
            'flex h-6 items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 text-xs';
          return kinds.length > 1 ? (
            <Tip key={k} label={t('props.multi.only', { what: label })} side="bottom">
              <button
                type="button"
                onClick={() => ui.select(byKind[k])}
                className={cx(chip, 'hover:border-border-strong hover:bg-surface')}
              >
                <Icon size={14} className="shrink-0 text-muted" />
                {label}
              </button>
            </Tip>
          ) : (
            <span key={k} className={chip}>
              <Icon size={14} className="shrink-0 text-muted" />
              {label}
            </span>
          );
        })}
      </div>
      <ul
        ref={list}
        role="tree"
        aria-label={t('props.multi.label')}
        aria-multiselectable="true"
        className="-mx-1 flex flex-col"
      >
        {shown.map((row, i) => (
          <li
            key={row.id}
            role="treeitem"
            aria-level={row.level}
            aria-selected={row.selected}
            tabIndex={i === cursor ? 0 : -1}
            title={row.selected ? undefined : t('props.multi.context')}
            onFocus={() => setCursor(i)}
            onClick={(e) => choose(row, e.ctrlKey || e.metaKey || e.shiftKey)}
            onKeyDown={(e) => {
              const go: Partial<Record<string, number>> = {
                ArrowDown: i + 1,
                ArrowUp: i - 1,
                Home: 0,
                End: shown.length - 1,
              };
              if (go[e.key] !== undefined) focusRow(go[e.key]!);
              else if (e.key === 'Enter' || e.key === ' ') choose(row, e.ctrlKey || e.metaKey);
              else return;
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cx(
              'relative flex h-7 cursor-default items-center gap-2 rounded-md pr-2 text-sm outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
              row.level === 1 ? 'pl-1.5' : 'pl-7',
              !row.selected && 'text-muted italic',
            )}
          >
            {row.level === 2 && (
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-[13px] border-l border-border"
              />
            )}
            <RowContent g={g} row={row} />
          </li>
        ))}
      </ul>
      {rows.length > shown.length && (
        <p className="text-xs text-muted">
          {t('props.multi.more', { count: rows.length - shown.length })}
        </p>
      )}
      <p className="text-xs text-muted">{t('props.multi.hint', { mod: formatKeys('Mod') })}</p>
      <div className="flex gap-2">
        <Button variant="danger" onClick={() => deleteSelection()}>
          <TrashIcon size={14} /> {t('commands.edit.delete')}
        </Button>
        <Button onClick={() => ui.clearSelection()}>{t('props.multi.clear')}</Button>
      </div>
    </Section>
  );
}
