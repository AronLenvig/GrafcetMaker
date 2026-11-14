/**
 * Printed page layout (A4/A3, portrait/landscape): diagram printed readably over as many pages as
 * it needs, fitted to one page, or printed at a fixed scale, with an engineering title block. Pages
 * are cut between elements where possible. Each page is an SVG in millimetres, used both for the
 * on-screen preview and, through svg2pdf, for the vector PDF.
 */
import type { Rect } from '../layout/geometry';
import { escapeXml, type ExportPalette, type SvgResult } from './svgExport';

export type Paper = 'A4' | 'A3';
export type Orientation = 'portrait' | 'landscape';

export interface PageOptions {
  paper: Paper;
  /** 'auto': the orientation that prints the diagram on fewer pages, then larger. */
  orientation: Orientation | 'auto';
  /**
   * 'readable' = one page when the whole diagram fits at READABLE_PERCENT or more, otherwise the
   * page width (between READABLE_PERCENT and 100 %) continued on further pages; 'fit' = whole
   * diagram on one page (never enlarged beyond 100 %); a number = percent, over several pages.
   */
  scale: 'readable' | 'fit' | number;
  titleBlock: boolean;
}

export interface TitleInfo {
  project: string;
  grafcet: string;
  author: string;
  company: string;
  revision: string;
  date: string;
}

/** Millimetres per diagram unit at 100 % (diagram units are CSS pixels at 96 dpi). */
export const UNIT_MM = 25.4 / 96;
/** Smallest scale 'readable' prints at: the 13 px diagram text is then about 2.4 mm high. */
export const READABLE_PERCENT = 70;
const PAPER_MM: Record<Paper, [number, number]> = { A4: [210, 297], A3: [297, 420] };
const MARGIN = 10;
const TB_H = 16;
const TB_W = 140;
/** Room kept around an element when a page is cut beside it (diagram units). */
const CUT_PAD = 4;

/** A stretch of the diagram printed on one row or column of pages (diagram units). */
export interface Band {
  start: number;
  size: number;
}

export interface PageLayout {
  width: number;
  height: number;
  orientation: Orientation;
  /** Printable area for the diagram, in mm. */
  area: Rect;
  /** mm per diagram unit. */
  scale: number;
  /** The diagram split into columns and rows of pages: the page (col, row) prints both bands. */
  columns: Band[];
  rows: Band[];
  box: Rect;
}

/** Most pages one grafcet is printed on: beyond, it is fitted to one page. */
const MAX_PAGES = 400;

/**
 * Splits `[start, start + length]` into bands of at most `max`. A band ends in a gap between the
 * `spans` (parts of the diagram projected on this axis) found in its second half, else at `max`.
 */
function split(start: number, length: number, max: number, spans: [number, number][]): Band[] {
  const end = start + length;
  const free = (c: number) => spans.every(([a, b]) => !(a < c && c < b));
  const out: Band[] = [];
  let from = start;
  while (end - from > max + 1e-6) {
    const limit = from + max;
    let cut = limit;
    if (!free(limit)) {
      // Just before a part, or just after one, whichever gap comes last.
      const gaps = spans
        .flatMap(([a, b]) => [a, b])
        .filter((c) => c > from + max / 2 && c < limit && free(c));
      if (gaps.length) cut = Math.max(...gaps);
    }
    out.push({ start: from, size: cut - from });
    from = cut;
  }
  out.push({ start: from, size: end - from });
  return out;
}

function layoutFor(
  box: Rect,
  opts: PageOptions,
  orientation: Orientation,
  parts: readonly Rect[],
): PageLayout {
  const [w, h] = PAPER_MM[opts.paper];
  const width = orientation === 'portrait' ? w : h;
  const height = orientation === 'portrait' ? h : w;
  const area = {
    x: MARGIN,
    y: MARGIN,
    width: width - 2 * MARGIN,
    height: height - 2 * MARGIN - (opts.titleBlock ? TB_H + 3 : 0),
  };
  const fit = Math.min(area.width / box.width, area.height / box.height, UNIT_MM);
  const readable = (UNIT_MM * READABLE_PERCENT) / 100;
  if (opts.scale === 'fit' || (opts.scale === 'readable' && fit >= readable))
    return {
      width,
      height,
      orientation,
      area,
      scale: fit,
      columns: [{ start: box.x, size: box.width }],
      rows: [{ start: box.y, size: box.height }],
      box,
    };
  // Readable: the page width, kept between the readable size and 100 %.
  const scale =
    opts.scale === 'readable'
      ? Math.min(Math.max(area.width / box.width, readable), UNIT_MM)
      : (UNIT_MM * opts.scale) / 100;
  const pad = (a: number, size: number): [number, number] => [a - CUT_PAD, a + size + CUT_PAD];
  const columns = split(
    box.x,
    box.width,
    area.width / scale,
    parts.map((p) => pad(p.x, p.width)),
  );
  const rows = split(
    box.y,
    box.height,
    area.height / scale,
    parts.map((p) => pad(p.y, p.height)),
  );
  // A diagram that would need more pages than anyone prints (or coordinates far out) is fitted.
  if (!(columns.length * rows.length <= MAX_PAGES))
    return layoutFor(box, { ...opts, scale: 'fit' }, orientation, parts);
  return { width, height, orientation, area, scale, columns, rows, box };
}

