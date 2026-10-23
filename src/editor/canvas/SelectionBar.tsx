import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { showSideTab } from '@/app/prefs';
import {
  ActionIcon,
  AlternativeIcon,
  AppendIcon,
  EditIcon,
  LoopIcon,
  ParallelIcon,
  PropertiesIcon,
  TrashIcon,
} from '@/app/ui/icons';
import { useCoarsePointer } from '@/app/ui/media';
import type { Grafcet } from '@/core/model/types';
import { getCommand, runCommand } from '../commands/registry';
import { useUi } from '../store/uiStore';
import { useInteraction } from './interactionStore';

type Kind = 'step' | 'transition' | 'other' | 'many' | 'link';

interface Entry {
  /** Command id, or 'properties' for the details panel. */
  id: string;
  label: 'append' | 'action' | 'parallel' | 'alternative' | 'loop' | 'edit' | 'details' | 'delete';
  Icon: typeof EditIcon;
  for: Kind[];
}

const ENTRIES: Entry[] = [
  { id: 'insert.append', label: 'append', Icon: AppendIcon, for: ['step', 'transition'] },
  { id: 'insert.action', label: 'action', Icon: ActionIcon, for: ['step'] },
  { id: 'insert.parallel', label: 'parallel', Icon: ParallelIcon, for: ['step', 'transition'] },
  {
    id: 'insert.alternative',
    label: 'alternative',
    Icon: AlternativeIcon,
    for: ['step', 'transition'],
  },
  { id: 'insert.loop', label: 'loop', Icon: LoopIcon, for: ['step', 'transition'] },
  { id: 'edit.rename', label: 'edit', Icon: EditIcon, for: ['step', 'transition', 'other'] },
  {
    id: 'properties',
    label: 'details',
    Icon: PropertiesIcon,
    for: ['step', 'transition', 'other', 'many'],
  },
  {
    id: 'edit.delete',
    label: 'delete',
    Icon: TrashIcon,
    for: ['step', 'transition', 'other', 'many', 'link'],
  },
];

/**
 * Touch screens: what the keyboard shortcuts do for the selection (Enter, A, P, O, L, F2, Del),
 * as a toolbar at the bottom of the canvas. Hidden while editing text or dragging.
 */
function SelectionBarView({ g }: { g: Grafcet }) {
  const { t } = useTranslation();
  const coarse = useCoarsePointer();
  const selection = useUi((s) => s.selection);
  const selectedLink = useUi((s) => s.selectedLink);
  const editing = useUi((s) => s.editing);
  const pending = useUi((s) => s.pending);
  const busy = useInteraction((s) => s.moving || !!s.link || !!s.marquee);
  if (!coarse || editing || pending || busy) return null;
  const ids = Object.keys(selection);
  const kind: Kind | null =
    ids.length > 1
      ? 'many'
      : ids.length === 1
        ? g.steps[ids[0]!]
          ? 'step'
          : g.transitions[ids[0]!]
            ? 'transition'
            : 'other'
        : selectedLink
          ? 'link'
          : null;
  if (!kind) return null;
  const entries = ENTRIES.filter((e) => {
    if (!e.for.includes(kind)) return false;
    if (e.id === 'properties') return true;
    const c = getCommand(e.id);
    return !c.enabled || c.enabled();
  });
  return (
    <div
      role="toolbar"
      aria-label={t('selectionBar.label')}
      className="gm-no-scrollbar absolute bottom-14 left-1/2 z-10 flex max-w-[calc(100%-16px)] -translate-x-1/2 overflow-x-auto rounded-xl border border-border bg-surface p-1 shadow-pop compact:bottom-3"
    >
      {entries.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => (e.id === 'properties' ? showSideTab('properties') : runCommand(e.id))}
          className={
            'flex h-12 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] leading-none hover:bg-surface-2 active:bg-surface-2 ' +
            (e.label === 'delete' ? 'text-danger' : 'text-text')
          }
        >
          <e.Icon size={18} />
          {t(`selectionBar.${e.label}`)}
        </button>
      ))}
    </div>
  );
}

/** Memoized: the canvas re-renders on every pan and zoom frame. */
export const SelectionBar = memo(SelectionBarView);
