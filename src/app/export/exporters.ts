import fontUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import type { PageOptions } from '@/core/io/pdfLayout';
import {
  grafcetToSvg,
  PRINT_PALETTE,
  type ExportPalette,
  type SvgResult,
} from '@/core/io/svgExport';
import type { Grafcet, Id, Project } from '@/core/model/types';

export type ExportFormat = 'pdf' | 'svg' | 'png' | 'webp' | 'csv' | 'xlsx' | 'st' | 'xml';
export type ExportScope = 'grafcet' | 'selection' | 'all';

export interface ExportSettings {
  format: ExportFormat;
  scope: ExportScope;
  /** Black on white (default), or the colors of the current theme. */
  theme: 'print' | 'current';
  textbook: boolean;
  png: { scale: 1 | 2 | 4; transparent: boolean };
  webp: { scale: 1 | 2 | 4; quality: number; transparent: boolean };
  svg: { embedFont: boolean };
  pdf: PageOptions;
  /**
   * Structured Text: `case` = one INT step variable and a CASE per sequence (core/codegen/stCase);
   * `bits` = one BOOL per step, optionally repeating clearing within the scan until stable.
   */
  st: { style: 'case' | 'bits'; stabilityLoop: boolean };
  /** PLCopen XML: cycle time of the generated task, in ms. */
  xml: { taskInterval: number };
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'pdf',
  scope: 'grafcet',
  theme: 'print',
  textbook: true,
  png: { scale: 2, transparent: false },
  webp: { scale: 2, quality: 0.92, transparent: false },
  svg: { embedFont: true },
  pdf: { paper: 'A4', orientation: 'portrait', scale: 'fit', titleBlock: true },
  st: { style: 'case', stabilityLoop: false },
  xml: { taskInterval: 10 },
};

const key = (projectId: Id) => `grafcetmaker.export.${projectId}`;

/** Export settings are remembered per project, on this device. */
export function loadExportSettings(projectId: Id): ExportSettings {
  try {
    const raw = localStorage.getItem(key(projectId));
    if (!raw) return DEFAULT_EXPORT_SETTINGS;
    const s = JSON.parse(raw) as Partial<ExportSettings>;
    return {
      ...DEFAULT_EXPORT_SETTINGS,
      ...s,
      png: { ...DEFAULT_EXPORT_SETTINGS.png, ...s.png },
      webp: { ...DEFAULT_EXPORT_SETTINGS.webp, ...s.webp },
      svg: { ...DEFAULT_EXPORT_SETTINGS.svg, ...s.svg },
      pdf: { ...DEFAULT_EXPORT_SETTINGS.pdf, ...s.pdf },
      st: { ...DEFAULT_EXPORT_SETTINGS.st, ...s.st },
      xml: { ...DEFAULT_EXPORT_SETTINGS.xml, ...s.xml },
    };
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

export function saveExportSettings(projectId: Id, s: ExportSettings): void {
  try {
    localStorage.setItem(key(projectId), JSON.stringify(s));
  } catch {
    // Not remembered; harmless.
  }
}

/** The diagram colors of the current theme (for "export in current theme"). */
export function currentThemePalette(): ExportPalette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    background: v('--canvas', '#ffffff'),
    ink: v('--ink', '#000000'),
    muted: v('--ink-muted', '#404040'),
    commentFill: v('--comment-bg', '#ffffff'),
    commentStroke: v('--comment-border', '#7a7a7a'),
  };
}

export function paletteFor(settings: ExportSettings, transparent = false): ExportPalette {
  const p = settings.theme === 'current' ? currentThemePalette() : PRINT_PALETTE;
  return transparent ? { ...p, background: null } : p;
}

let fontCss: Promise<string> | null = null;

/** The bundled diagram font as an embeddable @font-face rule (fetched once, same origin). */
export function embeddedFontCss(): Promise<string> {
  fontCss ??= fetch(fontUrl)
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000)
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `@font-face{font-family:'JetBrains Mono';src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
    })
    .catch(() => '');
  return fontCss;
}

export interface Target {
  grafcet: Grafcet;
  only?: ReadonlySet<Id>;
}

export async function renderSvg(
  target: Target,
  settings: ExportSettings,
  embedFont: boolean,
  transparent = false,
): Promise<SvgResult> {
  return grafcetToSvg(target.grafcet, {
    palette: paletteFor(settings, transparent),
    only: target.only,
    textbook: settings.textbook,
    fontFaceCss: embedFont ? await embeddedFontCss() : undefined,
  });
}

/** Largest canvas side browsers reliably allocate. */
const MAX_CANVAS = 16_000;

export class UnsupportedFormatError extends Error {}

/**
 * Rasterizes an SVG at a scale. WebP is encoded by the browser; browsers that cannot encode it
 * silently return PNG, which is reported as UnsupportedFormatError.
 */
export async function svgToImage(
  res: SvgResult,
  scale: number,
  type: 'image/png' | 'image/webp' = 'image/png',
  quality?: number,
): Promise<Blob> {
  const s = Math.min(scale, MAX_CANVAS / Math.max(res.box.width, res.box.height));
  const url = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(res.box.width * s));
    canvas.height = Math.max(1, Math.round(res.box.height * s));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))),
        type,
        quality,
      ),
    );
    if (blob.type !== type) throw new UnsupportedFormatError(type);
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Puts an image on the clipboard for pasting into documents. Resolves false if not allowed. */
export async function copyToClipboard(blob: Blob, text?: string): Promise<boolean> {
  try {
    const items: Record<string, Blob> = { [blob.type]: blob };
    if (text !== undefined) items['text/plain'] = new Blob([text], { type: 'text/plain' });
    await navigator.clipboard.write([new ClipboardItem(items)]);
    return true;
  } catch {
    if (text === undefined) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

export function safeFileName(...parts: string[]): string {
  return (
    parts
      .filter(Boolean)
      .join(' - ')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .trim() || 'export'
  );
}

export function titleInfo(project: Project, grafcet: Grafcet) {
  return {
    project: project.name,
    grafcet: grafcet.name,
    author: project.meta.author,
    company: project.meta.company,
    revision: project.meta.revision,
    date: new Date().toISOString().slice(0, 10),
  };
}

export function svgToPng(res: SvgResult, scale: number): Promise<Blob> {
  return svgToImage(res, scale, 'image/png');
}

/** Format the Export dialog opens on (set by "Export as …" menu entries). */
export let requestedFormat: ExportFormat | null = null;
export function requestExportFormat(f: ExportFormat | null): void {
  requestedFormat = f;
}
