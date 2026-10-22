/**
 * Standalone SVG rendering of a grafcet for export (files, clipboard, PNG and PDF). Pure string
 * generation: explicit colors and coordinates, no CSS classes or scripts, every user text
 * XML-escaped. Geometry is shared with the editor (core/layout/geometry) so exports match the
 * screen exactly.
 */
import { cachedBool } from '../expr/cache';
import { formatTextbook, type Run } from '../expr/format';
import {
  ACTION_GAP,
  ACTION_PAD,
  CHAR_WIDTH_EM,
  DOUBLE_BAR_GAP,
  FONT_SIZE,
  INITIAL_INSET,
  LABEL_FONT_SIZE,
  LINE_HEIGHT,
  STEP_FONT_SIZE,
  STEP_HALF,
  TRANSITION_THICKNESS,
  TRANSITION_WIDTH,
  commentRect,
  computeGeometry,
  grafcetBounds,
  layoutActions,
  stepLabelAnchor,
  transitionTextAnchor,
  type Rect,
} from '../layout/geometry';
import type { Grafcet, Id, Point } from '../model/types';

export interface ExportPalette {
  /** null = transparent. */
  background: string | null;
  ink: string;
  muted: string;
  commentFill: string;
  commentStroke: string;
}

/** Default for every export: black on white. */
export const PRINT_PALETTE: ExportPalette = {
  background: '#ffffff',
  ink: '#000000',
  muted: '#404040',
  commentFill: '#ffffff',
  commentStroke: '#7a7a7a',
};

export interface SvgOptions {
  palette?: ExportPalette;
  /** Only these elements (and the links between them); default: the whole grafcet. */
  only?: ReadonlySet<Id>;
  /** Textbook notation (overbars, ·, +) instead of the typed text. */
  textbook?: boolean;
  /** For PDF standard fonts: Latin-1 comparison operators and vector arrows for ↑/↓. */
  latin1?: boolean;
  /** Font family list for text. */
  fontFamily?: string;
  /** @font-face CSS to embed (e.g. a base64 font). */
  fontFaceCss?: string;
  margin?: number;
  /** Diagram title written into <title>. */
  title?: string;
}

export interface SvgResult {
  svg: string;
  /** The drawing without the outer <svg> element (for composing pages). */
  body: string;
  /** Diagram-unit rectangle covered by the SVG (viewBox). */
  box: Rect;
}

export const EXPORT_FONT_FAMILY = "'JetBrains Mono', 'Courier New', Courier, monospace";

export function escapeXml(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}

