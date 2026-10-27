import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EXPORT_FONT_FAMILY, grafcetToSvg } from '@/core/io/svgExport';
import { runCommand } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import { useTheme } from '@/theme/theme';
import { EXAMPLE_IDS, EXAMPLES, type ExampleId } from '../examples/examples';
import { currentThemePalette } from '../export/exporters';
import { guideUrl, openHelp } from '../help/helpStore';
import { listRecent, type RecentEntry } from '../persistence/db';
import { newProject, openNewProject, openRecent, useSession } from '../persistence/session';
import { setPrefs, usePrefs } from '../prefs';
import {
  BookIcon,
  ExportIcon,
  LogoIcon,
  PlayIcon,
  PlusIcon,
  StepIcon,
  UploadIcon,
} from '../ui/icons';
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

/**
 * A small sequence (initial step, transitions, steps, loop back) drawn faintly on the right of the
 * welcome banner: decoration only.
 */
function Sequence() {
  return (
    <svg
      viewBox="0 0 120 150"
      width="120"
      height="150"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute top-2 right-6 hidden text-accent opacity-25 lg:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="45" y="6" width="30" height="30" />
      <rect x="49" y="10" width="22" height="22" />
      <path d="M60 36v20M50 46h20M60 56v14" />
      <rect x="45" y="70" width="30" height="30" />
      <path d="M75 85h12M60 100v14M50 108h20M60 114v26H25V21h20" />
      <rect x="87" y="76" width="26" height="18" />
      <path d="M21 80l4-6 4 6" />
    </svg>
  );
}

/** Start screen: welcome, continue, new, open, tour, help, recent files and examples. */
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
  // The start actions as tiles; the first one (continue, or new on a first visit) outlined.
  const tile =
    'flex min-h-[76px] flex-col items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-left font-medium hover:border-accent hover:bg-surface-2 compact:min-h-0';
  const lead = 'border-[1.5px] border-accent text-accent';
  const heading = 'mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase';

  return (
    <Modal open title={t('start.title')} onOpenChange={(o) => !o && onClose()} width={960}>
      <div className="flex flex-col gap-5">
        <section className="relative overflow-hidden rounded-lg border border-border bg-accent-soft/50 p-5 compact:p-4">
          <Sequence />
          <div className="relative flex items-start gap-4 compact:gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-accent text-accent compact:h-11 compact:w-11">
              <LogoIcon size={30} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl leading-tight font-semibold tracking-tight compact:text-xl">
                {t('start.welcome')}
              </h2>
              <p className="mt-0.5 text-muted">{t('app.tagline')}</p>
              <p className="mt-2 max-w-[62ch]">{t('start.pitch')}</p>
            </div>
          </div>
          <ul className="relative mt-4 flex flex-wrap gap-2 compact:hidden">
            {(
              [
                ['draw', StepIcon],
                ['simulate', PlayIcon],
                ['export', ExportIcon],
              ] as const
            ).map(([key, Icon]) => (
              <li
                key={key}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium"
              >
                <Icon size={13} className="text-accent" />
                {t(`start.highlights.${key}`)}
              </li>
            ))}
          </ul>
        </section>
        <nav
          aria-label={t('start.start')}
          className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]"
        >
          {/* Nothing to continue on a first visit (the untouched starting project). */}
          {!firstVisit && (
            <button type="button" autoFocus onClick={onClose} className={cx(tile, lead)}>
              <PlayIcon size={18} />
              <span className="w-full min-w-0 truncate">
                {t('start.continue', { name: current })}
              </span>
            </button>
          )}
          <button
            type="button"
            autoFocus={firstVisit}
            onClick={then(newProject)}
            className={cx(tile, firstVisit && lead)}
          >
            <PlusIcon size={18} className="text-accent" />
            {t('commands.file.new')}
          </button>
          <button type="button" onClick={then(() => runCommand('file.open'))} className={tile}>
            <UploadIcon size={18} className="text-accent" />
            {t('commands.file.open')}
          </button>
          {/* The tour points at the side panels, which phones do not have. */}
          <button type="button" onClick={then(startTour)} className={cx(tile, 'compact:hidden')}>
            <span aria-hidden="true" className="text-[18px] leading-none text-accent">
              ✦
            </span>
            {tourDone ? t('start.tourAgain') : t('start.tour')}
          </button>
        </nav>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-4">
            <nav aria-label={t('start.learn')} className="flex flex-col gap-0.5">
              <h3 className={heading}>{t('start.learn')}</h3>
              <button
                type="button"
                onClick={then(() => openHelp('getting-started'))}
                className={action}
              >
                <BookIcon size={15} /> {t('start.gettingStarted')}
              </button>
              {/* A real link: the guide is a page of its own, for readers and search engines. */}
              <a href={guideUrl()} target="_blank" rel="noopener" className={action}>
                <span aria-hidden="true" className="w-[15px] text-center">
                  ↗
                </span>
                {t('start.guide')}
              </a>
            </nav>
            {recent.length > 0 && (
              <nav aria-label={t('commands.file.openRecent')} className="flex flex-col gap-0.5">
                <h3 className={heading}>{t('commands.file.openRecent')}</h3>
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
            <h3 id="start-examples" className={heading}>
              {t('start.examples')}
            </h3>
            <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
              {EXAMPLE_IDS.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() =>
                      void openNewProject(EXAMPLES[id]()).then((opened) => opened && onClose())
                    }
                    className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-accent focus-visible:border-accent motion-reduce:transition-none"
                  >
                    <Thumbnail id={id} />
                    <span className="flex-1 border-t border-border px-3 py-2">
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
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
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