/**
 * The pages a diagram covering `box` is printed on. `parts` (what is drawn, see SvgResult) lets
 * the pages be cut between elements rather than through them.
 */
export function pageLayout(box: Rect, opts: PageOptions, parts: readonly Rect[] = []): PageLayout {
  if (opts.orientation !== 'auto') return layoutFor(box, opts, opts.orientation, parts);
  const portrait = layoutFor(box, opts, 'portrait', parts);
  const landscape = layoutFor(box, opts, 'landscape', parts);
  const pages = (l: PageLayout) => l.columns.length * l.rows.length;
  return pages(landscape) < pages(portrait) ||
    (pages(landscape) === pages(portrait) && landscape.scale > portrait.scale)
    ? landscape
    : portrait;
}

const f = (v: number) => String(Math.round(v * 1000) / 1000);

function titleBlock(
  t: TitleInfo,
  page: number,
  pages: number,
  x: number,
  y: number,
  ink: string,
): string {
  const cell = (
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    label: string,
    value: string,
    size = 3,
  ) =>
    [
      `<rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" fill="none" stroke="${ink}" stroke-width="0.25"/>`,
      `<text x="${f(cx + 1.2)}" y="${f(cy + 2.6)}" font-size="1.9" fill="${ink}">${escapeXml(label)}</text>`,
      `<text x="${f(cx + 1.2)}" y="${f(cy + ch - 1.6)}" font-size="${size}" fill="${ink}">${escapeXml(value)}</text>`,
    ].join('');
  const half = TB_H / 2;
  return [
    `<g font-family="Helvetica, Arial, sans-serif">`,
    cell(x, y, 70, half, 'Project', t.project, 3.4),
    cell(x + 70, y, 45, half, 'Grafcet', t.grafcet, 3.4),
    cell(x + 115, y, TB_W - 115, half, 'Sheet', `${page} / ${pages}`),
    cell(x, y + half, 40, half, 'Author', t.author || '—'),
    cell(x + 40, y + half, 40, half, 'Company', t.company || '—'),
    cell(x + 80, y + half, 25, half, 'Revision', t.revision || '—'),
    cell(x + 105, y + half, TB_W - 105, half, 'Date', t.date),
    `</g>`,
  ].join('');
}

/**
 * One page as an SVG document in millimetres. `page`/`pages` number the sheet in the whole
 * document (several grafcets may follow each other).
 */
export function pageSvg(
  diagram: SvgResult,
  layout: PageLayout,
  col: number,
  row: number,
  opts: {
    palette: ExportPalette;
    fontFamily: string;
    title?: TitleInfo;
    page: number;
    pages: number;
    clipId?: string;
  },
): string {
  const { area, scale } = layout;
  const c = layout.columns[col]!;
  const r = layout.rows[row]!;
  // A diagram on one page (or one row, one column of pages) is centered on that axis; pages of a
  // longer one start at the top left of the printable area. Each shows its own band only.
  const ox = layout.columns.length === 1 ? area.x + (area.width - c.size * scale) / 2 : area.x;
  const oy = layout.rows.length === 1 ? area.y + (area.height - r.size * scale) / 2 : area.y;
  const tx = ox - c.start * scale;
  const ty = oy - r.start * scale;
  const clip = opts.clipId ?? 'area';
  const ink = opts.palette.ink;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(layout.width)}mm" height="${f(layout.height)}mm" viewBox="0 0 ${f(layout.width)} ${f(layout.height)}">`,
    `<rect x="0" y="0" width="${f(layout.width)}" height="${f(layout.height)}" fill="${opts.palette.background ?? '#ffffff'}"/>`,
    `<defs><clipPath id="${clip}"><rect x="${f(ox)}" y="${f(oy)}" width="${f(c.size * scale)}" height="${f(r.size * scale)}"/></clipPath></defs>`,
    `<g clip-path="url(#${clip})"><g transform="translate(${f(tx)} ${f(ty)}) scale(${f(scale)})" font-family="${escapeXml(opts.fontFamily)}">`,
    diagram.body,
    `</g></g>`,
    `<rect x="${f(MARGIN - 2)}" y="${f(MARGIN - 2)}" width="${f(layout.width - 2 * MARGIN + 4)}" height="${f(layout.height - 2 * MARGIN + 4)}" fill="none" stroke="${ink}" stroke-width="0.35"/>`,
    opts.title
      ? titleBlock(
          opts.title,
          opts.page,
          opts.pages,
          layout.width - MARGIN - TB_W,
          layout.height - MARGIN - TB_H,
          ink,
        )
      : '',
    `</svg>`,
  ].join('\n');
}
