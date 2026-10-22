import * as ContextMenu from '@radix-ui/react-context-menu';
import { openSplit } from '../commands/split';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Id } from '@/core/model/types';
import { PlusIcon } from '@/app/ui/icons';
import { cx, IconButton, menuContentClass } from '@/app/ui/primitives';
import { showDialog } from '@/app/dialogs/dialogStore';
import {
  addGrafcet,
  deleteGrafcet,
  moveGrafcet,
  renameGrafcet,
  setActiveGrafcet,
} from '../commands/edit';
import { useDoc } from '../store/document';
import { useUi } from '../store/uiStore';

const itemClass =
  'flex cursor-default items-center rounded px-2 py-1.5 outline-none select-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent-soft';

function RenameInput({ gid, initial, onDone }: { gid: Id; initial: string; onDone: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const commit = () => {
    const err = value.trim() === initial ? null : renameGrafcet(gid, value.trim());
    if (err) setError(t(`grafcet.nameErrors.${err}`));
    else onDone();
  };
  return (
    <span className="relative">
      <input
        autoFocus
        value={value}
        aria-label={t('grafcet.rename')}
        aria-invalid={!!error}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onBlur={onDone}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onDone();
        }}
        className="gm-input gm-input-sm gm-input-mono w-28"
      />
      {error && (
        <span
          role="alert"
          className="absolute top-7 left-0 z-20 rounded bg-danger-soft px-2 py-1 whitespace-nowrap text-danger"
        >
          {error}
        </span>
      )}
    </span>
  );
}

/** Tabs for the partial grafcets of the project. Double-click to rename, right-click for more. */
export function GrafcetTabs() {
  const { t } = useTranslation();
  const order = useDoc((s) => s.project.grafcetOrder);
  const grafcets = useDoc((s) => s.project.grafcets);
  const active = useUi((s) => s.activeGrafcetId);
  const [renaming, setRenaming] = useState<Id | null>(null);
  const locked = useUi((s) => s.mode === 'simulate');

  const confirmDelete = async (gid: Id) => {
    const g = grafcets[gid];
    if (!g) return;
    const choice = await showDialog({
      title: t('grafcet.deleteTitle', { name: g.name }),
      message: t('grafcet.deleteMessage'),
      actions: [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'delete', label: t('common.delete'), variant: 'danger' },
      ],
      cancelId: 'cancel',
    });
    if (choice === 'delete') deleteGrafcet(gid);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = order[(index + delta + order.length) % order.length];
    if (next) {
      setActiveGrafcet(next);
      document.getElementById(`gtab-${next}`)?.focus();
    }
  };

  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 border-b border-border bg-surface-2 px-2">
      <div
        role="tablist"
        aria-label={t('grafcet.tabs')}
        className="flex min-w-0 items-end gap-0.5 overflow-x-auto"
      >
        {order.map((gid, i) => {
          const g = grafcets[gid];
          if (!g) return null;
          const selected = gid === active;
          return (
            <ContextMenu.Root key={gid}>
              <ContextMenu.Trigger asChild disabled={locked}>
                <div
                  id={`gtab-${gid}`}
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveGrafcet(gid)}
                  onDoubleClick={() => !locked && setRenaming(gid)}
                  onKeyDown={(e) => {
                    if (e.key === 'F2' && !locked) setRenaming(gid);
                    onKeyDown(e, i);
                  }}
                  className={cx(
                    'flex h-8 cursor-default items-center gap-1 rounded-t-md border border-b-0 px-3 font-mono whitespace-nowrap',
                    selected
                      ? 'border-border bg-canvas text-text'
                      : 'border-transparent text-muted hover:bg-surface-3 hover:text-text',
                  )}
                >
                  {renaming === gid ? (
                    <RenameInput gid={gid} initial={g.name} onDone={() => setRenaming(null)} />
                  ) : (
                    g.name
                  )}
                  {g.kind !== 'partial' && (
                    <span
                      className="rounded bg-surface-3 px-1 font-sans text-[10px] font-semibold text-muted"
                      title={t(`props.grafcet.kinds.${g.kind}`)}
                      aria-label={t(`props.grafcet.kinds.${g.kind}`)}
                    >
                      {g.kind === 'macroExpansion' ? 'M' : 'E'}
                    </span>
                  )}
                </div>
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content className={menuContentClass}>
                  <ContextMenu.Item className={itemClass} onSelect={() => setRenaming(gid)}>
                    {t('grafcet.rename')}
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={itemClass}
                    disabled={i === 0}
                    onSelect={() => moveGrafcet(gid, -1)}
                  >
                    {t('grafcet.moveLeft')}
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={itemClass}
                    disabled={i === order.length - 1}
                    onSelect={() => moveGrafcet(gid, 1)}
                  >
                    {t('grafcet.moveRight')}
                  </ContextMenu.Item>
                  <ContextMenu.Separator className="my-1 h-px bg-border" />
                  <ContextMenu.Item
                    className={itemClass}
                    disabled={gid === active}
                    onSelect={() => openSplit('columns', gid)}
                  >
                    {t('split.openToSide')}
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={itemClass}
                    disabled={gid === active}
                    onSelect={() => openSplit('rows', gid)}
                  >
                    {t('split.openBelow')}
                  </ContextMenu.Item>
                  <ContextMenu.Separator className="my-1 h-px bg-border" />
                  <ContextMenu.Item
                    className={itemClass}
                    disabled={order.length <= 1}
                    onSelect={() => void confirmDelete(gid)}
                  >
                    {t('grafcet.delete')}
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          );
        })}
      </div>
      <IconButton
        disabled={locked}
        label={t('commands.insert.grafcet')}
        title={t('commands.insert.grafcet')}
        className="mb-0.5 h-7 w-7"
        onClick={() => addGrafcet()}
      >
        <PlusIcon size={14} />
      </IconButton>
    </div>
  );
}
