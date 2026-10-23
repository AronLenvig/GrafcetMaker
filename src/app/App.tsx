import * as Tooltip from '@radix-ui/react-tooltip';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@/editor/canvas/Canvas';
import { CanvasArea } from '@/editor/canvas/CanvasArea';
import { setViewInsets } from '@/editor/canvas/viewport';
import { GrafcetTabs } from '@/editor/canvas/GrafcetTabs';
import { installShortcuts } from '@/editor/commands/shortcuts';
import { BottomToolbar } from '@/editor/tools/Toolbar';
import { openAppDialog } from '@/editor/commands/registry';
import { startValidation } from '@/editor/validation/problems';
import { PanelCard, PanelSheet } from '@/panels/PanelSheet';
import { PropertiesCard } from '@/panels/PropertiesCard';
import { SimulationCard } from '@/panels/SimulationCard';
import { useSim } from '@/editor/simulation/simStore';
import { useUi } from '@/editor/store/uiStore';
import { SimBar } from './SimBar';
import { CommandPalette } from './CommandPalette';
import { DialogHost } from './dialogs/DialogHost';
import { isDialogOpen } from './dialogs/dialogStore';
import { DropOverlay } from './DropOverlay';
import { Islands } from './Islands';
import { startPwa } from './pwa';
import { Tour } from './start/Tour';
import { UpdateBanner } from './UpdateBanner';
import { openHelpFromHash, useHelp } from './help/helpStore';
import { startAutosave } from './persistence/autosave';
import { onStorageError } from './persistence/db';
import { openRoomLink } from './collab/liveStore';
import { openSharedLink, startup, useSession } from './persistence/session';
import { usePrefs } from './prefs';
import { closeSheet, showSheet, useSheet } from './sheet';
import { usePanelSpace, useSideWidths } from './sideWidths';
import { toast, useToasts } from './toasts';
import { TopBar } from './TopBar';
import { useCompact } from './ui/media';
import { cx } from './ui/primitives';

// The help center (pages, figures, search) is loaded when first opened.
const HelpPanel = lazy(() => import('./help/HelpPanel'));

let started = false;

function useAppLifecycle() {
  const { t } = useTranslation();
  useEffect(() => {
    // No "leave page?" confirmation: autosave keeps the work and the next visit reopens it.
    const uninstall = installShortcuts();
    if (!started) {
      started = true;
      let warned = false;
      onStorageError(() => {
        if (warned) return;
        warned = true;
        toast(t('file.storageUnavailable'), 'warning', 8000);
      });
      startAutosave(() => useSession.getState().fileName ?? undefined);
      startValidation();
      startPwa();
      // A share or live session link pasted into the address bar of an open tab only changes the hash.
      window.addEventListener('hashchange', () => {
        void openSharedLink().then((opened) => opened || openRoomLink());
      });
      void startup().then(async () => {
        if (await openSharedLink()) return;
        if (await openRoomLink()) return;
        openHelpFromHash();
        // The start screen greets every launch unless turned off (not over a help link or a dialog).
        if (usePrefs.getState().showStartScreen && !useHelp.getState().open && !isDialogOpen())
          openAppDialog('start');
      });
    }
    return uninstall;
  }, [t]);
}

function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[68px] left-1/2 z-50 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col items-center gap-2 compact:bottom-20"
    >
      {toasts.map((x) => (
        <div
          key={x.id}
          role={x.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'rounded-md border px-3 py-2 shadow-pop',
            x.tone === 'error' && 'border-danger bg-danger-soft text-danger',
            x.tone === 'warning' && 'border-warning bg-warning-soft text-warning',
            x.tone === 'success' && 'border-success bg-success-soft text-success',
            x.tone === 'info' && 'border-border bg-surface text-text',
          )}
        >
          {x.message}
        </div>
      ))}
    </div>
  );
}

/**
 * Phones: the canvas fills the screen between the top bar and a bottom toolbar; the panels share a
 * sheet over the canvas, the help covers the screen. One grafcet at a time (no split view).
 */
function CompactLayout() {
  const { t } = useTranslation();
  const simulating = useSim((s) => s.on);
  const helpOpen = useHelp((s) => s.open);
  const active = useUi((s) => s.activeGrafcetId);
  useSimulationPanel();
  useEffect(() => setViewInsets({ top: 0, right: 0, bottom: 0, left: 0 }), []);
  return (
    <>
      <div className="flex h-full flex-col">
        {simulating ? <SimBar /> : <TopBar />}
        <main className="flex min-h-0 flex-1 flex-col" aria-label={t('canvas.region')}>
          <GrafcetTabs />
          <div data-tour="canvas" className="relative min-h-0 flex-1">
            <Canvas gid={active} />
            <PanelSheet />
          </div>
        </main>
        <BottomToolbar />
      </div>
      {helpOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Suspense fallback={null}>
            <HelpPanel />
          </Suspense>
        </div>
      )}
    </>
  );
}

/**
 * Desktops and tablets: the diagram fills the window; everything else floats over it as islands
 * (see Islands) and appears only when needed: the properties card while something is selected,
 * the panel card when a panel is opened, the help on the right.
 */
function DesktopLayout() {
  const { t } = useTranslation();
  const helpOpen = useHelp((s) => s.open);
  const split = useUi((s) => s.split !== null);
  const panelSpace = usePanelSpace();
  const hints = usePrefs((s) => s.showHints);
  const { left, right } = useSideWidths();
  // Fit and reveal keep the diagram clear of the islands that are showing.
  useEffect(() => {
    setViewInsets({
      top: split ? 0 : hints ? 104 : 64,
      bottom: 64,
      left: split ? 0 : left,
      right: split ? 0 : right,
    });
  }, [split, hints, left, right]);
  return (
    <div className="relative h-full overflow-hidden bg-canvas">
      {/* Split panes have headers: they start below the top islands. */}
      <main
        aria-label={t('canvas.region')}
        data-tour="canvas"
        className={cx('absolute inset-x-0 bottom-0', split ? 'top-16' : 'top-0')}
      >
        <CanvasArea />
      </main>
      <Islands />
      <PropertiesCard />
      <SimulationCard />
      <PanelCard />
      {helpOpen && (
        // Next to the panel card when both are open.
        <div
          className="gm-island absolute top-[60px] bottom-[60px] z-30 w-[min(440px,40vw)] min-w-72 overflow-hidden"
          style={{ right: 12 + panelSpace }}
        >
          <Suspense fallback={null}>
            <HelpPanel />
          </Suspense>
        </div>
      )}
    </div>
  );
}

/** Phones: the inputs are what a simulation needs first, so their tab opens (and closes after). */
function useSimulationPanel() {
  const simulating = useSim((s) => s.on);
  useEffect(() => {
    if (simulating) showSheet('simulation');
    else if (['simulation', 'chronogram'].includes(useSheet.getState().tab)) closeSheet();
  }, [simulating]);
}

export function App() {
  const compact = useCompact();
  useAppLifecycle();
  return (
    <Tooltip.Provider>
      {compact ? <CompactLayout /> : <DesktopLayout />}
      <CommandPalette />
      <DialogHost />
      <Tour />
      <UpdateBanner />
      <DropOverlay />
      <Toasts />
    </Tooltip.Provider>
  );
}
