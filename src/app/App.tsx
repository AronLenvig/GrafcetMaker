import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@/editor/canvas/Canvas';
import { GrafcetTabs } from '@/editor/canvas/GrafcetTabs';
import { installShortcuts } from '@/editor/commands/shortcuts';
import { doc } from '@/editor/store/document';
import { isDirty } from '@/editor/store/documentStore';
import { Toolbar } from '@/editor/tools/Toolbar';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { CommandPalette } from './CommandPalette';
import { DialogHost } from './dialogs/DialogHost';
import { DropOverlay } from './DropOverlay';
import { startAutosave } from './persistence/autosave';
import { onStorageError } from './persistence/db';
import { startup, useSession } from './persistence/session';
import { setPrefs, usePrefs } from './prefs';
import { toast, useToasts } from './toasts';
import { TopBar } from './TopBar';
import { cx } from './ui/primitives';
import { Splitter } from './ui/Splitter';

let started = false;

function useAppLifecycle() {
  const { t } = useTranslation();
  useEffect(() => {
    const uninstall = installShortcuts();
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty(doc.store.getState())) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    if (!started) {
      started = true;
      let warned = false;
      onStorageError(() => {
        if (warned) return;
        warned = true;
        toast(t('file.storageUnavailable'), 'warning', 8000);
      });
      startAutosave(() => useSession.getState().fileName ?? undefined);
      void startup();
    }
    return () => {
      uninstall();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [t]);
}

function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
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

export function App() {
  const { t } = useTranslation();
  const prefs = usePrefs();
  useAppLifecycle();
  return (
    <Tooltip.Provider>
      <div className="flex h-full flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          {!prefs.leftCollapsed && (
            <div className="w-12 shrink-0 border-r border-border bg-surface">
              <Toolbar />
            </div>
          )}
          <main className="flex min-w-0 flex-1 flex-col" aria-label={t('canvas.region')}>
            <GrafcetTabs />
            <div className="min-h-0 flex-1">
              <Canvas />
            </div>
          </main>
          {!prefs.rightCollapsed && (
            <>
              <Splitter
                orientation="vertical"
                value={prefs.rightWidth}
                min={220}
                max={640}
                sign={-1}
                label={t('props.resize')}
                onChange={(v) => setPrefs({ rightWidth: v })}
              />
              <div className="shrink-0 bg-surface" style={{ width: prefs.rightWidth }}>
                <PropertiesPanel />
              </div>
            </>
          )}
        </div>
      </div>
      <CommandPalette />
      <DialogHost />
      <DropOverlay />
      <Toasts />
    </Tooltip.Provider>
  );
}
