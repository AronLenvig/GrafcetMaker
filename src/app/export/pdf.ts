/** Vector PDF export (loaded on demand: jsPDF and svg2pdf are only fetched when used). */
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { Project } from '@/core/model/types';
import type { ExportSettings, Target } from './exporters';
import { planPages, renderPage } from './pages';

export async function buildPdf(
  project: Project,
  targets: Target[],
  settings: ExportSettings,
): Promise<Blob> {
  const pages = planPages(targets, settings);
  const { paper, orientation } = settings.pdf;
  const doc = new jsPDF({ unit: 'mm', format: paper.toLowerCase(), orientation, compress: true });
  doc.setProperties({
    title: project.name,
    subject: targets.map((t) => t.grafcet.name).join(', '),
    author: project.meta.author,
    creator: 'GrafcetMaker',
  });
  // svg2pdf reads computed styles, so pages are rendered while attached (off screen).
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(host);
  try {
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage(paper.toLowerCase(), orientation);
      host.innerHTML = '';
      const el = new DOMParser().parseFromString(
        renderPage(project, pages, i, settings),
        'image/svg+xml',
      ).documentElement;
      // A parse error yields an error document instead: never put that into the page.
      if (el.namespaceURI !== 'http://www.w3.org/2000/svg' || el.localName !== 'svg')
        throw new Error('The page could not be drawn (invalid SVG)');
      host.appendChild(document.importNode(el, true));
      const { width, height } = pages[i]!.layout;
      await svg2pdf(host.firstElementChild as SVGElement, doc, { x: 0, y: 0, width, height });
    }
  } finally {
    host.remove();
  }
  return doc.output('blob');
}
