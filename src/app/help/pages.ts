import { blockText, inlineText, parseMarkdown, type Block } from './markdown';

// The pages are the Markdown files of docs/help, bundled with the (lazy) help panel.
const RAW = import.meta.glob('/docs/help/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Reading order (the contents page first). */
export const ORDER = [
  'index',
  'getting-started',
  'grafcet-basics',
  'expressions',
  'actions',
  'editing',
  'variables',
  'simulation',
  'hierarchy',
  'files',
  'glossary',
  'troubleshooting',
];

export interface HelpSection {
  page: string;
  anchor: string | null;
  title: string;
  text: string;
}

export interface HelpPage {
  id: string;
  title: string;
  blocks: Block[];
  sections: HelpSection[];
}

function load(id: string, src: string): HelpPage {
  const blocks = parseMarkdown(src);
  const h1 = blocks.find((b) => b.t === 'h' && b.level === 1);
  const title = h1 && h1.t === 'h' ? inlineText(h1.c) : id;
  const sections: HelpSection[] = [{ page: id, anchor: null, title, text: '' }];
  for (const b of blocks) {
    if (b.t === 'h' && b.level === 2)
      sections.push({ page: id, anchor: b.id, title: b.text, text: '' });
    else if (!(b.t === 'h' && b.level === 1))
      sections[sections.length - 1]!.text += ` ${blockText(b)}`;
  }
  return { id, title, blocks: blocks.filter((b) => b !== h1), sections };
}

export const PAGES: HelpPage[] = ORDER.flatMap((id) => {
  const src = RAW[`/docs/help/${id}.md`];
  return src === undefined ? [] : [load(id, src)];
});

export const pageById = new Map(PAGES.map((p) => [p.id, p]));

export interface SearchHit extends HelpSection {
  pageTitle: string;
  snippet: string;
}

/** Sections containing every word of the query; title matches rank first. */
export function searchHelp(query: string): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: (SearchHit & { score: number })[] = [];
  for (const p of PAGES) {
    for (const s of p.sections) {
      const title = s.title.toLowerCase();
      const text = s.text.toLowerCase();
      if (!words.every((w) => title.includes(w) || text.includes(w))) continue;
      const score = words.reduce(
        (n, w) => n + (title.includes(w) ? 3 : 0) + (text.includes(w) ? 1 : 0),
        0,
      );
      const first = Math.max(0, text.indexOf(words[0]!));
      const from = Math.max(0, first - 50);
      const snippet = `${from > 0 ? '…' : ''}${s.text.slice(from, first + 90).trim()}…`;
      hits.push({ ...s, pageTitle: p.title, snippet, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 30);
}
