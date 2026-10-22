/** Page planning for PDF export and its preview (no PDF library needed). */
import { pageLayout, pageSvg, type PageLayout } from '@/core/io/pdfLayout';
import { grafcetToSvg, type SvgResult } from '@/core/io/svgExport';
import type { Grafcet, Project } from '@/core/model/types';
import { paletteFor, titleInfo, type ExportSettings, type Target } from './exporters';

/** PDF standard fonts: Courier has the same 0.6 em advance as the editor's monospace font. */
const PDF_FONT = 'Courier, monospace';

export interface PlannedPage {
  grafcet: Grafcet;
  diagram: SvgResult;
  layout: PageLayout;
  col: number;
  row: number;
}

/** Every page of the document, in order (also used by the dialog's preview). */
export function planPages(targets: Target[], settings: ExportSettings): PlannedPage[] {
  const pages: PlannedPage[] = [];
  const palette = paletteFor(settings);
  for (const t of targets) {
    const diagram = grafcetToSvg(t.grafcet, {
      palette,
      only: t.only,
      textbook: settings.textbook,
      latin1: true,
      fontFamily: PDF_FONT,
    });
    const layout = pageLayout(diagram.box, settings.pdf);
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++)
        pages.push({ grafcet: t.grafcet, diagram, layout, col, row });
    }
  }
  return pages;
}

export function renderPage(
  project: Project,
  pages: PlannedPage[],
  i: number,
  settings: ExportSettings,
): string {
  const p = pages[i]!;
  return pageSvg(p.diagram, p.layout, p.col, p.row, {
    palette: paletteFor(settings),
    fontFamily: PDF_FONT,
    title: settings.pdf.titleBlock ? titleInfo(project, p.grafcet) : undefined,
    page: i + 1,
    pages: pages.length,
    clipId: `area${i}`,
  });
}
