/**
 * The public website around the app, rendered at build time (vite.config.ts): one static GRAFCET
 * guide per language at <lang>/index.html, plus sitemap.xml and robots.txt for search engines.
 * Pages are plain HTML and CSS (no JavaScript but the theme bootstrap), bundled with the app so
 * they work offline and on-premise. Text comes from Markdown and is escaped; no HTML is injected.
 */
import { EXAMPLES, type ExampleId } from '@/app/examples/examples';
import { parseMarkdown, type Block, type Inline } from '@/app/help/markdown';
import { encodeShareHash } from '@/core/io/shareLink';
import {
  EXPORT_FONT_FAMILY,
  escapeXml as esc,
  grafcetToSvg,
  type ExportPalette,
} from '@/core/io/svgExport';
import type { Grafcet } from '@/core/model/types';
import { guideFigures } from './figures';
import { DEFAULT_LANG, LANGS, SITE_TEXT, type Lang } from './locales';

export interface SiteInput {
  /** Absolute URL of the public site, with a trailing slash. */
  siteUrl: string;
  /** Markdown of the guide by language (docs/guide/<lang>.md). */
  guides: Partial<Record<string, string>>;
  /** Body of the inline theme bootstrap of index.html, so pages open in the app's theme. */
  themeScript: string;
  /** Published path of the stylesheet, from the site root. */
  css: string;
}

export interface SiteFile {
  fileName: string;
  source: string;
}

/** Pages sit one level below the root: <lang>/index.html. */
const UP = '../';

/**
 * Figure colors, restyled by the stylesheet from the diagram tokens (`.fig [fill=…]`), so one
 * inline SVG follows the light and dark themes.
 */
const PALETTE: ExportPalette = {
  background: '#000005',
  ink: 'currentColor',
  muted: '#000002',
  commentFill: '#000003',
  commentStroke: '#000004',
};

const LOGO = `<svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="4"><rect x="16" y="6" width="32" height="32"/><rect x="22" y="12" width="20" height="20"/><path d="M32 38v24"/></g><rect x="20" y="48" width="24" height="5" fill="currentColor"/></svg>`;

const pageUrl = (siteUrl: string, lang: Lang) => `${siteUrl}${lang}/`;

/** Links of the guide: `app:` and `app:#help/…` lead into the editor, the rest stays as written. */
function href(target: string): string {
  return target.startsWith('app:') ? UP + target.slice(4) : target;
}

/** Prose; French punctuation keeps its space, unbreakable so : ; ? ! never start a line. */
function prose(text: string, lang: Lang): string {
  const t = esc(text);
  return lang === 'fr' ? t.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ') : t;
}

function inline(c: Inline[], lang: Lang): string {
  return c
    .map((x) => {
      switch (x.t) {
        case 'text':
          return prose(x.v, lang);
        case 'code':
          return `<code>${esc(x.v)}</code>`;
        case 'kbd':
          return `<kbd>${esc(x.v)}</kbd>`;
        case 'strong':
          return `<strong>${inline(x.c, lang)}</strong>`;
        case 'em':
          return `<em>${inline(x.c, lang)}</em>`;
        case 'link':
          return `<a href="${esc(href(x.href))}">${inline(x.c, lang)}</a>`;
      }
    })
    .join('');
}

function svgOf(g: Grafcet, caption: string): string {
  const { svg } = grafcetToSvg(g, {
    palette: PALETTE,
    fontFamily: EXPORT_FONT_FAMILY,
    margin: 12,
    textbook: true,
    title: caption,
  });
  return svg.replace('<svg ', '<svg role="img" focusable="false" ').trim();
}

interface Context {
  lang: Lang;
  figures: Record<string, () => Grafcet>;
}

async function figure(id: string, caption: string, ctx: Context): Promise<string> {
  const make = ctx.figures[id];
  if (make) {
    return `<figure class="fig"><div class="fig-art">${svgOf(make(), caption)}</div><figcaption>${prose(caption, ctx.lang)}</figcaption></figure>`;
  }
  const example = id.startsWith('example-') ? id.slice('example-'.length) : '';
  if (!(example in EXAMPLES)) throw new Error(`docs/guide/${ctx.lang}.md: unknown figure "${id}"`);
  const project = EXAMPLES[example as ExampleId]();
  const g = project.grafcets[project.grafcetOrder[0]!]!;
  const link = UP + (await encodeShareHash(project));
  return `<figure class="fig"><div class="fig-art">${svgOf({ ...g, comments: {} }, caption)}</div><figcaption>${prose(caption, ctx.lang)} <a class="button" href="${esc(link)}">${esc(SITE_TEXT[ctx.lang].openExample)}</a></figcaption></figure>`;
}

async function block(b: Block, ctx: Context): Promise<string> {
  switch (b.t) {
    case 'h':
      return `<h${b.level} id="${esc(b.id)}">${inline(b.c, ctx.lang)}</h${b.level}>`;
    case 'p':
      return `<p>${inline(b.c, ctx.lang)}</p>`;
    case 'ul':
    case 'ol':
      return `<${b.t}>${b.items.map((i) => `<li>${inline(i, ctx.lang)}</li>`).join('')}</${b.t}>`;
    case 'quote':
      return `<blockquote>${b.c.map((p) => `<p>${inline(p, ctx.lang)}</p>`).join('')}</blockquote>`;
    case 'code':
      return `<pre><code>${esc(b.v)}</code></pre>`;
    case 'table':
      return `<div class="table-wrap" tabindex="0"><table><thead><tr>${b.head.map((c) => `<th scope="col">${inline(c, ctx.lang)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx.lang)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'figure':
      return figure(b.id, b.caption, ctx);
  }
}

