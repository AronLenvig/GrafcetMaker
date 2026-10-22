/**
 * Parser for the subset of Markdown used by the help pages (docs/help/*.md). Produces a small
 * block tree rendered as React elements: no HTML is ever injected. Supported: # headings,
 * paragraphs, - and 1. lists, > callouts, ``` code, | tables |, `code`, **bold**, *italic*,
 * [links](page.md#anchor), <kbd>keys</kbd> and <!-- figure: id | caption --> diagrams.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'kbd'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'h'; level: 1 | 2 | 3; id: string; c: Inline[]; text: string }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] }
  | { t: 'quote'; c: Inline[][] }
  | { t: 'code'; v: string }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'figure'; id: string; caption: string };

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Inline markup; unknown syntax stays literal text. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ t: 'text', v: text });
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^`([^`]+)`/.exec(rest))) {
      flush();
      out.push({ t: 'code', v: m[1]! });
    } else if ((m = /^<kbd>(.+?)<\/kbd>/.exec(rest))) {
      flush();
      out.push({ t: 'kbd', v: m[1]! });
    } else if ((m = /^\*\*(.+?)\*\*/.exec(rest))) {
      flush();
      out.push({ t: 'strong', c: parseInline(m[1]!) });
    } else if (
      (m = /^\*([^*\s][^*]*?)\*/.exec(rest)) ||
      (m = /^_([^_\s][^_]*?)_(?![\p{L}\p{N}])/u.exec(rest))
    ) {
      flush();
      out.push({ t: 'em', c: parseInline(m[1]!) });
    } else if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) {
      flush();
      out.push({ t: 'link', href: m[2]!, c: parseInline(m[1]!) });
    } else {
      text += src[i];
      i++;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}

/** Table cells; `\|` is a literal pipe. */
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||(?<!\\)\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => parseInline(c.trim().replace(/\\\|/g, '|')));

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    let m: RegExpExecArray | null;
    if (!trimmed) {
      flushPara();
    } else if ((m = /^<!--\s*figure:\s*([\w-]+)\s*(?:\|\s*(.*?))?\s*-->$/.exec(trimmed))) {
      flushPara();
      blocks.push({ t: 'figure', id: m[1]!, caption: m[2] ?? '' });
    } else if (trimmed.startsWith('<!--')) {
      flushPara();
      while (i < lines.length && !lines[i]!.includes('-->')) i++;
    } else if ((m = /^(#{1,3})\s+(.*)$/.exec(trimmed))) {
      flushPara();
      const text = m[2]!;
      blocks.push({
        t: 'h',
        level: m[1]!.length as 1 | 2 | 3,
        id: slug(text),
        c: parseInline(text),
        text,
      });
    } else if (trimmed.startsWith('```')) {
      flushPara();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i]!.trim().startsWith('```'); i++) code.push(lines[i]!);
      blocks.push({ t: 'code', v: code.join('\n') });
    } else if (trimmed.startsWith('|') && /^\|?\s*:?-+:?\s*\|/.test(lines[i + 1]?.trim() ?? '')) {
      flushPara();
      const head = cells(trimmed);
      const rows: Inline[][][] = [];
      for (i += 2; i < lines.length && lines[i]!.trim().startsWith('|'); i++)
        rows.push(cells(lines[i]!));
      i--;
      blocks.push({ t: 'table', head, rows });
    } else if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      flushPara();
      const ordered = /^\d+\./.test(trimmed);
      const items: string[] = [];
      for (; i < lines.length; i++) {
        const l = lines[i]!;
        const item = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(l);
        if (item && /^\d+\./.test(item[1]!) === ordered) items.push(item[2]!);
        else if (l.trim() && /^\s{2,}/.test(l) && items.length)
          items[items.length - 1] += ` ${l.trim()}`;
        else break;
      }
      i--;
      blocks.push({ t: ordered ? 'ol' : 'ul', items: items.map(parseInline) });
    } else if (trimmed.startsWith('>')) {
      flushPara();
      const parts: string[][] = [[]];
      for (; i < lines.length && lines[i]!.trim().startsWith('>'); i++) {
        const l = lines[i]!.trim().replace(/^>\s?/, '');
        if (l) parts[parts.length - 1]!.push(l);
        else parts.push([]);
      }
      i--;
      blocks.push({
        t: 'quote',
        c: parts.filter((p) => p.length).map((p) => parseInline(p.join(' '))),
      });
    } else {
      para.push(trimmed);
    }
  }
  flushPara();
  return blocks;
}

/** Plain text of inline content (search, headings). */
export function inlineText(c: Inline[]): string {
  return c.map((x) => ('v' in x ? x.v : inlineText(x.c))).join('');
}

export function blockText(b: Block): string {
  switch (b.t) {
    case 'h':
      return b.text;
    case 'p':
      return inlineText(b.c);
    case 'ul':
    case 'ol':
      return b.items.map(inlineText).join(' ');
    case 'quote':
      return b.c.map(inlineText).join(' ');
    case 'code':
      return b.v;
    case 'table':
      return [b.head, ...b.rows].map((r) => r.map(inlineText).join(' ')).join(' ');
    case 'figure':
      return b.caption;
  }
}