const n = (v: number) => String(Math.round(v * 100) / 100);
const baseline = (y: number, size: number) => y + size * 0.35;
const path = (pts: readonly Point[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join('');

class Writer {
  readonly parts: string[] = [];
  constructor(
    readonly pal: ExportPalette,
    readonly opts: SvgOptions,
  ) {}

  line(d: string, width = 1.5, color = this.pal.ink): void {
    this.parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"/>`);
  }

  fill(d: string, color = this.pal.ink): void {
    this.parts.push(`<path d="${d}" fill="${color}" stroke="none"/>`);
  }

  rect(r: Rect, fill: string, stroke = this.pal.ink, width = 1.5, extra = ''): void {
    this.parts.push(
      `<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.width)}" height="${n(r.height)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${extra}/>`,
    );
  }

  /** Text, with ↑/↓ drawn as vector arrows when restricted to Latin-1. */
  text(
    s: string,
    x: number,
    y: number,
    size: number,
    opts: { anchor?: 'start' | 'middle' | 'end'; color?: string } = {},
  ): void {
    const color = opts.color ?? this.pal.ink;
    const anchor = opts.anchor ?? 'start';
    const cw = size * CHAR_WIDTH_EM;
    const chars = [...s];
    const width = chars.length * cw;
    const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    const by = baseline(y, size);
    if (!this.opts.latin1 || !/[↑↓]/.test(s)) {
      this.parts.push(
        `<text x="${n(anchor === 'start' ? x0 : x)}" y="${n(by)}" font-size="${size}" fill="${color}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} xml:space="preserve">${escapeXml(s)}</text>`,
      );
      return;
    }
    let run = '';
    let runStart = 0;
    const flush = (end: number) => {
      if (run)
        this.parts.push(
          `<text x="${n(x0 + runStart * cw)}" y="${n(by)}" font-size="${size}" fill="${color}" xml:space="preserve">${escapeXml(run)}</text>`,
        );
      run = '';
      runStart = end;
    };
    chars.forEach((c, i) => {
      if (c === '↑' || c === '↓') {
        flush(i + 1);
        const cx = x0 + (i + 0.5) * cw;
        const top = by - size * 0.72;
        const bottom = by + size * 0.05;
        const up = c === '↑';
        this.line(`M${n(cx)} ${n(top)}V${n(bottom)}`, 1, color);
        const tip = up ? top : bottom;
        const d = up ? 1 : -1;
        this.fill(
          `M${n(cx)} ${n(tip)}L${n(cx - cw * 0.32)} ${n(tip + d * size * 0.3)}L${n(cx + cw * 0.32)} ${n(tip + d * size * 0.3)}Z`,
          color,
        );
      } else {
        if (!run) runStart = i;
        run += c;
      }
    });
    flush(chars.length);
  }

  /** A receptivity or condition, in textbook or typed form, left-aligned at x, centered on y. */
  expr(source: string, x: number, y: number): void {
    const parsed = this.opts.textbook && source.trim() ? cachedBool(source) : null;
    if (!parsed || !parsed.ok) {
      this.text(source, x, y, FONT_SIZE);
      return;
    }
    const runs: Run[] = formatTextbook(parsed.value, { asciiComparisons: this.opts.latin1 });
    this.text(runs.map((r) => r.text).join(''), x, y, FONT_SIZE);
    const cw = FONT_SIZE * CHAR_WIDTH_EM;
    const by = baseline(y, FONT_SIZE);
    let col = 0;
    for (const r of runs) {
      const len = [...r.text].length;
      for (let level = 1; level <= r.bars; level++) {
        const yy = by - FONT_SIZE * 0.86 - (level - 1) * 2.5;
        this.line(`M${n(x + col * cw + 0.5)} ${n(yy)}H${n(x + (col + len) * cw - 0.5)}`, 1.1);
      }
      col += len;
    }
  }
}

function render(w: Writer, g: Grafcet, only: ReadonlySet<Id> | undefined): void {
  const geom = computeGeometry(g);
  const keep = (id: Id) => !only || only.has(id);
  const pal = w.pal;

  for (const c of Object.values(g.comments)) {
    if (!keep(c.id)) continue;
    const r = commentRect(c);
    w.rect(r, pal.commentFill, pal.commentStroke, 1, ' stroke-dasharray="4 3" rx="2"');
    c.text
      .split('\n')
      .forEach((line, i) =>
        w.text(line, r.x + 8, r.y + 6 + LINE_HEIGHT * i + LINE_HEIGHT / 2, FONT_SIZE),
      );
  }

  for (const l of geom.links) {
    if (!keep(l.stepId) || !keep(l.transitionId)) continue;
    w.line(path(l.points));
    if (l.arrow)
      w.fill(
        `M${n(l.arrow.x)} ${n(l.arrow.y - 6)}L${n(l.arrow.x - 4.5)} ${n(l.arrow.y + 3)}L${n(l.arrow.x + 4.5)} ${n(l.arrow.y + 3)}Z`,
      );
  }
  for (const b of geom.bars) {
    if (!keep(b.transitionId)) continue;
    const h = DOUBLE_BAR_GAP / 2;
    w.line(path(b.stem));
    w.line(`M${n(b.x1)} ${n(b.y - h)}H${n(b.x2)}M${n(b.x1)} ${n(b.y + h)}H${n(b.x2)}`);
  }
  for (const s of geom.stubs) if (keep(s.transitionId)) w.line(path(s.points));

  for (const t of Object.values(g.transitions)) {
    if (!keep(t.id)) continue;
    const { x, y } = t.position;
    w.rect(
      {
        x: x - TRANSITION_WIDTH / 2,
        y: y - TRANSITION_THICKNESS / 2,
        width: TRANSITION_WIDTH,
        height: TRANSITION_THICKNESS,
      },
      pal.ink,
      'none',
      0,
    );
    if (t.number !== undefined)
      w.text(`(${t.number})`, x - TRANSITION_WIDTH / 2 - 6, y, FONT_SIZE, {
        anchor: 'end',
        color: pal.muted,
      });
    const a = transitionTextAnchor(t);
    w.expr(t.receptivity, a.x, a.y);
  }

  for (const s of Object.values(g.steps)) {
    if (!keep(s.id)) continue;
    const { x, y } = s.position;
    const r = STEP_HALF;
    const mark =
      g.kind === 'macroExpansion'
        ? !geom.index.incoming.has(s.id)
          ? 'E'
          : !geom.index.outgoing.has(s.id)
            ? 'S'
            : ''
        : g.kind === 'enclosed' && s.kind === 'initial'
          ? '*'
          : '';
    w.rect({ x: x - r, y: y - r, width: 2 * r, height: 2 * r }, pal.background ?? 'none');
    if (mark === '*') w.text('*', x - r - 4, y - r + 6, STEP_FONT_SIZE, { anchor: 'end' });
    else if (mark) w.text(mark, x - r + 3, y - r + 7, LABEL_FONT_SIZE);
    if (s.kind === 'initial' && mark !== '*') {
      w.rect(
        {
          x: x - r + INITIAL_INSET,
          y: y - r + INITIAL_INSET,
          width: 2 * (r - INITIAL_INSET),
          height: 2 * (r - INITIAL_INSET),
        },
        'none',
        pal.ink,
        1,
      );
    }
    if (s.kind === 'macro')
      w.line(`M${n(x - r)} ${n(y - r + 6)}H${n(x + r)}M${n(x - r)} ${n(y + r - 6)}H${n(x + r)}`, 1);
    if (s.kind === 'enclosing')
      w.line(`M${n(x - r + 6)} ${n(y - r)}V${n(y + r)}M${n(x + r - 6)} ${n(y - r)}V${n(y + r)}`, 1);
    w.text(String(s.number), x, y, STEP_FONT_SIZE, { anchor: 'middle' });
    if (s.label) {
      const a = stepLabelAnchor(s);
      w.text(s.label, a.x, a.y, LABEL_FONT_SIZE, { anchor: 'end', color: pal.muted });
    }
    const boxes = layoutActions(s, geom.index.actions.get(s.id) ?? []);
    boxes.forEach((box, i) => {
      const act = g.actions[box.id]!;
      const cy = box.y + box.height / 2;
      if (i === 0) w.line(`M${n(box.x - ACTION_GAP)} ${n(cy)}H${n(box.x)}`);
      w.rect(box, pal.background ?? 'none');
      if (act.kind === 'forcing')
        w.rect(
          { x: box.x + 3, y: box.y + 3, width: box.width - 6, height: box.height - 6 },
          'none',
          pal.ink,
          1,
        );
      const stored = act.kind === 'storedOnActivation' || act.kind === 'storedOnDeactivation';
      if (stored) {
        const ax = box.x + 8;
        const top = box.y + 8;
        const bottom = box.y + box.height - 8;
        const up = act.kind === 'storedOnActivation';
        const tip = up ? top : bottom;
        const d = up ? 1 : -1;
        w.line(`M${n(ax)} ${n(bottom)}V${n(top)}`, 1);
        w.fill(
          `M${n(ax)} ${n(tip)}L${n(ax - 3.6)} ${n(tip + d * 5)}L${n(ax + 3.6)} ${n(tip + d * 5)}Z`,
        );
      }
      w.text(
        act.text,
        box.x + ACTION_PAD + (stored ? 14 : act.kind === 'forcing' ? 3 : 0),
        cy,
        FONT_SIZE,
      );
      if (act.condition) {
        w.line(`M${n(box.x + 12)} ${n(box.y)}V${n(box.y - 10)}`, 1);
        w.expr(act.condition, box.x + 16, box.y - 9);
      }
    });
  }
}

/** Renders a grafcet (or part of it) as a standalone SVG document. */
export function grafcetToSvg(g: Grafcet, opts: SvgOptions = {}): SvgResult {
  const pal = opts.palette ?? PRINT_PALETTE;
  const margin = opts.margin ?? 20;
  const bounds = grafcetBounds(g, computeGeometry(g), opts.only) ?? {
    x: 0,
    y: 0,
    width: 100,
    height: 60,
  };
  const box = {
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + 2 * margin,
    height: bounds.height + 2 * margin,
  };
  const w = new Writer(pal, opts);
  render(w, g, opts.only);
  const font = opts.fontFamily ?? EXPORT_FONT_FAMILY;
  const head = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(box.width)}" height="${n(box.height)}" viewBox="${n(box.x)} ${n(box.y)} ${n(box.width)} ${n(box.height)}" font-family="${escapeXml(font)}">`,
    `<title>${escapeXml(opts.title ?? g.name)}</title>`,
    opts.fontFaceCss ? `<style>${opts.fontFaceCss}</style>` : '',
    pal.background
      ? `<rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" fill="${pal.background}"/>`
      : '',
  ];
  const body = w.parts.join('\n');
  return { svg: [...head, body, '</svg>'].filter(Boolean).join('\n') + '\n', body, box };
}
