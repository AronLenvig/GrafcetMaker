import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setPrefs, usePrefs } from '@/app/prefs';
import { CloseIcon } from '@/app/ui/icons';
import { cx, IconButton, Select } from '@/app/ui/primitives';
import { Splitter } from '@/app/ui/Splitter';
import type { Id } from '@/core/model/types';
import { closeSplit, focusPane, setPaneGrafcet, swapPanes } from '../commands/split';
import { useDoc } from '../store/document';
import { useUi } from '../store/uiStore';
import { Canvas } from './Canvas';

const MIN_PANE = 160;

/** Header of a split pane: which grafcet it shows, swap and close. */
function PaneHeader({ pane, gid, focused }: { pane: 0 | 1; gid: Id; focused: boolean }) {
  const { t } = useTranslation();
  const order = useDoc((s) => s.project.grafcetOrder);
  const grafcets = useDoc((s) => s.project.grafcets);
  return (
    <div
      className={cx(
        'flex h-8 shrink-0 items-center gap-1 border-b border-border px-1.5',
        focused ? 'bg-accent-soft' : 'bg-surface-2',
      )}
    >
      <div className="w-40">
        <Select
          small
          ghost
          aria-label={t('split.grafcetOf', { pane: pane + 1 })}
          value={gid}
          onChange={(e) => setPaneGrafcet(pane, e.target.value)}
          className="font-mono"
        >
          {order.map((id) => (
            <option key={id} value={id}>
              {grafcets[id]?.name ?? id}
            </option>
          ))}
        </Select>
      </div>
      <span className="truncate text-xs text-muted">
        {focused ? t('split.active') : t('split.clickToEdit')}
      </span>
      <div className="ml-auto flex items-center">
        {pane === 0 && (
          <IconButton
            label={t('split.swap')}
            title={t('split.swap')}
            className="h-6 w-6 text-sm"
            onClick={swapPanes}
          >
            ⇄
          </IconButton>
        )}
        <IconButton
          label={t('split.closePane')}
          title={t('split.closePane')}
          className="h-6 w-6"
          onClick={() => {
            // Closing a pane keeps the other one.
            const split = useUi.getState().split;
            if (split) focusPane(pane === 0 ? 1 : 0);
            closeSplit();
          }}
        >
          <CloseIcon size={13} />
        </IconButton>
      </div>
    </div>
  );
}

/** The canvas, or two canvases side by side / stacked in split view. */
export function CanvasArea() {
  const { t } = useTranslation();
  const active = useUi((s) => s.activeGrafcetId);
  const split = useUi((s) => s.split);
  const ratio = usePrefs((s) => s.splitRatio);
  const ref = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState(0);
  const columns = split?.orientation !== 'rows';
  const isSplit = split !== null;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setTotal(columns ? el.clientWidth : el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns, isSplit]);

  if (!split) return <Canvas gid={active} />;

  const first = Math.round(
    Math.min(Math.max(ratio * total, MIN_PANE), Math.max(MIN_PANE, total - MIN_PANE)),
  );
  const pane = (i: 0 | 1) => {
    const gid = split.panes[i];
    const focused = split.focus === i;
    return (
      <section
        aria-label={t('split.pane', { pane: i + 1 })}
        className={cx(
          'flex min-h-0 min-w-0 flex-col',
          i === 0 ? 'shrink-0' : 'flex-1',
          focused && 'relative z-0 outline outline-2 -outline-offset-2 outline-accent',
        )}
        style={i === 0 ? (columns ? { width: first } : { height: first }) : undefined}
      >
        <PaneHeader pane={i} gid={gid} focused={focused} />
        <div className="min-h-0 flex-1">
          <Canvas gid={gid} focused={focused} onActivate={() => focusPane(i)} />
        </div>
      </section>
    );
  };
  return (
    <div ref={ref} className={cx('flex h-full min-h-0 min-w-0', columns ? 'flex-row' : 'flex-col')}>
      {pane(0)}
      <Splitter
        orientation={columns ? 'vertical' : 'horizontal'}
        value={first}
        min={MIN_PANE}
        max={Math.max(MIN_PANE, total - MIN_PANE)}
        sign={1}
        label={t('split.resize')}
        onChange={(v) => total && setPrefs({ splitRatio: v / total })}
      />
      {pane(1)}
    </div>
  );
}
