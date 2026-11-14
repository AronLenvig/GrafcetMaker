import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { variablesToCsv } from '@/core/io/csv';
import { groupWarnings, type CodegenWarning } from '@/core/codegen/common';
import { ST_DIALECTS } from '@/core/codegen/dialect';
import type { Id } from '@/core/model/types';
import { tDynamic } from '@/i18n/dynamic';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { downloadBlob } from '../persistence/fileAccess';
import { toast } from '@/ui/toasts';
import { ChevronLeftIcon, ChevronRightIcon } from '@/ui/icons';
import { Button, cx, Modal, Select } from '@/ui/primitives';
import {
  copyToClipboard,
  loadExportSettings,
  renderSvg,
  safeFileName,
  saveExportSettings,
  requestedFormat,
  requestExportFormat,
  targetOf,
  UnsupportedFormatError,
  type ExportSettings,
  type Target,
} from './exporters';
import { EXPORT_FORMAT_IDS, EXPORT_FORMATS, isProjectWide, isRaster } from './formats';
import { planPages, renderPage } from './pages';

/** The headings the formats are listed under. */
const FORMAT_GROUP = {
  pages: 'drawing',
  vector: 'drawing',
  raster: 'drawing',
  variables: 'variables',
  code: 'code',
} as const;
import { generateCode } from './produce';

/** A label in the first column of the options grid, and its control in the second. */
function Row({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <>
      <span id={id} className="text-xs font-medium text-muted compact:mt-1">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </>
  );
}

/** A short choice as one row of buttons: native radios, so arrow keys and screen readers work. */
function Segmented<T extends string | number>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <Row label={label} id={id}>
      <div
        role="radiogroup"
        aria-labelledby={id}
        // The gaps show the border color: separators also between rows when it wraps (phones).
        className="inline-flex max-w-full flex-wrap gap-px overflow-hidden rounded-md border border-border bg-border"
      >
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cx(
              'flex flex-auto cursor-pointer items-center justify-center bg-surface px-2.5 py-1 hover:bg-surface-2',
              'has-checked:bg-accent-soft has-checked:font-medium has-checked:text-text',
              'has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-focus',
              o.disabled && 'cursor-not-allowed text-muted hover:bg-surface',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </Row>
  );
}

