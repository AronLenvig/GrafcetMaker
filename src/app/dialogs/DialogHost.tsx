import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMMANDS, formatKeys, useAppDialog } from '@/editor/commands/registry';
import { getProject, useDoc } from '@/editor/store/document';
import { listSnapshots, type Snapshot } from '../persistence/db';
import { restoreSnapshot } from '../persistence/session';
import { FeedbackDialog } from '../feedback/FeedbackDialog';
import { SettingsDialog } from '../settings/SettingsDialog';
import { Button, Modal } from '../ui/primitives';
import { closeDialog, useDialogs } from './dialogStore';

// The export dialog (and the PDF/CSV code behind it) is loaded on first use.
const ExportDialog = lazy(() => import('../export/ExportDialog'));
// The start screen builds the example projects and their thumbnails.
const StartScreen = lazy(() => import('../start/StartScreen'));
const ChangelogDialog = lazy(() => import('../help/ChangelogDialog'));

/** Renders queued message dialogs (confirm, error, restore prompts) one at a time. */
function MessageDialogs() {
  const req = useDialogs((s) => s.queue[0]);
  if (!req) return null;
  return (
    <Modal
      open
      role="alertdialog"
      title={req.title}
      onOpenChange={(open) => !open && closeDialog(req.key, req.cancelId)}
      width={440}
    >
      {req.message && <p className="whitespace-pre-line">{req.message}</p>}
      {req.details && (
        <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 font-mono text-xs text-muted">
          {req.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end gap-2">
        {req.actions.map((a, i) => (
          <Button
            key={a.id}
            variant={a.variant ?? 'default'}
            autoFocus={
              a.variant === 'primary' ||
              (i === req.actions.length - 1 && !req.actions.some((x) => x.variant === 'primary'))
            }
            onClick={() => closeDialog(req.key, a.id)}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
}

function LocalHistoryDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const projectId = useDoc((s) => s.project.id);
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  useEffect(() => {
    void listSnapshots(projectId).then(setSnapshots);
  }, [projectId]);
  return (
    <Modal
      open
      title={t('history.local.title')}
      description={t('history.local.description', { name: getProject().name })}
      onOpenChange={(o) => !o && onClose()}
      width={520}
    >
      {snapshots === null ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : snapshots.length === 0 ? (
        <p className="text-muted">{t('history.local.empty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {snapshots.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <div>{new Date(s.takenAt).toLocaleString()}</div>
                <div className="text-xs text-muted">
                  {t(`history.local.reasons.${s.reason}`)} · {s.name}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  void restoreSnapshot(s);
                }}
              >
                {t('history.local.restore')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const rows = COMMANDS.filter((c) => c.keys?.length && !c.hidden);
  return (
    <Modal
      open
      title={t('commands.help.shortcuts')}
      onOpenChange={(o) => !o && onClose()}
      width={520}
    >
      <table className="w-full">
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="py-1.5">{t(`commands.${c.label}` as 'commands.file.new')}</td>
              <td className="py-1.5 text-right">
                <kbd className="font-mono text-xs">{formatKeys(c.keys![0]!)}</kbd>
              </td>
            </tr>
          ))}
          <tr className="border-b border-border">
            <td className="py-1.5">{t('help.keys.nudge')}</td>
            <td className="py-1.5 text-right font-mono text-xs">← ↑ → ↓ / Shift</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-1.5">{t('help.keys.clipboard')}</td>
            <td className="py-1.5 text-right font-mono text-xs">
              {formatKeys('Mod+X')} {formatKeys('Mod+C')} {formatKeys('Mod+V')}
            </td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-1.5">{t('help.keys.pan')}</td>
            <td className="py-1.5 text-right font-mono text-xs">Space + drag / wheel</td>
          </tr>
          <tr>
            <td className="py-1.5">{t('help.keys.zoom')}</td>
            <td className="py-1.5 text-right font-mono text-xs">{formatKeys('Mod')} + wheel</td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open title={t('help.aboutTitle')} onOpenChange={(o) => !o && onClose()} width={420}>
      <p>{t('app.tagline')}</p>
      <p className="mt-2 text-muted">{t('help.aboutText', { version: __APP_VERSION__ })}</p>
    </Modal>
  );
}

export function DialogHost() {
  const open = useAppDialog((s) => s.open);
  const close = () => useAppDialog.setState({ open: null });
  return (
    <>
      {open === 'localHistory' && <LocalHistoryDialog onClose={close} />}
      {open === 'shortcuts' && <ShortcutsDialog onClose={close} />}
      {open === 'about' && <AboutDialog onClose={close} />}
      {open === 'settings' && <SettingsDialog onClose={close} />}
      {open === 'feedback' && <FeedbackDialog onClose={close} />}
      {open === 'changelog' && (
        <Suspense fallback={null}>
          <ChangelogDialog onClose={close} />
        </Suspense>
      )}
      {open === 'start' && (
        <Suspense fallback={null}>
          <StartScreen onClose={close} />
        </Suspense>
      )}
      {open === 'export' && (
        <Suspense fallback={null}>
          <ExportDialog onClose={close} />
        </Suspense>
      )}
      <MessageDialogs />
    </>
  );
}
