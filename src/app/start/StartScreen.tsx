import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EXPORT_FONT_FAMILY, grafcetToSvg } from '@/core/io/svgExport';
import { runCommand } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import { useTheme } from '@/theme/theme';
import { EXAMPLE_IDS, EXAMPLES, type ExampleId } from '../examples/examples';
import { currentThemePalette } from '../export/exporters';
import { openHelp } from '../help/helpStore';
import { listRecent, type RecentEntry } from '../persistence/db';
import { newProject, openNewProject, openRecent, useSession } from '../persistence/session';
import { setPrefs, usePrefs } from '../prefs';
import { BookIcon, LogoIcon, PlayIcon, PlusIcon, UploadIcon } from '../ui/icons';
import { Button, cx, Modal } from '../ui/primitives';
import { startTour } from './tourStore';

/** Thumbnail of an example's first grafcet, in the colors of the current theme. */
function Thumbnail({ id }: { id: ExampleId }) {
  const resolved = useTheme((s) => s.resolved);
  const svg = useMemo(() => {
    void resolved; // The palette comes from the theme's CSS variables.
    const p = EXAMPLES[id]();
    const g = p.grafcets[p.grafcetOrder[0]!]!;
    return grafcetToSvg(
      { ...g, comments: {} },
      {
        palette: { ...currentThemePalette(), background: null },
        fontFamily: EXPORT_FONT_FAMILY,
        margin: 10,
        textbook: true,
      },
    ).svg;
  }, [id, resolved]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [svg]);
  return (
    <div className="flex h-36 items-center justify-center overflow-hidden rounded-t-md bg-canvas p-2">
      {url && <img src={url} alt="" className="max-h-full max-w-full" />}
    </div>
  );
}

/** Start screen: continue, new, open, recent files, examples, tour and help. */
export default function StartScreen({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const current = useDoc((s) => s.project.name);
  // First visit: the starting project was neither restored nor opened, and nothing is drawn yet.
  const fresh = useSession((s) => s.fresh);
  const untouched = useDoc((s) => s.past.length === 0);
  const firstVisit = fresh && untouched;
  const showAtStart = usePrefs((s) => s.showStartScreen);
  const tourDone = usePrefs((s) => s.tourDone);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  useEffect(() => {
    void listRecent().then((r) => setRecent(r.slice(0, 5)));
  }, []);

  const then = (action: () => unknown) => () => {
    onClose();
    void action();
  };
  const action = 'flex items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-surface-2';

  return (
    <Modal open title={t('start.title')} onOpenChange={(o) => !o && onClose()} width={900}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <LogoIcon size={32} className="text-accent" />
          <div>
            <p className="text-base font-semibold">GrafcetMaker</p>
            <p className="text-muted">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[230px_1fr]">
          <div className="flex flex-col gap-4">
            <nav aria-label={t('start.start')} className="flex flex-col gap-0.5">
              <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                {t('start.start')}
              </h3>
              {/* Nothing to continue on a first visit (the untouched starting project). */}
              {!firstVisit && (
                <button
                  type="button"
                  autoFocus
                  onClick={onClose}
                  className={cx(action, 'font-medium')}
                >
                  <PlayIcon size={13} className="text-accent" />
                  <span className="min-w-0 truncate">{t('start.continue', { name: current })}</span>
                </button>
              )}
              <button
                type="button"
                autoFocus={firstVisit}
                onClick={then(newProject)}
                className={action}
              >
                <PlusIcon size={15} /> {t('commands.file.new')}
              </button>
              <button
                type="button"
                onClick={then(() => runCommand('file.open'))}
                className={action}
              >
                <UploadIcon size={15} /> {t('commands.file.open')}
              </button>
              {/* The tour points at the side panels, which phones do not have. */}
              <button
                type="button"
                onClick={then(startTour)}
                className={cx(action, 'compact:hidden')}
              >
                <span aria-hidden="true" className="w-[15px] text-center">
                  ✦
                </span>
                {tourDone ? t('start.tourAgain') : t('start.tour')}
              </button>
              <button
                type="button"
                onClick={then(() => openHelp('getting-started'))}
                className={action}
              >
                <BookIcon size={15} /> {t('start.gettingStarted')}
              </button>
            </nav>
            {recent.length > 0 && (
              <nav aria-label={t('commands.file.openRecent')} className="flex flex-col gap-0.5">
                <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {t('commands.file.openRecent')}
                </h3>
                {recent.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={then(() => openRecent(r))}
                    className={cx(action, 'flex-col items-start gap-0')}
                  >
                    <span className="w-full truncate">{r.name}</span>
                    {r.fileName && (
                      <span className="w-full truncate text-xs text-muted">{r.fileName}</span>
                    )}
                  </button>
                ))}
              </nav>
            )}
          </div>
          <section aria-labelledby="start-examples" className="flex min-w-0 flex-col gap-2">
            <h3
              id="start-examples"
              className="text-[11px] font-semibold tracking-wider text-muted uppercase"
            >
              {t('start.examples')}
            </h3>
            <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {EXAMPLE_IDS.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() =>
                      void openNewProject(EXAMPLES[id]()).then((opened) => opened && onClose())
                    }
                    className="flex w-full flex-col rounded-md border border-border text-left hover:border-accent focus-visible:border-accent"
                  >
                    <Thumbnail id={id} />
                    <span className="border-t border-border px-3 py-2">
                      <span className="block font-medium">{t(`start.exampleNames.${id}`)}</span>
                      <span className="block text-xs text-muted">
                        {t(`start.exampleHints.${id}`)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={showAtStart}
              onChange={(e) => setPrefs({ showStartScreen: e.target.checked })}
            />
            {t('start.showAtStart')}
          </label>
          <Button className="ml-auto" variant="primary" onClick={onClose}>
            {firstVisit ? t('start.startDrawing') : t('start.continueShort')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
