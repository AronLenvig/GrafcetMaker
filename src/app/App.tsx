import * as Tooltip from '@radix-ui/react-tooltip';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@/editor/canvas/Canvas';
import { CanvasArea } from '@/editor/canvas/CanvasArea';
import { GrafcetTabs } from '@/editor/canvas/GrafcetTabs';
import { installShortcuts } from '@/editor/commands/shortcuts';
import { BottomToolbar, RailFooter, Toolbar } from '@/editor/tools/Toolbar';
import { openAppDialog } from '@/editor/commands/registry';
import { startValidation } from '@/editor/validation/problems';
import { BottomPanel } from '@/panels/BottomPanel';
import { MobileSheet } from '@/panels/MobileSheet';
import { RightPanel } from '@/panels/RightPanel';
import { useSim } from '@/editor/simulation/simStore';
import { useUi } from '@/editor/store/uiStore';
import { SimBar } from './SimBar';
import { CommandPalette } from './CommandPalette';
import { DialogHost } from './dialogs/DialogHost';
import { isDialogOpen } from './dialogs/dialogStore';
import { DropOverlay } from './DropOverlay';
import { startPwa } from './pwa';
import { Tour } from './start/Tour';
import { UpdateBanner } from './UpdateBanner';
import { openHelpFromHash, useHelp } from './help/helpStore';
import { startAutosave } from './persistence/autosave';
import { onStorageError } from './persistence/db';
import { openSharedLink, startup, useSession } from './persistence/session';
import { setPrefs, usePrefs } from './prefs';
import { closeSheet, showSheet, useSheet } from './sheet';
import { toast, useToasts } from './toasts';
import { TopBar } from './TopBar';
import { useCompact } from './ui/media';
import { cx } from './ui/primitives';
import { Splitter } from './ui/Splitter';

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
      // A share link pasted into the address bar of an open tab only changes the hash.
      window.addEventListener('hashchange', () => void openSharedLink());
      void startup().then(async () => {
        if (await openSharedLink()) return;
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
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col items-center gap-2 compact:bottom-20"
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
  // The inputs are what a simulation needs first; the sheet closes again when it stops.
  useEffect(() => {
    if (simulating) showSheet('simulation');
    else if (['simulation', 'chronogram'].includes(useSheet.getState().tab)) closeSheet();
  }, [simulating]);
  return (
    <>
      <div className="flex h-full flex-col">
        {simulating ? <SimBar /> : <TopBar />}
        <main className="flex min-h-0 flex-1 flex-col" aria-label={t('canvas.region')}>
          <GrafcetTabs />
          <div data-tour="canvas" className="relative min-h-0 flex-1">
            <Canvas gid={active} />
            <MobileSheet />
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

function DesktopLayout() {
  const { t } = useTranslation();
  const prefs = usePrefs();
  const simulating = useSim((s) => s.on);
  const helpOpen = useHelp((s) => s.open);
  return (
    <div className="flex h-full flex-col">
      {simulating ? <SimBar /> : <TopBar />}
      <div className="flex min-h-0 flex-1">
        {!prefs.leftCollapsed && (
          <div data-tour="tools" className="w-12 shrink-0 border-r border-border bg-surface">
            {simulating ? (
              <div className="flex h-full flex-col items-center py-2">
                <RailFooter />
              </div>
            ) : (
              <Toolbar />
            )}
          </div>
        )}
        <main className="flex min-w-0 flex-1 flex-col" aria-label={t('canvas.region')}>
          <GrafcetTabs />
          <div data-tour="canvas" className="min-h-0 flex-1">
            <CanvasArea />
          </div>
          {!prefs.bottomCollapsed && (
            <Splitter
              orientation="horizontal"
              value={prefs.bottomHeight}
              min={120}
              max={Math.max(160, window.innerHeight - 220)}
              sign={-1}
              label={t('panels.resize')}
              onChange={(v) => setPrefs({ bottomHeight: v })}
            />
          )}
          <div
            data-tour="bottom"
            className="shrink-0"
            style={{ height: prefs.bottomCollapsed ? 32 : prefs.bottomHeight }}
          >
            <BottomPanel />
          </div>
        </main>
        {!prefs.rightCollapsed && (
          <aside aria-label={t('props.panel')} className="flex shrink-0">
            <Splitter
              orientation="vertical"
              value={prefs.rightWidth}
              min={220}
              max={640}
              sign={-1}
              label={t('props.resize')}
              onChange={(v) => setPrefs({ rightWidth: v })}
            />
            <div
              data-tour="side"
              className="shrink-0 bg-surface"
              style={{ width: prefs.rightWidth }}
            >
              <RightPanel />
            </div>
          </aside>
        )}
        {helpOpen && (
          <div className="w-[min(440px,40vw)] min-w-72 shrink-0">
            <Suspense fallback={null}>
              <HelpPanel />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
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
