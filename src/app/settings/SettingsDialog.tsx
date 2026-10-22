import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { openAppDialog } from '@/editor/commands/registry';
import { SPEEDS } from '@/editor/simulation/simStore';
import { useTheme, type ThemeMode } from '@/theme/theme';
import { showDialog } from '../dialogs/dialogStore';
import { db, safely } from '../persistence/db';
import { downloadCopy } from '../persistence/session';
import { resetPrefs, setPrefs, usePrefs } from '../prefs';
import { toast } from '../toasts';
import { Button, cx, Modal, Select, Switch } from '../ui/primitives';

const SECTIONS = ['appearance', 'editor', 'simulation', 'data', 'about'] as const;
type Section = (typeof SECTIONS)[number];

/** One setting: label and explanation on the left, its control on the right. */
function Row({
  label,
  help,
  children,
  htmlFor,
}: {
  label: string;
  help?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="font-medium">
            {label}
          </label>
        ) : (
          <span className="font-medium">{label}</span>
        )}
        {help && <p className="mt-0.5 text-xs text-muted">{help}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SwitchRow({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <Row label={label} help={help} htmlFor={id}>
      <Switch id={id} checked={value} onChange={onChange} />
    </Row>
  );
}

function Appearance() {
  const { t } = useTranslation();
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const textbook = usePrefs((s) => s.textbookNotation);
  const welcome = usePrefs((s) => s.showStartScreen);
  return (
    <>
      <Row label={t('theme.label')} help={t('settings.themeHelp')}>
        <div
          role="radiogroup"
          aria-label={t('theme.label')}
          className="flex rounded-md border border-border bg-surface-2 p-0.5"
        >
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                'h-7 rounded px-3 text-xs',
                mode === m ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
              )}
            >
              {t(`theme.${m}`)}
            </button>
          ))}
        </div>
      </Row>
      <SwitchRow
        label={t('commands.view.textbook')}
        help={t('settings.textbookHelp')}
        value={textbook}
        onChange={(v) => setPrefs({ textbookNotation: v })}
      />
      <SwitchRow
        label={t('settings.welcome')}
        help={t('settings.welcomeHelp')}
        value={welcome}
        onChange={(v) => setPrefs({ showStartScreen: v })}
      />
    </>
  );
}

function Editor() {
  const { t } = useTranslation();
  const prefs = usePrefs();
  return (
    <>
      <SwitchRow
        label={t('commands.view.showGrid')}
        value={prefs.showGrid}
        onChange={(v) => setPrefs({ showGrid: v })}
      />
      <SwitchRow
        label={t('commands.view.snapToGrid')}
        help={t('settings.snapHelp')}
        value={prefs.snapToGrid}
        onChange={(v) => setPrefs({ snapToGrid: v })}
      />
      <SwitchRow
        label={t('commands.view.hints')}
        help={t('settings.hintsHelp')}
        value={prefs.showHints}
        onChange={(v) => setPrefs({ showHints: v })}
      />
      <Row label={t('settings.autosave')} help={t('settings.autosaveHelp')}>
        <span className="text-xs text-success">{t('settings.on')}</span>
      </Row>
    </>
  );
}

