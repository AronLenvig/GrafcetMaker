import * as ContextMenu from '@radix-ui/react-context-menu';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Id } from '@/core/model/types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/app/ui/icons';
import { cx, IconButton, menuContentClass } from '@/app/ui/primitives';
import { showDialog } from '@/app/dialogs/dialogStore';
import { toast } from '@/app/toasts';
import {
  addGrafcet,
  deleteGrafcet,
  moveGrafcet,
  moveGrafcetTo,
  renameGrafcet,
  setActiveGrafcet,
} from '../commands/edit';
import { openSplit } from '../commands/split';
import { useDoc } from '../store/document';
import { useUi } from '../store/uiStore';

const itemClass =
  'flex cursor-default items-center rounded px-2 py-1.5 outline-none select-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent-soft';

function RenameInput({ gid, initial, onDone }: { gid: Id; initial: string; onDone: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const commit = () => {
    const err = value.trim() === initial ? null : renameGrafcet(gid, value.trim());
    // The tab strip clips popups, so the reason is shown as a toast.
    if (err) {
      setInvalid(true);
      toast(t(`grafcet.nameErrors.${err}`), 'error', 5000);
    } else onDone();
  };
  return (
    <input
      autoFocus
      value={value}
      aria-label={t('grafcet.rename')}
      aria-invalid={invalid}
      onChange={(e) => {
        setValue(e.target.value);
        setInvalid(false);
      }}
      onBlur={onDone}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onDone();
      }}
      className="gm-input gm-input-sm gm-input-mono w-28"
    />
  );
}

interface TabDrag {
  gid: Id;
  from: number;
  startX: number;
  dragging: boolean;
  /** Insertion slot (0 = before the first tab, n = after the last). */
  slot: number;
}

const DRAG_THRESHOLD = 4;
const EDGE_SCROLL = 24;

/**
 * Tabs for the partial grafcets of the project. Drag a tab to reorder it (Ctrl+Shift+← / → from
 * the keyboard), double-click to rename, right-click for more. When the tabs do not fit they
 * scroll (wheel, ‹ › buttons) without a scrollbar, and the active tab is kept in view.
 */
