import * as Tabs from '@radix-ui/react-tabs';
import { lazy, Suspense, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { setPrefs, usePrefs } from '@/app/prefs';
import { closeSheet, PANEL_TABS, SHEET_TABS, useSheet, type SheetTab } from '@/app/sheet';
import { CloseIcon } from '@/app/ui/icons';
import { cx, IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { OutlinePanel } from './OutlinePanel';
import { ProblemsBadge, usePanelLabel } from './panelParts';
import { ProblemsPanel } from './ProblemsPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SimulationPanel } from './SimulationPanel';
import { VariablesPanel } from './VariablesPanel';
import { VariablesSidePanel } from './variables/VariablesSidePanel';

// Loaded on first use: the chronogram is only needed while simulating.
const LazyChronogram = lazy(() => import('./ChronogramPanel'));
function ChronogramPanel() {
  return (
    <Suspense fallback={null}>
      <LazyChronogram />
    </Suspense>
  );
}

const CONTENT: Record<SheetTab, ComponentType> = {
  properties: PropertiesPanel,
  variables: VariablesSidePanel,
  problems: ProblemsPanel,
  simulation: SimulationPanel,
  chronogram: ChronogramPanel,
  outline: OutlinePanel,
};

const MIN_HEIGHT = 140;
const MIN_WIDTH = 300;
/** From this width the right card shows the variable table instead of the list. */
const TABLE_WIDTH = 560;

function useRoom(ref: React.RefObject<HTMLElement | null>, open: boolean) {
  const [room, setRoom] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const update = () => setRoom({ width: parent.clientWidth, height: parent.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [ref, open]);
  return room;
}

/**
 * The panels as tabs (with the problem count and a close button) and the open one below them,
 * shared by the sheet and the card. `contentOf` chooses what each tab shows.
 */
function PanelTabsView({
  tabs,
  dense,
  contentOf,
}: {
  tabs: readonly SheetTab[];
  dense: boolean;
  contentOf: (tab: SheetTab) => ComponentType;
}) {
  const { t } = useTranslation();
  const tab = useSheet((s) => s.tab);
  const label = usePanelLabel();
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => useSheet.setState({ tab: v as SheetTab })}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 items-center border-b border-border">
        <Tabs.List
          aria-label={t('panels.label')}
          className="gm-no-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto"
        >
          {tabs.map((x) => (
            <Tabs.Trigger
              key={x}
              value={x}
              className={cx(
                'flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 whitespace-nowrap text-muted hover:text-text data-[state=active]:border-accent data-[state=active]:text-text',
                dense ? 'h-9' : 'h-10',
              )}
            >
              {label(x)}
              {x === 'problems' && <ProblemsBadge />}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <IconButton
          label={t('common.close')}
          title={t('common.close')}
          className={cx('shrink-0', dense ? 'h-9 w-9' : 'h-10 w-10')}
          onClick={closeSheet}
        >
          <CloseIcon size={16} />
        </IconButton>
      </div>
      {tabs.map((x) => {
        const Content = contentOf(x);
        return (
          <Tabs.Content key={x} value={x} className="min-h-0 flex-1 overflow-auto outline-none">
            <Content />
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}

/** A drag handle (or arrow keys) resizing a panel: role=separator, window splitter pattern. */
function Grip({
  vertical,
  value,
  min,
  max,
  onResize,
  className,
  children,
}: {
  vertical: boolean;
  value: number;
  min: number;
  max: number;
  onResize: (v: number) => void;
  className: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const drag = useRef<{ pos: number; value: number } | null>(null);
  // Panels grow away from their edge: upwards (sheet) or to the left (card).
  const pos = (e: React.PointerEvent) => (vertical ? -e.clientX : -e.clientY);
  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={t('panels.resizeSheet')}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={cx('touch-none', vertical ? 'cursor-col-resize' : 'cursor-row-resize', className)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { pos: pos(e), value };
      }}
      onPointerMove={(e) => {
        if (drag.current) onResize(drag.current.value + pos(e) - drag.current.pos);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const grow = vertical
          ? { ArrowLeft: 32, ArrowRight: -32 }
          : { ArrowUp: 32, ArrowDown: -32 };
        const d = grow[e.key as keyof typeof grow];
        if (d === undefined) return;
        e.preventDefault();
        onResize(value + d);
      }}
    >
      {children}
    </div>
  );
}

/**
 * Phones: the panels in a sheet over the lower part of the canvas, every panel as a tab (the
 * narrow variable list). Drag its handle to resize it; the diagram stays usable above it.
 */
export function PanelSheet() {
  const open = useSheet((s) => s.open);
  const tab = useSheet((s) => s.tab);
  const simulating = useSim((s) => s.on);
  const ref = useRef<HTMLElement>(null);
  const room = useRoom(ref, open);
  const [height, setHeight] = useState<number | null>(null);
  const { t } = useTranslation();
  // While simulating the properties are locked: the sheet offers the simulation instead.
  const tabs = simulating ? SHEET_TABS.filter((x) => x !== 'properties') : SHEET_TABS;
  if (!open || !tabs.includes(tab)) return null;
  const max = Math.max(MIN_HEIGHT, room.height - 48);
  const h = Math.min(max, Math.max(MIN_HEIGHT, height ?? Math.round(room.height * 0.5)));
  const resize = (v: number) => setHeight(Math.min(max, Math.max(MIN_HEIGHT, Math.round(v))));
  return (
    <section
      ref={ref}
      aria-label={t('panels.label')}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t border-border bg-surface shadow-pop"
      style={{ height: h }}
    >
      <Grip
        vertical={false}
        value={h}
        min={MIN_HEIGHT}
        max={max}
        onResize={resize}
        className="flex h-5 shrink-0 items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-border-strong" />
      </Grip>
      <PanelTabsView tabs={tabs} dense={false} contentOf={(x) => CONTENT[x]} />
    </section>
  );
}

/**
 * Desktops: Variables, Problems, Chronogram and Outline in a card floating on the right, only
 * when opened. Its left edge resizes it (the width is remembered); wide enough, the variables
 * show as the full table, otherwise as the compact list.
 */
export function PanelCard() {
  const { t } = useTranslation();
  const open = useSheet((s) => s.open);
  const tab = useSheet((s) => s.tab);
  const remembered = usePrefs((s) => s.panelWidth);
  const ref = useRef<HTMLElement>(null);
  const room = useRoom(ref, open);
  const tabs: readonly SheetTab[] = PANEL_TABS;
  if (!open || !tabs.includes(tab)) return null;
  const max = Math.max(MIN_WIDTH, room.width - 160);
  const w = Math.min(max, Math.max(MIN_WIDTH, remembered));
  const resize = (v: number) =>
    setPrefs({ panelWidth: Math.min(max, Math.max(MIN_WIDTH, Math.round(v))) });
  return (
    <section
      ref={ref}
      aria-label={t('panels.label')}
      className="gm-island absolute top-[60px] right-3 bottom-[60px] z-20 flex flex-col overflow-hidden"
      style={{ width: w }}
    >
      <Grip
        vertical
        value={w}
        min={MIN_WIDTH}
        max={max}
        onResize={resize}
        className="absolute inset-y-0 left-0 z-10 w-1.5 hover:bg-accent/40 focus-visible:bg-accent/40"
      />
      <PanelTabsView
        tabs={tabs}
        dense
        contentOf={(x) => (x === 'variables' && w >= TABLE_WIDTH ? VariablesPanel : CONTENT[x])}
      />
    </section>
  );
}
