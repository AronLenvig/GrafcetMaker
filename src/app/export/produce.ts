/** The file of each export format (loaded with the Export dialog or on first use, see formats.ts). */
import i18next from 'i18next';
import type { CodegenResult } from '@/core/codegen/common';
import { dialectFile } from '@/core/codegen/dialect';
import { variablesToCsv, variablesToXlsx } from '@/core/io/csv';
import type { Project } from '@/core/model/types';
import { renderSvg, safeFileName, svgToImage, svgToPng, type ExportSettings } from './exporters';
import { EXPORT_FORMATS as F, type ExportJob, type ExportOutput } from './formats';

/** Generated PLC code (the generators are loaded on first use). */
export async function generateCode(
  project: Project,
  settings: ExportSettings,
): Promise<CodegenResult> {
  const opts = { version: __APP_VERSION__, date: new Date() };
  const st = {
    ...opts,
    dialect: settings.st.dialect,
    storedActions: settings.st.holdStored ? ('whileActive' as const) : ('once' as const),
  };
  if (settings.format === 'st' && settings.st.style === 'case') {
    const { generateStCase } = await import('@/core/codegen/stCase');
    return generateStCase(project, st);
  }
  if (settings.format === 'st') {
    const { generateSt } = await import('@/core/codegen/st');
    return generateSt(project, { ...st, stabilityLoop: settings.st.stabilityLoop });
  }
  const { generatePlcOpen } = await import('@/core/codegen/plcopen');
  return generatePlcOpen(project, { ...opts, taskInterval: settings.xml.taskInterval });
}

const variablesName = (project: Project) =>
  safeFileName(project.name, i18next.t('export.variablesFile'));

export async function producePdf({
  project,
  targets,
  settings,
  baseName,
}: ExportJob): Promise<ExportOutput> {
  const { buildPdf } = await import('./pdf');
  return {
    blob: await buildPdf(project, targets, settings),
    name: `${baseName}.${F.pdf.extension}`,
  };
}

export async function produceSvg({
  targets,
  settings,
  baseName,
}: ExportJob): Promise<ExportOutput> {
  const res = await renderSvg(targets[0]!, settings, settings.svg.embedFont);
  return {
    blob: new Blob([res.svg], { type: F.svg.mime }),
    name: `${baseName}.${F.svg.extension}`,
    text: res.svg,
  };
}

export async function producePng({
  targets,
  settings,
  baseName,
}: ExportJob): Promise<ExportOutput> {
  const res = await renderSvg(targets[0]!, settings, true, settings.png.transparent);
  return { blob: await svgToPng(res, settings.png.scale), name: `${baseName}.${F.png.extension}` };
}

export async function produceWebp({
  targets,
  settings,
  baseName,
}: ExportJob): Promise<ExportOutput> {
  const res = await renderSvg(targets[0]!, settings, true, settings.webp.transparent);
  const blob = await svgToImage(res, settings.webp.scale, F.webp.mime, settings.webp.quality);
  return { blob, name: `${baseName}.${F.webp.extension}` };
}

export async function produceCsv({ project }: ExportJob): Promise<ExportOutput> {
  const csv = variablesToCsv(project);
  return {
    blob: new Blob([csv], { type: F.csv.mime }),
    name: `${variablesName(project)}.${F.csv.extension}`,
    text: csv,
  };
}

export async function produceXlsx({ project }: ExportJob): Promise<ExportOutput> {
  const bytes = variablesToXlsx(project);
  return {
    blob: new Blob([bytes as BlobPart], { type: F.xlsx.mime }),
    name: `${variablesName(project)}.${F.xlsx.extension}`,
  };
}

export async function produceSt({ project, settings }: ExportJob): Promise<ExportOutput> {
  const { code } = await generateCode(project, settings);
  const file = dialectFile(settings.st.dialect);
  return {
    blob: new Blob([code], { type: file.mime }),
    name: `${safeFileName(project.name, '')}.${file.extension}`,
    text: code,
  };
}

export async function produceXml({ project, settings }: ExportJob): Promise<ExportOutput> {
  const { code } = await generateCode(project, settings);
  return {
    blob: new Blob([code], { type: F.xml.mime }),
    name: `${safeFileName(project.name, '')}.${F.xml.extension}`,
    text: code,
  };
}
