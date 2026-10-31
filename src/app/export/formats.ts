import type { Project } from '@/core/model/types';
import type { ExportSettings, Target } from './exporters';

/**
 * What a format's file holds, which decides the Export dialog's options and preview: `pages` (the
 * pages of the chosen grafcets), `vector` or `raster` (one diagram as SVG or as an image),
 * `variables` (the variable table) or `code` (generated PLC code). Variables and code cover the
 * whole project: no scope, colors or notation to choose.
 */
type Content = 'pages' | 'vector' | 'raster' | 'variables' | 'code';

export interface ExportJob {
  project: Project;
  /** The grafcets (or selection) to draw: the first one for single-diagram formats. */
  targets: Target[];
  settings: ExportSettings;
  /** File name without extension for diagrams: the project and the grafcet. */
  baseName: string;
}

export interface ExportOutput {
  blob: Blob;
  name: string;
  /** What "Copy" puts on the clipboard as text. */
  text?: string;
}

interface FormatDescriptor {
  content: Content;
  /** Extension and MIME type of the file (Structured Text: per dialect, core/codegen/dialect). */
  extension: string;
  mime: string;
  /** What "Copy" copies: the text (code, CSV), the image, or nothing (no Copy button). */
  copy: 'text' | 'image' | null;
  /** Offers every grafcet of the project as scope. */
  allGrafcets: boolean;
  /** Has an "Export as …" command (`file.export<Id>`) opening the dialog on it. */
  command: boolean;
  /** Makes the file (the exporters are loaded on first use). */
  produce: (job: ExportJob) => Promise<ExportOutput>;
}

const load = () => import('./produce');

/**
 * Every export format, in the order the Export dialog lists them. Each is named
 * `export.formats.<id>` and described `export.formatHints.<id>` in the i18n files; its options
 * are drawn by ExportDialog and remembered in ExportSettings (exporters.ts).
 */
export const EXPORT_FORMATS = {
  pdf: {
    content: 'pages',
    extension: 'pdf',
    mime: 'application/pdf',
    copy: null,
    allGrafcets: true,
    command: true,
    produce: (job) => load().then((m) => m.producePdf(job)),
  },
  svg: {
    content: 'vector',
    extension: 'svg',
    mime: 'image/svg+xml',
    copy: 'image',
    allGrafcets: false,
    command: true,
    produce: (job) => load().then((m) => m.produceSvg(job)),
  },
  png: {
    content: 'raster',
    extension: 'png',
    mime: 'image/png',
    copy: 'image',
    allGrafcets: false,
    command: true,
    produce: (job) => load().then((m) => m.producePng(job)),
  },
  webp: {
    content: 'raster',
    extension: 'webp',
    mime: 'image/webp',
    copy: 'image',
    allGrafcets: false,
    command: true,
    produce: (job) => load().then((m) => m.produceWebp(job)),
  },
  csv: {
    content: 'variables',
    extension: 'csv',
    mime: 'text/csv',
    copy: 'text',
    allGrafcets: false,
    command: false,
    produce: (job) => load().then((m) => m.produceCsv(job)),
  },
  xlsx: {
    content: 'variables',
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    copy: null,
    allGrafcets: false,
    command: false,
    produce: (job) => load().then((m) => m.produceXlsx(job)),
  },
  st: {
    content: 'code',
    extension: 'st',
    mime: 'text/plain',
    copy: 'text',
    allGrafcets: false,
    command: true,
    produce: (job) => load().then((m) => m.produceSt(job)),
  },
  xml: {
    content: 'code',
    extension: 'xml',
    mime: 'application/xml',
    copy: 'text',
    allGrafcets: false,
    command: true,
    produce: (job) => load().then((m) => m.produceXml(job)),
  },
} as const satisfies Record<string, FormatDescriptor>;

export type ExportFormat = keyof typeof EXPORT_FORMATS;

export const EXPORT_FORMAT_IDS = Object.keys(EXPORT_FORMATS) as ExportFormat[];

type FormatsOf<C extends Content> = {
  [F in ExportFormat]: (typeof EXPORT_FORMATS)[F]['content'] extends C ? F : never;
}[ExportFormat];

/** Formats drawn as an image: each has a scale and a transparent option in ExportSettings. */
export type RasterFormat = FormatsOf<'raster'>;

export const isRaster = (f: ExportFormat): f is RasterFormat =>
  EXPORT_FORMATS[f].content === 'raster';

/** Formats covering the whole project (no scope, colors or notation). */
export const isProjectWide = (f: ExportFormat): boolean =>
  EXPORT_FORMATS[f].content === 'variables' || EXPORT_FORMATS[f].content === 'code';
