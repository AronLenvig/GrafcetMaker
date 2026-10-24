import { describe, expect, it } from 'vitest';
import { parseMarkdown, type Block, type Inline } from '@/app/help/markdown';
import i18next, { languageOfPath, rootOfPath } from '@/i18n';
import { en } from '@/i18n/en';

/**
 * Translations keep what the code relies on: every key with the same placeholders, and help pages
 * with the anchors, figures, links and keys of the English page.
 */
const LANGS = ['fr', 'de', 'es', 'da', 'sv'] as const;

const strings = import.meta.glob<Record<string, unknown>>('/src/i18n/{fr,de,es,da,sv}.ts', {
  eager: true,
});
const help = import.meta.glob<string>('/docs/help/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function leaves(o: unknown, prefix = ''): [string, string][] {
  if (typeof o === 'string') return [[prefix, o]];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    leaves(v, prefix ? `${prefix}.${k}` : k),
  );
}

const placeholders = (s: string) => [...s.matchAll(/{{(\w+)[^}]*}}/g)].map((m) => m[1]).sort();

function inlines(c: Inline[]): Inline[] {
  return c.flatMap((x) => ('c' in x ? [x, ...inlines(x.c)] : [x]));
}

/** What a help page must keep in every language. */
function skeleton(src: string) {
  const blocks = parseMarkdown(src);
  const all = blocks.flatMap((b: Block): Inline[] => {
    switch (b.t) {
      case 'h':
      case 'p':
        return inlines(b.c);
      case 'ul':
      case 'ol':
        return b.items.flatMap(inlines);
      case 'quote':
        return b.c.flatMap(inlines);
      case 'table':
        return [...b.head, ...b.rows.flat()].flatMap(inlines);
      default:
        return [];
    }
  });
  return {
    headings: blocks.flatMap((b) => (b.t === 'h' && b.level > 1 ? [`${b.level} ${b.id}`] : [])),
    figures: blocks.flatMap((b) => (b.t === 'figure' ? [b.id] : [])),
    links: all.flatMap((x) => (x.t === 'link' ? [x.href] : [])).sort(),
    keys: all.flatMap((x) => (x.t === 'kbd' ? [x.v] : [])).sort(),
  };
}

const englishPages = Object.keys(help)
  .map((p) => /^\/docs\/help\/([\w-]+)\.md$/.exec(p)?.[1])
  .filter((id): id is string => id !== undefined);

it('lowercases a word inside a sentence where the language asks for it', () => {
  expect(i18next.t('expr.newVariable', { name: 'start', type: 'BOOL', direction: 'Input' })).toBe(
    'New variable start: BOOL input',
  );
});

it('reads the language of the address: the editor at <root>/<lang>/', () => {
  expect(languageOfPath('/de/')).toBe('de');
  expect(languageOfPath('/tools/grafcet/fr/index.html')).toBe('fr');
  expect(languageOfPath('/')).toBeUndefined();
  expect(languageOfPath('/de/guide/')).toBeUndefined();
  expect(languageOfPath('/xx/')).toBeUndefined();
  // Switching language replaces the language folder, never adds one: …/de/ → …/fr/.
  expect(rootOfPath('/de/')).toBe('/');
  expect(rootOfPath('/de/index.html')).toBe('/');
  expect(rootOfPath('/')).toBe('/');
  expect(rootOfPath('/tools/grafcet/fr/')).toBe('/tools/grafcet/');
  expect(rootOfPath('/tools/grafcet/')).toBe('/tools/grafcet/');
});

describe.each(LANGS)('%s', (lang) => {
  it('translates every string with the same placeholders', () => {
    const mod = strings[`/src/i18n/${lang}.ts`];
    expect(mod, `src/i18n/${lang}.ts`).toBeDefined();
    const translated = new Map(leaves(mod![lang]));
    for (const [key, text] of leaves(en)) {
      expect(translated.has(key), key).toBe(true);
      expect(placeholders(translated.get(key)!), key).toEqual(placeholders(text));
    }
  });

  it.each(englishPages)('help page %s keeps anchors, figures, links and keys', (id) => {
    const src = help[`/docs/help/${lang}/${id}.md`];
    expect(src, `docs/help/${lang}/${id}.md`).toBeDefined();
    expect(skeleton(src!)).toEqual(skeleton(help[`/docs/help/${id}.md`]!));
  });
});