/** JSON in a <script> element: `<` escaped so text can never close the element. */
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

async function guidePage(lang: Lang, src: string, input: SiteInput): Promise<string> {
  const text = SITE_TEXT[lang];
  const blocks = parseMarkdown(src);
  const h1 = blocks.find((b) => b.t === 'h' && b.level === 1);
  if (!h1 || h1.t !== 'h') throw new Error(`docs/guide/${lang}.md: missing # title`);
  const ctx: Context = { lang, figures: guideFigures(lang) };
  const body: string[] = [];
  for (const b of blocks) if (b !== h1) body.push(await block(b, ctx));
  const toc = blocks
    .filter((b): b is Extract<Block, { t: 'h' }> => b.t === 'h' && b.level === 2)
    .map((b) => `<li><a href="#${esc(b.id)}">${inline(b.c, lang)}</a></li>`)
    .join('');

  const url = pageUrl(input.siteUrl, lang);
  const image = `${input.siteUrl}og-image.png`;
  const updated = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${text.updated}T00:00:00Z`),
  );
  const alternates = [
    ...LANGS.map(
      (l) => `<link rel="alternate" hreflang="${l}" href="${esc(pageUrl(input.siteUrl, l))}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${esc(pageUrl(input.siteUrl, DEFAULT_LANG))}" />`,
  ];
  const languages = LANGS.map(
    (l) =>
      `<a href="${UP}${l}/" hreflang="${l}" lang="${l}" title="${esc(SITE_TEXT[l].language)}"${l === lang ? ' aria-current="page"' : ''}>${l.toUpperCase()}</a>`,
  ).join('');
  const site = { '@type': 'WebSite', name: 'GrafcetMaker', url: input.siteUrl };
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: h1.text,
        description: text.description,
        inLanguage: lang,
        url,
        image,
        dateModified: text.updated,
        about: { '@type': 'Thing', name: 'GRAFCET', alternateName: 'IEC 60848' },
        author: { '@type': 'Organization', name: 'GrafcetMaker', url: input.siteUrl },
        publisher: { '@type': 'Organization', name: 'GrafcetMaker', url: input.siteUrl },
        isPartOf: site,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GrafcetMaker', item: input.siteUrl },
          { '@type': 'ListItem', position: 2, name: text.guide, item: url },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>${esc(text.title)}</title>
    <meta name="description" content="${esc(text.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    ${alternates.join('\n    ')}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="GrafcetMaker" />
    <meta property="og:title" content="${esc(text.title)}" />
    <meta property="og:description" content="${esc(text.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="${text.locale}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="${UP}favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${UP}apple-touch-icon.png" />
    <link rel="stylesheet" href="${UP}${esc(input.css)}" />
    <script>${input.themeScript}</script>
    ${jsonLd(structured)}
  </head>
  <body>
    <a class="skip" href="#main">${esc(text.skip)}</a>
    <header class="top">
      <a class="brand" href="${UP}">${LOGO}<span>GrafcetMaker</span></a>
      <nav class="langs" aria-label="${esc(text.languages)}">${languages}</nav>
      <a class="button primary" href="${UP}">${esc(text.openEditor)}</a>
    </header>
    <main id="main">
      <article class="layout">
        <header class="intro">
          <h1>${inline(h1.c, lang)}</h1>
          <p class="updated">${esc(text.updatedLabel)} <time datetime="${text.updated}">${esc(updated)}</time></p>
        </header>
        <nav class="toc" aria-labelledby="toc-title">
          <h2 id="toc-title">${esc(text.contents)}</h2>
          <ol>${toc}</ol>
        </nav>
        <div class="text">
          ${body.join('\n          ')}
        </div>
      </article>
    </main>
    <footer class="foot">
      <p>${esc(text.footer)}</p>
      <p><a href="${UP}">${esc(text.openEditor)}</a> · ${languages}</p>
    </footer>
  </body>
</html>
`;
}

function sitemap(siteUrl: string): string {
  const alternates = [...LANGS, 'x-default' as const]
    .map((l) => {
      const u = pageUrl(siteUrl, l === 'x-default' ? DEFAULT_LANG : l);
      return `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(u)}"/>`;
    })
    .join('\n');
  const guides = LANGS.map(
    (l) => `  <url>
    <loc>${esc(pageUrl(siteUrl, l))}</loc>
    <lastmod>${SITE_TEXT[l].updated}</lastmod>
${alternates}
  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${esc(siteUrl)}</loc>
  </url>
${guides.join('\n')}
</urlset>
`;
}

const robots = (siteUrl: string) => `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}sitemap.xml
`;

export async function buildSite(input: SiteInput): Promise<SiteFile[]> {
  const files: SiteFile[] = [];
  for (const lang of LANGS) {
    const src = input.guides[lang];
    if (src === undefined) throw new Error(`docs/guide/${lang}.md is missing`);
    files.push({ fileName: `${lang}/index.html`, source: await guidePage(lang, src, input) });
  }
  files.push({ fileName: 'sitemap.xml', source: sitemap(input.siteUrl) });
  files.push({ fileName: 'robots.txt', source: robots(input.siteUrl) });
  return files;
}