export function GrafcetTabs() {
  const { t } = useTranslation();
  const order = useDoc((s) => s.project.grafcetOrder);
  const grafcets = useDoc((s) => s.project.grafcets);
  const active = useUi((s) => s.activeGrafcetId);
  const [renaming, setRenaming] = useState<Id | null>(null);
  const locked = useUi((s) => s.mode === 'simulate');
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<TabDrag | null>(null);
  const suppressClick = useRef(false);
  const [dragView, setDragView] = useState<{ gid: Id; slot: number } | null>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  // The ‹ › buttons follow the scroll position and the size of the strip.
  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const left = el.scrollLeft > 0;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setOverflow((o) => (o.left === left && o.right === right ? o : { left, right }));
  }, []);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, order, grafcets]);
  useEffect(() => {
    if (!active) return;
    document
      .getElementById(`gtab-${active}`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, order, overflow]);

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

  const onKeyDown = (e: React.KeyboardEvent, gid: Id, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    // Ctrl+Shift+← / → moves the tab; ← / → goes to the neighbouring tab.
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (locked) return;
      moveGrafcet(gid, delta);
      requestAnimationFrame(() => document.getElementById(`gtab-${gid}`)?.focus());
      return;
    }
    const next = order[(index + delta + order.length) % order.length];
    if (next) {
      setActiveGrafcet(next);
      document.getElementById(`gtab-${next}`)?.focus();
    }
  };

  /** Insertion slot under the pointer: how many tabs have their middle left of it. */
  const slotAt = (clientX: number): number => {
    let slot = 0;
    for (const gid of order) {
      const r = document.getElementById(`gtab-${gid}`)?.getBoundingClientRect();
      if (r && r.left + r.width / 2 < clientX) slot++;
    }
    return slot;
  };

  const onPointerDown = (e: React.PointerEvent, gid: Id, index: number) => {
    if (locked || e.button !== 0 || renaming === gid) return;
    drag.current = { gid, from: index, startX: e.clientX, dragging: false, slot: index };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.dragging && Math.abs(e.clientX - d.startX) < DRAG_THRESHOLD) return;
    d.dragging = true;
    // Near the ends the strip scrolls, so tabs out of view can be reached.
    const el = listRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left + EDGE_SCROLL) el.scrollLeft -= 12;
      else if (e.clientX > r.right - EDGE_SCROLL) el.scrollLeft += 12;
    }
    d.slot = slotAt(e.clientX);
    setDragView((v) => (v?.gid === d.gid && v.slot === d.slot ? v : { gid: d.gid, slot: d.slot }));
  };
  const endDrag = (commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    setDragView(null);
    if (!d?.dragging) return;
    // The click that ends a drag must not also select the tab.
    suppressClick.current = true;
    const to = d.slot > d.from ? d.slot - 1 : d.slot;
    if (commit && to !== d.from) moveGrafcetTo(d.gid, to);
  };

  // Insertion marker: left edge of the tab at the slot, or right edge of the last tab.
  let markerX: number | null = null;
  if (dragView) {
    const at = order[dragView.slot];
    const el = document.getElementById(`gtab-${at ?? order[order.length - 1]}`);
    if (el) markerX = at ? el.offsetLeft - 2 : el.offsetLeft + el.offsetWidth;
  }

  const scrollBy = (dx: number) => listRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 border-b border-border bg-surface-2 px-1">
      {overflow.left && (
        <IconButton
          label={t('grafcet.scrollLeft')}
          title={t('grafcet.scrollLeft')}
          className="mb-0.5 h-7 w-6 shrink-0"
          onClick={() => scrollBy(-160)}
        >
          <ChevronLeftIcon size={14} />
        </IconButton>
      )}
      <div
        ref={listRef}
        role="tablist"
        aria-label={t('grafcet.tabs')}
        onScroll={measure}
        onWheel={(e) => {
          // A vertical wheel scrolls the strip sideways.
          const el = listRef.current;
          if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
        }}
        className="gm-no-scrollbar relative flex min-w-0 items-end gap-0.5 overflow-x-auto"
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
                  title={locked ? undefined : t('grafcet.tabHint')}
                  onPointerDown={(e) => onPointerDown(e, gid, i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => endDrag(true)}
                  onPointerCancel={() => endDrag(false)}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    setActiveGrafcet(gid);
                  }}
                  onDoubleClick={() => !locked && setRenaming(gid)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && drag.current) endDrag(false);
                    if (e.key === 'F2' && !locked) setRenaming(gid);
                    onKeyDown(e, gid, i);
                  }}
                  className={cx(
                    'flex h-8 shrink-0 cursor-default items-center gap-1 rounded-t-md border border-b-0 px-3 font-mono whitespace-nowrap select-none',
                    selected
                      ? 'border-border bg-canvas text-text'
                      : 'border-transparent text-muted hover:bg-surface-3 hover:text-text',
                    dragView?.gid === gid && 'opacity-50',
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
        {markerX !== null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 bottom-0 w-0.5 rounded bg-accent"
            style={{ left: markerX }}
          />
        )}
      </div>
      {overflow.right && (
        <IconButton
          label={t('grafcet.scrollRight')}
          title={t('grafcet.scrollRight')}
          className="mb-0.5 h-7 w-6 shrink-0"
          onClick={() => scrollBy(160)}
        >
          <ChevronRightIcon size={14} />
        </IconButton>
      )}
      <IconButton
        disabled={locked}
        label={t('commands.insert.grafcet')}
        title={t('commands.insert.grafcet')}
        className="mb-0.5 h-7 w-7 shrink-0"
        onClick={() => addGrafcet()}
      >
        <PlusIcon size={14} />
      </IconButton>
    </div>
  );
}