function Simulation() {
  const { t } = useTranslation();
  const prefs = usePrefs();
  const id = useId();
  return (
    <>
      <Row label={t('settings.simSpeed')} help={t('settings.simSpeedHelp')} htmlFor={id}>
        <div className="w-32">
          <Select
            id={id}
            small
            value={prefs.simSpeed}
            onChange={(e) => setPrefs({ simSpeed: e.target.value })}
          >
            {SPEEDS.map((s) => (
              <option key={String(s)} value={String(s)}>
                {s === 'fast' ? t('simulation.fast') : `×${s}`}
              </option>
            ))}
          </Select>
        </div>
      </Row>
      <SwitchRow
        label={t('settings.simFlash')}
        help={t('settings.simFlashHelp')}
        value={prefs.simFlash}
        onChange={(v) => setPrefs({ simFlash: v })}
      />
      <SwitchRow
        label={t('settings.simStepTimers')}
        help={t('settings.simStepTimersHelp')}
        value={prefs.simStepTimers}
        onChange={(v) => setPrefs({ simStepTimers: v })}
      />
    </>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Data() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [counts, setCounts] = useState<{ snapshots: number; recent: number } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const est = await navigator.storage?.estimate?.().catch(() => undefined);
      const snapshots = (await safely(() => db.snapshots.count())) ?? 0;
      const recent = (await safely(() => db.recent.count())) ?? 0;
      if (!alive) return;
      if (est?.usage !== undefined && est.quota) setUsage({ used: est.usage, quota: est.quota });
      setCounts({ snapshots, recent });
    })();
    return () => {
      alive = false;
    };
  }, [tick]);

  const confirm = async (title: string, message: string) =>
    (await showDialog({
      title,
      message,
      actions: [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'ok', label: t('settings.clear'), variant: 'danger' },
      ],
      cancelId: 'cancel',
    })) === 'ok';

  return (
    <>
      <Row label={t('settings.storage')} help={t('settings.storageHelp')}>
        <span className="text-xs text-muted tabular-nums">
          {usage
            ? t('settings.storageUsed', {
                used: formatBytes(usage.used),
                quota: formatBytes(usage.quota),
              })
            : '–'}
        </span>
      </Row>
      <Row label={t('settings.backup')} help={t('settings.backupHelp')}>
        <Button size="sm" onClick={() => downloadCopy()}>
          {t('commands.file.downloadCopy')}
        </Button>
      </Row>
      <Row
        label={t('settings.history')}
        help={t('settings.historyHelp', { count: counts?.snapshots ?? 0 })}
      >
        <Button
          size="sm"
          variant="danger"
          disabled={!counts?.snapshots}
          onClick={() =>
            void (async () => {
              if (!(await confirm(t('settings.clearHistoryTitle'), t('settings.clearHistoryText'))))
                return;
              await safely(() => db.snapshots.clear());
              toast(t('settings.cleared'), 'success');
              setTick((x) => x + 1);
            })()
          }
        >
          {t('settings.clear')}
        </Button>
      </Row>
      <Row
        label={t('settings.recent')}
        help={t('settings.recentHelp', { count: counts?.recent ?? 0 })}
      >
        <Button
          size="sm"
          variant="danger"
          disabled={!counts?.recent}
          onClick={() =>
            void (async () => {
              await safely(() => db.recent.clear());
              toast(t('settings.cleared'), 'success');
              setTick((x) => x + 1);
            })()
          }
        >
          {t('settings.clear')}
        </Button>
      </Row>
      <Row label={t('settings.reset')} help={t('settings.resetHelp')}>
        <Button
          size="sm"
          onClick={() => {
            resetPrefs();
            toast(t('settings.resetDone'), 'success');
          }}
        >
          {t('settings.resetButton')}
        </Button>
      </Row>
    </>
  );
}

function About({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <Row label="GrafcetMaker" help={t('help.aboutText', { version: __APP_VERSION__ })}>
        <span className="font-mono text-xs text-muted">v{__APP_VERSION__}</span>
      </Row>
      <Row label={t('commands.help.shortcuts')} help={t('settings.shortcutsHelp')}>
        <Button
          size="sm"
          onClick={() => {
            onClose();
            openAppDialog('shortcuts');
          }}
        >
          {t('settings.open')}
        </Button>
      </Row>
      <Row label={t('commands.help.feedback')} help={t('settings.feedbackHelp')}>
        <Button
          size="sm"
          onClick={() => {
            onClose();
            openAppDialog('feedback');
          }}
        >
          {t('settings.open')}
        </Button>
      </Row>
      <Row label={t('settings.privacy')} help={t('settings.privacyHelp')}>
        <span />
      </Row>
    </>
  );
}

/** Settings (Ctrl+,): appearance, editor, simulation defaults, local data. Applied immediately. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('appearance');
  return (
    <Modal open title={t('settings.title')} onOpenChange={(o) => !o && onClose()} width={720}>
      <Tabs.Root
        value={section}
        onValueChange={(v) => setSection(v as Section)}
        orientation="vertical"
        className="flex min-h-[380px] gap-4"
      >
        <Tabs.List aria-label={t('settings.title')} className="flex w-40 shrink-0 flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <Tabs.Trigger
              key={s}
              value={s}
              className="rounded-md px-3 py-1.5 text-left text-muted hover:bg-surface-2 hover:text-text data-[state=active]:bg-accent-soft data-[state=active]:font-medium data-[state=active]:text-text"
            >
              {t(`settings.sections.${s}`)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="min-w-0 flex-1">
          <Tabs.Content value="appearance" className="outline-none">
            <Appearance />
          </Tabs.Content>
          <Tabs.Content value="editor" className="outline-none">
            <Editor />
          </Tabs.Content>
          <Tabs.Content value="simulation" className="outline-none">
            <Simulation />
          </Tabs.Content>
          <Tabs.Content value="data" className="outline-none">
            <Data />
          </Tabs.Content>
          <Tabs.Content value="about" className="outline-none">
            <About onClose={onClose} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Modal>
  );
}
