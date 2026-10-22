import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { variablesToCsv, variablesToXlsx } from '@/core/io/csv';
import type { Id } from '@/core/model/types';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { downloadBlob } from '../persistence/fileAccess';
import { toast } from '../toasts';
import { Button, cx, Modal } from '../ui/primitives';
import {
  copyToClipboard,
  loadExportSettings,
  renderSvg,
  safeFileName,
  saveExportSettings,
  requestedFormat,
  requestExportFormat,
  svgToImage,
  svgToPng,
  UnsupportedFormatError,
  type ExportFormat,
  type ExportSettings,
  type Target,
} from './exporters';
import { planPages, renderPage } from './pages';

const FORMATS: ExportFormat[] = ['pdf', 'svg', 'png', 'webp', 'csv', 'xlsx'];
const isVariables = (f: ExportFormat) => f === 'csv' || f === 'xlsx';
const isRaster = (f: ExportFormat): f is 'png' | 'webp' => f === 'png' || f === 'webp';

function Radio<T extends string | number>({
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
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium text-muted">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cx('flex items-center gap-1.5', o.disabled && 'opacity-50')}
          >
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
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
  const [preview, setPreview] = useState<{ url?: string; text?: string; info: string } | null>(
    null,
  );
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => saveExportSettings(project.id, settings), [project.id, settings]);
  const update = (patch: Partial<ExportSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const grafcet = gid ? project.grafcets[gid] : undefined;
  const scope =
    settings.scope === 'selection' && !selected.size
      ? 'grafcet'
      : settings.scope === 'all' && settings.format !== 'pdf'
        ? 'grafcet'
        : settings.scope;
  const targets: Target[] = useMemo(() => {
    if (scope === 'all')
      return project.grafcetOrder.flatMap((id) =>
        project.grafcets[id] ? [{ grafcet: project.grafcets[id] }] : [],
      );
    if (!grafcet) return [];
    return [{ grafcet, only: scope === 'selection' ? selected : undefined }];
  }, [scope, project, grafcet, selected]);

  const baseName = safeFileName(project.name, scope === 'all' ? '' : (grafcet?.name ?? ''));

  // Live preview.
  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    const run = async () => {
      const target = targets[0];
      if (isVariables(settings.format)) {
        const csv = variablesToCsv(project);
        if (!cancelled)
          setPreview({
            text: csv,
            info: t('export.csvInfo', { count: Object.keys(project.variables).length }),
          });
        return;
      }
      if (!target) return;
      if (settings.format === 'pdf') {
        const pages = planPages(targets, settings);
        const i = Math.min(page, pages.length - 1);
        url = URL.createObjectURL(
          new Blob([renderPage(project, pages, i, settings)], { type: 'image/svg+xml' }),
        );
        if (!cancelled)
          setPreview({ url, info: t('export.pdfInfo', { page: i + 1, count: pages.length }) });
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

  const produce = async (): Promise<{ blob: Blob; name: string; text?: string }> => {
    const target = targets[0]!;
    switch (settings.format) {
      case 'svg': {
        const res = await renderSvg(target, settings, settings.svg.embedFont);
        return {
          blob: new Blob([res.svg], { type: 'image/svg+xml' }),
          name: `${baseName}.svg`,
          text: res.svg,
        };
      }
      case 'png': {
        const res = await renderSvg(target, settings, true, settings.png.transparent);
        return { blob: await svgToPng(res, settings.png.scale), name: `${baseName}.png` };
      }
      case 'webp': {
        const res = await renderSvg(target, settings, true, settings.webp.transparent);
        const blob = await svgToImage(
          res,
          settings.webp.scale,
          'image/webp',
          settings.webp.quality,
        );
        return { blob, name: `${baseName}.webp` };
      }
      case 'xlsx': {
        const bytes = variablesToXlsx(project);
        return {
          blob: new Blob([bytes as BlobPart], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
          name: `${safeFileName(project.name, t('export.variablesFile'))}.xlsx`,
        };
      }
      case 'pdf': {
        const { buildPdf } = await import('./pdf');
        return { blob: await buildPdf(project, targets, settings), name: `${baseName}.pdf` };
      }
      case 'csv': {
        const csv = variablesToCsv(project);
        return {
          blob: new Blob([csv], { type: 'text/csv' }),
          name: `${safeFileName(project.name, t('export.variablesFile'))}.csv`,
          text: csv,
        };
      }
    }
  };

  const run = async (action: 'download' | 'copy') => {
    setBusy(true);
    try {
      const out = await produce();
      if (action === 'download') {
        downloadBlob(out.blob, out.name);
        onClose();
      } else {
        const ok =
          settings.format === 'csv'
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
        return (
          <>
            <Radio
              name="png-scale"
              label={t('export.resolution')}
              value={settings.png.scale}
              onChange={(v) => update({ png: { ...settings.png, scale: v } })}
              options={[1, 2, 4].map((v) => ({ value: v as 1 | 2 | 4, label: `${v}×` }))}
            />
            <Check
              label={t('export.transparent')}
              checked={settings.png.transparent}
              onChange={(v) => update({ png: { ...settings.png, transparent: v } })}
            />
          </>
        );
      case 'webp':
        return (
          <>
            <Radio
              name="webp-scale"
              label={t('export.resolution')}
              value={settings.webp.scale}
              onChange={(v) => update({ webp: { ...settings.webp, scale: v } })}
              options={[1, 2, 4].map((v) => ({ value: v as 1 | 2 | 4, label: `${v}×` }))}
            />
            <Radio
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
            <Check
              label={t('export.transparent')}
              checked={settings.webp.transparent}
              onChange={(v) => update({ webp: { ...settings.webp, transparent: v } })}
            />
          </>
        );
      case 'xlsx':
        return <p className="text-muted">{t('export.xlsxHint')}</p>;
      case 'svg':
        return (
          <Check
            label={t('export.embedFont')}
            checked={settings.svg.embedFont}
            onChange={(v) => update({ svg: { embedFont: v } })}
          />
        );
      case 'pdf':
        return (
          <>
            <Radio
              name="paper"
              label={t('export.paper')}
              value={settings.pdf.paper}
              onChange={(v) => update({ pdf: { ...settings.pdf, paper: v } })}
              options={[
                { value: 'A4' as const, label: 'A4' },
                { value: 'A3' as const, label: 'A3' },
              ]}
            />
            <Radio
              name="orientation"
              label={t('export.orientation')}
              value={settings.pdf.orientation}
              onChange={(v) => update({ pdf: { ...settings.pdf, orientation: v } })}
              options={[
                { value: 'portrait' as const, label: t('export.portrait') },
                { value: 'landscape' as const, label: t('export.landscape') },
              ]}
            />
            <Radio
              name="scale"
              label={t('export.scale')}
              value={String(settings.pdf.scale)}
              onChange={(v) =>
                update({ pdf: { ...settings.pdf, scale: v === 'fit' ? 'fit' : Number(v) } })
              }
              options={[
                { value: 'fit', label: t('export.fitPage') },
                ...[100, 75, 50].map((v) => ({
                  value: String(v),
                  label: t('export.percentTiled', { v }),
                })),
              ]}
            />
            <Check
              label={t('export.titleBlock')}
              checked={settings.pdf.titleBlock}
              onChange={(v) => update({ pdf: { ...settings.pdf, titleBlock: v } })}
            />
          </>
        );
      case 'csv':
        return <p className="text-muted">{t('export.csvHint')}</p>;
    }
  })();

  const canCopy = settings.format !== 'pdf' && settings.format !== 'xlsx';

  return (
    <Modal open title={t('export.title')} onOpenChange={(o) => !o && onClose()} width={900}>
      <div className="grid grid-cols-[180px_1fr] gap-4">
        <div role="radiogroup" aria-label={t('export.format')} className="flex flex-col gap-1">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={settings.format === f}
              onClick={() => {
                setPage(0);
                update({ format: f });
              }}
              className={cx(
                'rounded-md border px-3 py-2 text-left',
                settings.format === f
                  ? 'border-accent bg-accent-soft'
                  : 'border-border hover:bg-surface-2',
              )}
            >
              <div className="font-medium">{t(`export.formats.${f}`)}</div>
              <div className="text-xs text-muted">{t(`export.formatHints.${f}`)}</div>
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {!isVariables(settings.format) && (
            <>
              <Radio
                name="scope"
                label={t('export.scope')}
                value={scope}
                onChange={(v) => update({ scope: v })}
                options={[
                  {
                    value: 'grafcet' as const,
                    label: t('export.scopes.grafcet', { name: grafcet?.name ?? '' }),
                  },
                  {
                    value: 'selection' as const,
                    label: t('export.scopes.selection', { count: selected.size }),
                    disabled: !selected.size,
                  },
                  ...(settings.format === 'pdf'
                    ? [
                        {
                          value: 'all' as const,
                          label: t('export.scopes.all', { count: project.grafcetOrder.length }),
                        },
                      ]
                    : []),
                ]}
              />
              <div className="flex flex-wrap gap-4">
                <Radio
                  name="theme"
                  label={t('export.appearance')}
                  value={settings.theme}
                  onChange={(v) => update({ theme: v })}
                  options={[
                    { value: 'print' as const, label: t('export.print') },
                    { value: 'current' as const, label: t('export.currentTheme') },
                  ]}
                />
                <div className="self-end">
                  <Check
                    label={t('export.textbook')}
                    checked={settings.textbook}
                    onChange={(v) => update({ textbook: v })}
                  />
                </div>
              </div>
            </>
          )}
          {options}
          <div className="flex min-h-64 flex-col overflow-hidden rounded-md border border-border bg-surface-2">
            <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-xs text-muted">
              <span className="flex-1">{preview?.info ?? t('common.loading')}</span>
              {settings.format === 'pdf' && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label={t('export.prevPage')}
                  >
                    ‹
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage((p) => p + 1)}
                    aria-label={t('export.nextPage')}
                  >
                    ›
                  </Button>
                </>
              )}
            </div>
            <div className="flex h-80 items-center justify-center overflow-auto p-3">
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
              disabled={busy || (!targets.length && settings.format !== 'csv')}
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
