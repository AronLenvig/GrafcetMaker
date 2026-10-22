/**
 * Printed page layout (A4/A3, portrait/landscape): diagram fitted to the page or printed at a
 * fixed scale and tiled over several pages, with an engineering title block. Each page is an SVG
 * in millimetres, used both for the on-screen preview and, through svg2pdf, for the vector PDF.
 */
import type { Rect } from '../layout/geometry';
import { escapeXml, type ExportPalette, type SvgResult } from './svgExport';

export type Paper = 'A4' | 'A3';

export interface PageOptions {
  paper: Paper;
  orientation: 'portrait' | 'landscape';
  /** 'fit' = whole diagram on one page (never enlarged beyond 100 %); a number = percent. */
  scale: 'fit' | number;
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
const PAPER_MM: Record<Paper, [number, number]> = { A4: [210, 297], A3: [297, 420] };
const MARGIN = 10;
const TB_H = 16;
const TB_W = 140;

export interface PageLayout {
  width: number;
  height: number;
  /** Printable area for the diagram, in mm. */
  area: Rect;
  /** mm per diagram unit. */
  scale: number;
  cols: number;
  rows: number;
  /** Diagram units covered by one page. */
  tile: { width: number; height: number };
  box: Rect;
}

export function pageLayout(box: Rect, opts: PageOptions): PageLayout {
  const [w, h] = PAPER_MM[opts.paper];
  const width = opts.orientation === 'portrait' ? w : h;
  const height = opts.orientation === 'portrait' ? h : w;
  const area = {
    x: MARGIN,
    y: MARGIN,
    width: width - 2 * MARGIN,
    height: height - 2 * MARGIN - (opts.titleBlock ? TB_H + 3 : 0),
  };
  const scale =
    opts.scale === 'fit'
      ? Math.min(area.width / box.width, area.height / box.height, UNIT_MM)
      : (UNIT_MM * opts.scale) / 100;
  const tile = { width: area.width / scale, height: area.height / scale };
  const cols = opts.scale === 'fit' ? 1 : Math.max(1, Math.ceil(box.width / tile.width - 1e-9));
  const rows = opts.scale === 'fit' ? 1 : Math.max(1, Math.ceil(box.height / tile.height - 1e-9));
  return { width, height, area, scale, cols, rows, tile, box };
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
  const { area, scale, box, tile } = layout;
  const fit = layout.cols === 1 && layout.rows === 1;
  // Fitted diagrams are centered; tiles start at the diagram's top-left corner.
  const ox = fit ? area.x + (area.width - box.width * scale) / 2 : area.x;
  const oy = fit ? area.y + (area.height - box.height * scale) / 2 : area.y;
  const tx = ox - (box.x + col * tile.width) * scale;
  const ty = oy - (box.y + row * tile.height) * scale;
  const clip = opts.clipId ?? 'area';
  const ink = opts.palette.ink;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(layout.width)}mm" height="${f(layout.height)}mm" viewBox="0 0 ${f(layout.width)} ${f(layout.height)}">`,
    `<rect x="0" y="0" width="${f(layout.width)}" height="${f(layout.height)}" fill="${opts.palette.background ?? '#ffffff'}"/>`,
    `<defs><clipPath id="${clip}"><rect x="${f(area.x)}" y="${f(area.y)}" width="${f(area.width)}" height="${f(area.height)}"/></clipPath></defs>`,
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
