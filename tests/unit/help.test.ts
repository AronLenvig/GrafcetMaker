import { describe, expect, it } from 'vitest';
import { FIGURES } from '@/app/help/figures';
import { parseInline, parseMarkdown, type Block, type Inline } from '@/app/help/markdown';
import { ORDER, PAGES, pageById, searchHelp } from '@/app/help/pages';
import { grafcetToSvg } from '@/core/io/svgExport';

function links(c: Inline[]): string[] {
  return c.flatMap((x) => (x.t === 'link' ? [x.href, ...links(x.c)] : 'c' in x ? links(x.c) : []));
}

function blockLinks(b: Block): string[] {
  switch (b.t) {
    case 'h':
    case 'p':
      return links(b.c);
    case 'ul':
    case 'ol':
      return b.items.flatMap(links);
    case 'quote':
      return b.c.flatMap(links);
    case 'table':
      return [...b.head, ...b.rows.flat()].flatMap(links);
    default:
      return [];
  }
}

describe('help pages', () => {
  it('loads every page in reading order', () => {
    expect(PAGES.map((p) => p.id)).toEqual(ORDER);
    for (const p of PAGES) expect(p.title).not.toBe(p.id);
  });

  it('has no broken internal links or anchors', () => {
    for (const p of PAGES) {
      for (const href of p.blocks.flatMap(blockLinks)) {
        if (/^https?:/.test(href)) continue;
        const m = /^([\w-]+)\.md(?:#([\w-]+))?$/.exec(href);
        expect(m, `${p.id}: ${href}`).not.toBeNull();
        const target = pageById.get(m![1]!);
        expect(target, `${p.id}: ${href}`).toBeDefined();
        if (m![2]) expect(target!.sections.some((s) => s.anchor === m![2])).toBe(true);
      }
    }
  });

  it('draws every figure it references', () => {
    const used = PAGES.flatMap((p) =>
      p.blocks.filter((b) => b.t === 'figure').map((b) => (b as { id: string }).id),
    );
    expect(used.length).toBeGreaterThan(5);
    for (const id of used) {
      expect(FIGURES[id], id).toBeDefined();
      expect(grafcetToSvg(FIGURES[id]!()).svg).toContain('<svg');
    }
  });

  it('finds sections by words', () => {
    const hits = searchHelp('falling edge');
    expect(hits[0]?.page).toBe('expressions');
    expect(searchHelp('zzzz-not-there')).toEqual([]);
  });
});

describe('help markdown', () => {
  it('parses inline markup', () => {
    expect(parseInline('a **b** `c` <kbd>F1</kbd> [d](x.md) _e_')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'strong', c: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' ' },
      { t: 'code', v: 'c' },
      { t: 'text', v: ' ' },
      { t: 'kbd', v: 'F1' },
      { t: 'text', v: ' ' },
      { t: 'link', href: 'x.md', c: [{ t: 'text', v: 'd' }] },
      { t: 'text', v: ' ' },
      { t: 'em', c: [{ t: 'text', v: 'e' }] },
    ]);
  });

  it('parses blocks, tables with escaped pipes and figures', () => {
    const blocks = parseMarkdown(
      '# T\n\npara\nline\n\n- one\n  more\n- two\n\n| a | b |\n| - | - |\n| `x \\|\\| y` | 2 |\n\n<!-- figure: or | Cap -->\n\n> **Tip:** hi',
    );
    expect(blocks.map((b) => b.t)).toEqual(['h', 'p', 'ul', 'table', 'figure', 'quote']);
    expect(blocks[2]).toMatchObject({ items: [[{ v: 'one more' }], [{ v: 'two' }]] });
    expect(blocks[3]).toMatchObject({ rows: [[[{ t: 'code', v: 'x || y' }], [{ v: '2' }]]] });
    expect(blocks[4]).toEqual({ t: 'figure', id: 'or', caption: 'Cap' });
  });
});
