import * as Tabs from '@radix-ui/react-tabs';
import { lazy, Suspense, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { setPrefs, usePrefs } from '@/app/prefs';
import { closeSheet, PANEL_TABS, SHEET_TABS, useSheet, type SheetTab } from '@/app/sheet';
import { CloseIcon } from '@/app/ui/icons';
import { cx, IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { useProblems } from '@/editor/validation/problems';
import { OutlinePanel } from './OutlinePanel';
import { ProblemsPanel } from './ProblemsPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SimInspector } from './SimInspector';
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

function Properties() {
  const simulating = useSim((s) => s.on);
  return simulating ? <SimInspector /> : <PropertiesPanel />;
}

const CONTENT: Record<SheetTab, ComponentType> = {
  properties: Properties,
  variables: VariablesSidePanel,
  problems: ProblemsPanel,
  simulation: SimulationPanel,
  chronogram: ChronogramPanel,
  outline: OutlinePanel,
};

const MIN_HEIGHT = 140;

/**
 * The panels, only when asked for. Phones: a sheet over the lower part of the canvas with every
 * panel as a tab (the narrow variable list). Desktops (`floating`): a card above the bottom
 * islands, with the variable table; its height is remembered. The grab handle resizes it (drag,
 * or arrow keys); the diagram stays visible and usable above it.
 */
export function PanelSheet({ floating = false }: { floating?: boolean }) {
  const { t } = useTranslation();
  const open = useSheet((s) => s.open);
  const tab = useSheet((s) => s.tab);
  const simulating = useSim((s) => s.on);
  const problems = useProblems((s) => s.counts.error + s.counts.warning);
  const remembered = usePrefs((s) => s.bottomHeight);
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [room, setRoom] = useState(0);

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const update = () => setRoom(parent.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [open]);

  const tabs: readonly SheetTab[] = floating ? PANEL_TABS : SHEET_TABS;
  if (!open || !tabs.includes(tab)) return null;
  // Desktops keep the top islands visible; phones leave a strip of diagram.
  const max = Math.max(MIN_HEIGHT, room - (floating ? 140 : 48));
  const wanted = floating ? remembered : (height ?? Math.round(room * 0.5));
  const h = Math.min(max, Math.max(MIN_HEIGHT, wanted));
  const resize = (v: number) => {
    const next = Math.min(max, Math.max(MIN_HEIGHT, Math.round(v)));
    if (floating) setPrefs({ bottomHeight: next });
    else setHeight(next);
  };
  const label = (x: SheetTab) =>
    x === 'properties'
      ? simulating
        ? t('props.inspector')
        : t('props.label')
      : x === 'outline'
        ? t('outline.tab')
        : t(`panels.${x}`);

  return (
    <section
      ref={ref}
      aria-label={t('panels.label')}
      className={cx(
        'absolute z-20 flex flex-col bg-surface',
        floating
          ? 'gm-island right-3 bottom-[60px] left-3 overflow-hidden'
          : 'inset-x-0 bottom-0 rounded-t-xl border-t border-border shadow-pop',
      )}
      style={{ height: h }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('panels.resizeSheet')}
        aria-valuenow={h}
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={max}
        tabIndex={0}
        className={cx(
          'flex shrink-0 cursor-row-resize touch-none items-center justify-center',
          floating ? 'h-3' : 'h-5',
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, height: h };
        }}
        onPointerMove={(e) => {
          if (drag.current) resize(drag.current.height - (e.clientY - drag.current.y));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const d = e.key === 'ArrowUp' ? 32 : e.key === 'ArrowDown' ? -32 : 0;
          if (!d) return;
          e.preventDefault();
          resize(h + d);
        }}
      >
        <span className="h-1 w-10 rounded-full bg-border-strong" />
      </div>
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
                  floating ? 'h-8' : 'h-10',
                )}
              >
                {label(x)}
                {x === 'problems' && problems > 0 && (
                  <span className="rounded-full bg-surface-3 px-1.5 text-xs tabular-nums">
                    {problems}
                  </span>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <IconButton
            label={t('common.close')}
            title={t('common.close')}
            className={cx('shrink-0', floating ? 'h-8 w-8' : 'h-10 w-10')}
            onClick={closeSheet}
          >
            <CloseIcon size={16} />
          </IconButton>
        </div>
        {tabs.map((x) => {
          const Content = floating && x === 'variables' ? VariablesPanel : CONTENT[x];
          return (
            <Tabs.Content key={x} value={x} className="min-h-0 flex-1 overflow-auto outline-none">
              <Content />
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
    </section>
  );
}
