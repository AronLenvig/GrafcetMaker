import i18next from 'i18next';
import { applyVariableImport, planVariableImport } from '@/core/io/csv';
import { doc, getActiveGrafcet, getProject } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { showDialog } from '../dialogs/dialogStore';
import { pickFile, type FileKind } from '../persistence/fileAccess';
import { toast } from '../toasts';
import { copyToClipboard, loadExportSettings, renderSvg, svgToPng } from './exporters';

const t = i18next.t.bind(i18next);

export const CSV_FILE: FileKind = { description: 'CSV', mime: 'text/csv', extensions: ['.csv'] };
const MAX_CSV_BYTES = 2 * 1024 * 1024;

/** Imports variables from a CSV file after showing what will change. One undo step. */
export async function importVariablesFile(file: File): Promise<void> {
  if (file.size > MAX_CSV_BYTES) {
    toast(t('csv.tooLarge'), 'error');
    return;
  }
  const plan = planVariableImport(getProject(), await file.text());
  const header = plan.errors.find((e) => e.code === 'noHeader');
  if (header) {
    await showDialog({
      title: t('csv.importTitle', { name: file.name }),
      message: t('csv.errors.noHeader'),
      actions: [{ id: 'ok', label: t('common.ok'), variant: 'primary' }],
      cancelId: 'ok',
    });
    return;
  }
  const details = plan.errors.map((e) =>
    t('csv.rowError', { row: e.row, reason: t(`csv.errors.${e.code}`, { value: e.value }) }),
  );
  const changes = plan.added.length + plan.updated.length;
  const choice = await showDialog({
    title: t('csv.importTitle', { name: file.name }),
    message: t('csv.summary', {
      added: plan.added.length,
      updated: plan.updated.length,
      unchanged: plan.unchanged,
      rejected: plan.errors.length,
    }),
    details: details.length ? details : undefined,
    actions: changes
      ? [
          { id: 'cancel', label: t('common.cancel') },
          { id: 'import', label: t('csv.import'), variant: 'primary' },
        ]
      : [{ id: 'cancel', label: t('common.ok'), variant: 'primary' }],
    cancelId: 'cancel',
  });
  if (choice !== 'import') return;
  doc.execute('history.importVariables', (d) => applyVariableImport(d, plan));
  toast(t('csv.done', { count: changes }), 'success');
}

export async function importVariablesDialog(): Promise<void> {
  const picked = await pickFile(CSV_FILE);
  if (picked) await importVariablesFile(picked.file);
}

/** Copies the selection (or the whole grafcet) as an image for pasting into documents. */
export async function copyDiagram(kind: 'png' | 'svg'): Promise<void> {
  const g = getActiveGrafcet();
  if (!g) return;
  const ids = Object.keys(useUi.getState().selection);
  const settings = loadExportSettings(getProject().id);
  const target = { grafcet: g, only: ids.length ? new Set(ids) : undefined };
  try {
    const res = await renderSvg(target, settings, kind === 'png' || settings.svg.embedFont);
    const ok =
      kind === 'png'
        ? await copyToClipboard(await svgToPng(res, settings.png.scale))
        : await copyToClipboard(new Blob([res.svg], { type: 'image/svg+xml' }), res.svg);
    toast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  } catch (e) {
    toast(t('export.failed', { message: String((e as Error).message ?? e) }), 'error');
  }
}