/** A longer list of choices as a drop-down. */
function Choice({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  const id = useId();
  return (
    <Row label={label} id={id}>
      {/* As wide as its longest choice, the chevron at its own edge. */}
      <div className="inline-block max-w-full">
        <Select
          small
          aria-labelledby={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-auto max-w-full pr-8"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </Row>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Explanation under an option, across both columns. */
const Hint = ({ children }: { children: ReactNode }) => (
  <p className="col-span-2 text-xs text-muted">{children}</p>
);

/** One dialog for every export format, with live preview; settings are remembered per project. */
export default function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const project = useDoc((s) => s.project);
  const gid = useUi((s) => s.activeGrafcetId);
  const selection = useUi((s) => s.selection);
  const selected = useMemo(() => new Set(Object.keys(selection) as Id[]), [selection]);
  const [settings, setSettings] = useState<ExportSettings>(() => {
    const s = loadExportSettings(project.id);
    const format = requestedFormat;
    requestExportFormat(null);
    return format ? { ...s, format } : s;
  });
  const [preview, setPreview] = useState<{
    url?: string;
    text?: string;
    info: string;
    warnings?: CodegenWarning[];
    /** PDF: the page shown (from 0) and how many there are. */
    pages?: { shown: number; count: number };
  } | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => saveExportSettings(project.id, settings), [project.id, settings]);
  const update = (patch: Partial<ExportSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const grafcet = gid ? project.grafcets[gid] : undefined;
  const scope =
    settings.scope === 'selection' && !selected.size
      ? 'grafcet'
      : settings.scope === 'all' && !EXPORT_FORMATS[settings.format].allGrafcets
        ? 'grafcet'
        : settings.scope;
  const targets: Target[] = useMemo(() => {
    if (scope === 'all')
      return project.grafcetOrder.flatMap((id) =>
        project.grafcets[id] ? [targetOf(project, project.grafcets[id])] : [],
      );
    if (!grafcet) return [];
    return [targetOf(project, grafcet, scope === 'selection' ? selected : undefined)];
  }, [scope, project, grafcet, selected]);

  const baseName = safeFileName(project.name, scope === 'all' ? '' : (grafcet?.name ?? ''));

  // Live preview.
  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    const run = async () => {
      const target = targets[0];
      const { content } = EXPORT_FORMATS[settings.format];
      if (content === 'variables') {
        const csv = variablesToCsv(project);
        if (!cancelled)
          setPreview({
            text: csv,
            info: t('export.csvInfo', { count: Object.keys(project.variables).length }),
          });
        return;
      }
      if (content === 'code') {
        const r = await generateCode(project, settings);
        if (!cancelled)
          setPreview({
            text: r.code,
            info: t('export.codeInfo', { count: r.code.split('\n').length }),
            warnings: r.warnings,
          });
        return;
      }
      if (!target) return;
      if (content === 'pages') {
        const pages = planPages(targets, settings);
        const i = Math.min(page, pages.length - 1);
        url = URL.createObjectURL(
          new Blob([renderPage(project, pages, i, settings)], { type: 'image/svg+xml' }),
        );
        if (!cancelled)
          setPreview({
            url,
            info: t('export.pdfInfo', { page: i + 1, count: pages.length }),
            pages: { shown: i, count: pages.length },
          });
        return;
      }
      const res = await renderSvg(
        target,
        settings,
        isRaster(settings.format) || settings.svg.embedFont,
        isRaster(settings.format) && settings[settings.format].transparent,
      );
      url = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml' }));
      const scale = isRaster(settings.format) ? settings[settings.format].scale : 1;
      const info = t('export.sizeInfo', {
        w: Math.round(res.box.width * scale),
        h: Math.round(res.box.height * scale),
      });
      if (!cancelled) setPreview({ url, info });
    };
    const timer = setTimeout(() => void run(), 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [settings, targets, project, page, t]);

  const run = async (action: 'download' | 'copy') => {
    setBusy(true);
    try {
      const out = await EXPORT_FORMATS[settings.format].produce({
        project,
        targets,
        settings,
        baseName,
      });
      if (action === 'download') {
        downloadBlob(out.blob, out.name);
        onClose();
      } else {
        const ok =
          EXPORT_FORMATS[settings.format].copy === 'text'
            ? await navigator.clipboard.writeText(out.text!).then(
                () => true,
                () => false,
              )
            : await copyToClipboard(out.blob, out.text);
        toast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
      }
    } catch (e) {
      if (e instanceof UnsupportedFormatError) toast(t('export.webpUnsupported'), 'error', 8000);
      else toast(t('export.failed', { message: String((e as Error).message ?? e) }), 'error', 8000);
    } finally {
      setBusy(false);
    }
  };

  const options: ReactNode = (() => {
    switch (settings.format) {
      case 'png':
      case 'webp': {
        const f = settings.format;
        const raster = settings[f];
        const set = (patch: Partial<typeof raster>) => update({ [f]: { ...raster, ...patch } });
        return (
          <>
            <Segmented
              name={`${f}-scale`}
              label={t('export.resolution')}
              value={raster.scale}
              onChange={(v) => set({ scale: v })}
              options={[1, 2, 4].map((v) => ({ value: v as 1 | 2 | 4, label: `${v}×` }))}
            />
            {f === 'webp' && (
              <Segmented
                name="webp-quality"
                label={t('export.quality')}
                value={String(settings.webp.quality)}
                onChange={(v) => update({ webp: { ...settings.webp, quality: Number(v) } })}
                options={[
                  { value: '0.8', label: t('export.qualities.small') },
                  { value: '0.92', label: t('export.qualities.high') },
                  { value: '1', label: t('export.qualities.max') },
                ]}
              />
            )}
            <span />
            <Check
              label={t('export.transparent')}
              checked={raster.transparent}
              onChange={(v) => set({ transparent: v })}
            />
          </>
        );
      }
      case 'xlsx':
        return <Hint>{t('export.xlsxHint')}</Hint>;
      case 'svg':
        return (
          <>
            <span />
            <Check
              label={t('export.embedFont')}
              checked={settings.svg.embedFont}
              onChange={(v) => update({ svg: { embedFont: v } })}
            />
          </>
        );
      case 'pdf':
        return (
          <>
            <Segmented
              name="paper"
              label={t('export.paper')}
              value={settings.pdf.paper}
              onChange={(v) => update({ pdf: { ...settings.pdf, paper: v } })}
              options={[
                { value: 'A4' as const, label: 'A4' },
                { value: 'A3' as const, label: 'A3' },
              ]}
            />
            <Segmented
              name="orientation"
              label={t('export.orientation')}
              value={settings.pdf.orientation}
              onChange={(v) => update({ pdf: { ...settings.pdf, orientation: v } })}
              options={[
                { value: 'auto' as const, label: t('export.orientationAuto') },
                { value: 'portrait' as const, label: t('export.portrait') },
                { value: 'landscape' as const, label: t('export.landscape') },
              ]}
            />
            <Choice
              label={t('export.scale')}
              value={String(settings.pdf.scale)}
              onChange={(v) =>
                update({
                  pdf: {
                    ...settings.pdf,
                    scale: v === 'readable' || v === 'fit' ? v : Number(v),
                  },
                })
              }
              options={[
                { value: 'readable', label: t('export.readable') },
                { value: 'fit', label: t('export.fitPage') },
                ...[100, 75, 50].map((v) => ({
                  value: String(v),
                  label: t('export.percentTiled', { v }),
                })),
              ]}
            />
            <span />
            <Check
              label={t('export.titleBlock')}
              checked={settings.pdf.titleBlock}
              onChange={(v) => update({ pdf: { ...settings.pdf, titleBlock: v } })}
            />
          </>
        );
      case 'csv':
        return <Hint>{t('export.csvHint')}</Hint>;
      case 'st':
        return (
          <>
            <Choice
              label={t('export.stDialect')}
              value={settings.st.dialect}
              onChange={(v) =>
                update({ st: { ...settings.st, dialect: v as ExportSettings['st']['dialect'] } })
              }
              options={ST_DIALECTS.map((d) => ({ value: d, label: t(`export.stDialects.${d}`) }))}
            />
            <Hint>{t(`export.stDialectHints.${settings.st.dialect}`)}</Hint>
            <Segmented
              name="st-style"
              label={t('export.stStyle')}
              value={settings.st.style}
              onChange={(v) => update({ st: { ...settings.st, style: v } })}
              options={[
                { value: 'case', label: t('export.stStyles.case') },
                { value: 'bits', label: t('export.stStyles.bits') },
              ]}
            />
            <Hint>
              {settings.st.style === 'case' ? t('export.stHintCase') : t('export.stHint')}
            </Hint>
            <span />
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {settings.st.style === 'bits' && (
                <Check
                  label={t('export.stabilityLoop')}
                  checked={settings.st.stabilityLoop}
                  onChange={(v) => update({ st: { ...settings.st, stabilityLoop: v } })}
                />
              )}
              <Check
                label={t('export.holdStored')}
                checked={settings.st.holdStored}
                onChange={(v) => update({ st: { ...settings.st, holdStored: v } })}
              />
            </div>
          </>
        );
      case 'xml':
        return (
          <>
            <Hint>{t('export.xmlHint')}</Hint>
            <Segmented
              name="task-interval"
              label={t('export.taskInterval')}
              value={settings.xml.taskInterval}
              onChange={(v) => update({ xml: { taskInterval: v } })}
              options={[10, 20, 50, 100].map((v) => ({ value: v, label: `${v} ms` }))}
            />
          </>
        );
    }
  })();

  const canCopy = EXPORT_FORMATS[settings.format].copy !== null;

  const pages = EXPORT_FORMATS[settings.format].content === 'pages' ? preview?.pages : undefined;
  const turn = (by: number) =>
    setPage((p) => Math.max(0, Math.min((pages?.count ?? 1) - 1, (pages?.shown ?? p) + by)));
  const scopeOptions = [
    ...(EXPORT_FORMATS[settings.format].allGrafcets
      ? [
          {
            value: 'all' as const,
            label: t('export.scopes.all', { count: project.grafcetOrder.length }),
          },
        ]
      : []),
    {
      value: 'grafcet' as const,
      label: t('export.scopes.grafcet', { name: grafcet?.name ?? '' }),
    },
    {
      value: 'selection' as const,
      label: t('export.scopes.selection', { count: selected.size }),
      disabled: !selected.size,
    },
  ];

  return (
    <Modal open title={t('export.title')} onOpenChange={(o) => !o && onClose()} width={920}>
      <div className="grid grid-cols-[170px_1fr] gap-4 compact:grid-cols-1">
        <div
          role="radiogroup"
          aria-label={t('export.format')}
          className="flex flex-col gap-0.5 compact:grid compact:grid-cols-2"
        >
          {EXPORT_FORMAT_IDS.map((f, i) => {
            const group = FORMAT_GROUP[EXPORT_FORMATS[f].content];
            const first =
              i === 0 || FORMAT_GROUP[EXPORT_FORMATS[EXPORT_FORMAT_IDS[i - 1]!].content] !== group;
            return (
              <Fragment key={f}>
                {first && (
                  <div
                    aria-hidden="true"
                    className="mt-2 mb-0.5 px-1 text-[11px] font-semibold tracking-wider text-muted uppercase first:mt-0 compact:col-span-2"
                  >
                    {t(`export.formatGroups.${group}`)}
                  </div>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.format === f}
                  title={t(`export.formatHints.${f}`)}
                  onClick={() => {
                    setPage(0);
                    update({ format: f });
                  }}
                  className={cx(
                    'rounded-md border px-2.5 py-1.5 text-left',
                    settings.format === f
                      ? 'border-accent bg-accent-soft font-medium'
                      : 'border-transparent hover:bg-surface-2',
                  )}
                >
                  {t(`export.formats.${f}`)}
                </button>
              </Fragment>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-xs text-muted">{t(`export.formatHints.${settings.format}`)}</p>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 compact:grid-cols-1 compact:gap-y-1">
            {!isProjectWide(settings.format) && (
              <>
                <Segmented
                  name="scope"
                  label={t('export.scope')}
                  value={scope}
                  onChange={(v) => {
                    setPage(0);
                    update({ scope: v });
                  }}
                  options={scopeOptions}
                />
                <Segmented
                  name="theme"
                  label={t('export.appearance')}
                  value={settings.theme}
                  onChange={(v) => update({ theme: v })}
                  options={[
                    { value: 'print' as const, label: t('export.print') },
                    { value: 'current' as const, label: t('export.currentTheme') },
                  ]}
                />
                <span />
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <Check
                    label={t('export.textbook')}
                    checked={settings.textbook}
                    onChange={(v) => update({ textbook: v })}
                  />
                  <Check
                    label={t('export.frames')}
                    checked={settings.frames}
                    onChange={(v) => update({ frames: v })}
                  />
                </div>
              </>
            )}
            {options}
          </div>
          <div className="flex flex-col overflow-hidden rounded-md border border-border bg-surface-2">
            {!pages && (
              <div className="border-b border-border px-2 py-1 text-xs text-muted">
                {preview?.info ?? t('common.loading')}
              </div>
            )}
            {preview?.warnings && preview.warnings.length > 0 && (
              <ul
                aria-label={t('export.warnings')}
                className="max-h-24 overflow-auto border-b border-border bg-warning-soft px-3 py-1.5 text-xs text-warning"
              >
                {groupWarnings(preview.warnings).map(({ warning: w, count }, i) => (
                  <li key={i}>
                    {count > 1 && <span className="font-semibold tabular-nums">{count}× </span>}
                    {tDynamic(t, `export.codeWarnings.${w.code}`, w.params)}
                  </li>
                ))}
              </ul>
            )}
            <div
              className="flex h-80 items-center justify-center overflow-auto p-3 compact:h-60"
              // With several pages, ← and → turn them while the preview has the focus.
              tabIndex={pages && pages.count > 1 ? 0 : undefined}
              aria-label={pages ? preview?.info : undefined}
              onKeyDown={(e) => {
                if (!pages) return;
                if (e.key === 'ArrowLeft') turn(-1);
                else if (e.key === 'ArrowRight') turn(1);
                else return;
                e.preventDefault();
              }}
            >
              {preview?.url && (
                <img
                  src={preview.url}
                  alt={t('export.preview')}
                  className="max-h-full max-w-full bg-surface shadow-pop"
                />
              )}
              {preview?.text !== undefined && (
                <pre className="h-full w-full overflow-auto font-mono text-xs">{preview.text}</pre>
              )}
            </div>
            {pages && (
              <div className="flex items-center justify-center gap-3 border-t border-border bg-surface px-2 py-1.5">
                <Button disabled={pages.shown <= 0} onClick={() => turn(-1)}>
                  <ChevronLeftIcon size={18} />
                  {t('export.prevPage')}
                </Button>
                <span aria-live="polite" className="min-w-24 text-center tabular-nums">
                  {preview?.info}
                </span>
                <Button disabled={pages.shown >= pages.count - 1} onClick={() => turn(1)}>
                  {t('export.nextPage')}
                  <ChevronRightIcon size={18} />
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            {canCopy && (
              <Button disabled={busy} onClick={() => void run('copy')}>
                {t('export.copy')}
              </Button>
            )}
            <Button
              variant="primary"
              disabled={busy || (!targets.length && !isProjectWide(settings.format))}
              onClick={() => void run('download')}
            >
              {busy ? t('export.working') : t('export.download')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
