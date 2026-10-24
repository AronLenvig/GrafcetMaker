/**
 * The public website around the app, rendered at build time (vite.config.ts): one static GRAFCET
 * guide per language at <lang>/index.html, the help pages at help/, the home page text that
 * index.html carries for readers without JavaScript, and sitemap.xml, robots.txt and llms.txt.
 * Pages are plain HTML and CSS (no JavaScript but the theme bootstrap), bundled with the app so
 * they work offline and on-premise. Text comes from Markdown and is escaped; no HTML is injected.
 */
import { EXAMPLES, type ExampleId } from '@/app/examples/examples';
import { FIGURES } from '@/app/help/figures';
import { inlineText, parseMarkdown, type Block, type Inline } from '@/app/help/markdown';
import { PAGES, type HelpPage } from '@/app/help/pages';
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
  /** Markdown of the home page text (docs/home.md). */
  home: string;
  /** Body of the inline theme bootstrap of index.html, so pages open in the app's theme. */
  themeScript: string;
  /** Published path of the stylesheet, from the site root. */
  css: string;
}

export interface SiteFile {
  fileName: string;
  source: string;
}

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

/** Published path of a help page, from the site root. The help is in English, like the app. */
const helpPath = (id: string) => (id === 'index' ? 'help/' : `help/${id}/`);

const helpCenter = PAGES.find((p) => p.id === 'index')?.title ?? 'Help center';

/**
 * Links of the Markdown sources: `app:` and `app:#help/…` lead into the editor, `page.md#anchor`
 * to a help page, and the rest stays as written. `up` leads from the page to the site root.
 */
function href(target: string, up: string): string {
  if (target.startsWith('app:')) return up + target.slice(4);
  const help = /^(?:\.\/)?([\w-]+)\.md(#[\w-]+)?$/.exec(target);
  return help ? up + helpPath(help[1]!) + (help[2] ?? '') : target;
}

/** Prose; French punctuation keeps its space, unbreakable so : ; ? ! never start a line. */
function prose(text: string, lang: Lang): string {
  const t = esc(text);
  return lang === 'fr' ? t.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ') : t;
}

/** The first paragraph of a page, cut to the length search engines show. */
function summary(blocks: Block[]): string {
  const p = blocks.find((b): b is Extract<Block, { t: 'p' }> => b.t === 'p');
  const text = p ? inlineText(p.c) : '';
  return text.length <= 160 ? text : `${text.slice(0, text.lastIndexOf(' ', 157))}…`;
}

interface Context {
  lang: Lang;
  /** Relative path from the page to the site root. */
  up: string;
  /** The Markdown source, for build errors. */
  file: string;
  figures: Record<string, () => Grafcet>;
}

function inline(c: Inline[], ctx: Context): string {
  return c
    .map((x) => {
      switch (x.t) {
        case 'text':
          return prose(x.v, ctx.lang);
        case 'code':
          return `<code>${esc(x.v)}</code>`;
        case 'kbd':
          return `<kbd>${esc(x.v)}</kbd>`;
        case 'strong':
          return `<strong>${inline(x.c, ctx)}</strong>`;
        case 'em':
          return `<em>${inline(x.c, ctx)}</em>`;
        case 'link':
          return `<a href="${esc(href(x.href, ctx.up))}">${inline(x.c, ctx)}</a>`;
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

async function figure(id: string, caption: string, ctx: Context): Promise<string> {
  const make = ctx.figures[id];
  if (make) {
    return `<figure class="fig"><div class="fig-art">${svgOf(make(), caption)}</div><figcaption>${prose(caption, ctx.lang)}</figcaption></figure>`;
  }
  const example = id.startsWith('example-') ? id.slice('example-'.length) : '';
  if (!(example in EXAMPLES)) throw new Error(`${ctx.file}: unknown figure "${id}"`);
  const project = EXAMPLES[example as ExampleId]();
  const g = project.grafcets[project.grafcetOrder[0]!]!;
  const link = ctx.up + (await encodeShareHash(project));
  return `<figure class="fig"><div class="fig-art">${svgOf({ ...g, comments: {} }, caption)}</div><figcaption>${prose(caption, ctx.lang)} <a class="button" href="${esc(link)}">${esc(SITE_TEXT[ctx.lang].openExample)}</a></figcaption></figure>`;
}

async function block(b: Block, ctx: Context): Promise<string> {
  switch (b.t) {
    case 'h':
      return `<h${b.level} id="${esc(b.id)}">${inline(b.c, ctx)}</h${b.level}>`;
    case 'p':
      return `<p>${inline(b.c, ctx)}</p>`;
    case 'ul':
    case 'ol':
      return `<${b.t}>${b.items.map((i) => `<li>${inline(i, ctx)}</li>`).join('')}</${b.t}>`;
    case 'quote':
      return `<blockquote>${b.c.map((p) => `<p>${inline(p, ctx)}</p>`).join('')}</blockquote>`;
    case 'code':
      return `<pre><code>${esc(b.v)}</code></pre>`;
    case 'table':
      return `<div class="table-wrap" tabindex="0"><table><thead><tr>${b.head.map((c) => `<th scope="col">${inline(c, ctx)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'figure':
      return figure(b.id, b.caption, ctx);
  }
}

async function blocks(list: Block[], ctx: Context): Promise<string[]> {
  const out: string[] = [];
  for (const b of list) out.push(await block(b, ctx));
  return out;
}

const h2s = (list: Block[]) =>
  list.filter((b): b is Extract<Block, { t: 'h' }> => b.t === 'h' && b.level === 2);

/** JSON in a <script> element: `<` escaped so text can never close the element. */
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

interface Frame {
  lang: Lang;
  /** Relative path from the page to the site root. */
  up: string;
  url: string;
  title: string;
  description: string;
  /** Language alternates of the page, if any. */
  alternates: string[];
  /** Links of the header, between the brand and the editor button. */
  nav: string;
  structured: unknown;
  /** Content of <main>. */
  main: string;
  /** Links of the footer, under its text. */
  links: string;
}

/** A page of the site: header, main content, footer. */
function frame(f: Frame, input: SiteInput): string {
  const text = SITE_TEXT[f.lang];
  const image = `${input.siteUrl}og-image.png`;
  const head = [
    `<title>${esc(f.title)}</title>`,
    `<meta name="description" content="${esc(f.description)}" />`,
    `<link rel="canonical" href="${esc(f.url)}" />`,
    ...f.alternates,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="GrafcetMaker" />`,
    `<meta property="og:title" content="${esc(f.title)}" />`,
    `<meta property="og:description" content="${esc(f.description)}" />`,
    `<meta property="og:url" content="${esc(f.url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="${text.locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="icon" href="${f.up}favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="${f.up}apple-touch-icon.png" />`,
    `<link rel="stylesheet" href="${f.up}${esc(input.css)}" />`,
    `<script>${input.themeScript}</script>`,
    jsonLd(f.structured),
  ];
  return `<!doctype html>
<html lang="${f.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    ${head.join('\n    ')}
  </head>
  <body>
    <a class="skip" href="#main">${esc(text.skip)}</a>
    <header class="top">
      <a class="brand" href="${f.up}">${LOGO}<span>GrafcetMaker</span></a>
      ${f.nav}
      <a class="button primary" href="${f.up}">${esc(text.openEditor)}</a>
    </header>
    <main id="main">
      ${f.main}
    </main>
    <footer class="foot">
      <p>${esc(text.footer)}</p>
      <p>${f.links}</p>
    </footer>
  </body>
</html>
`;
}

const site = (siteUrl: string) => ({ '@type': 'WebSite', name: 'GrafcetMaker', url: siteUrl });
const org = (siteUrl: string) => ({ '@type': 'Organization', name: 'GrafcetMaker', url: siteUrl });

async function guidePage(lang: Lang, src: string, input: SiteInput): Promise<string> {
  const text = SITE_TEXT[lang];
  const parsed = parseMarkdown(src);
  const h1 = parsed.find((b) => b.t === 'h' && b.level === 1);
  if (!h1 || h1.t !== 'h') throw new Error(`docs/guide/${lang}.md: missing # title`);
  const up = '../';
  const ctx: Context = { lang, up, file: `docs/guide/${lang}.md`, figures: guideFigures(lang) };
  const body = await blocks(
    parsed.filter((b) => b !== h1),
    ctx,
  );
  const toc = h2s(parsed)
    .map((b) => `<li><a href="#${esc(b.id)}">${inline(b.c, ctx)}</a></li>`)
    .join('');

  const url = pageUrl(input.siteUrl, lang);
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
      `<a href="${up}${l}/" hreflang="${l}" lang="${l}" title="${esc(SITE_TEXT[l].language)}"${l === lang ? ' aria-current="page"' : ''}>${l.toUpperCase()}</a>`,
  ).join('');
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: h1.text,
        description: text.description,
        inLanguage: lang,
        url,
        image: `${input.siteUrl}og-image.png`,
        dateModified: text.updated,
        about: { '@type': 'Thing', name: 'GRAFCET', alternateName: 'IEC 60848' },
        author: org(input.siteUrl),
        publisher: org(input.siteUrl),
        isPartOf: site(input.siteUrl),
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

  return frame(
    {
      lang,
      up,
      url,
      title: text.title,
      description: text.description,
      alternates,
      nav: `<nav class="nav" aria-label="${esc(text.languages)}">${languages}</nav>`,
      structured,
      main: `<article class="layout">
        <header class="intro">
          <h1>${inline(h1.c, ctx)}</h1>
          <p class="updated">${esc(text.updatedLabel)} <time datetime="${text.updated}">${esc(updated)}</time></p>
        </header>
        <nav class="toc" aria-labelledby="toc-title">
          <h2 id="toc-title">${esc(text.contents)}</h2>
          <ol>${toc}</ol>
        </nav>
        <div class="text">
          ${body.join('\n          ')}
        </div>
      </article>`,
      links: `<a href="${up}">${esc(text.openEditor)}</a> · <a href="${up}${helpPath('index')}" hreflang="en">${esc(text.help)}</a> · ${languages}`,
    },
    input,
  );
}

/** A page of the in-app help (docs/help), published for search engines and visitors. */
async function helpPage(page: HelpPage, input: SiteInput): Promise<string> {
  const lang: Lang = 'en';
  const text = SITE_TEXT[lang];
  const index = page.id === 'index';
  const up = index ? '../' : '../../';
  const ctx: Context = { lang, up, file: `docs/help/${page.id}.md`, figures: FIGURES };
  const body = await blocks(page.blocks, ctx);
  const pages = PAGES.map((p) => {
    const current = p.id === page.id;
    const sections = current
      ? h2s(page.blocks)
          .map((b) => `<li><a href="#${esc(b.id)}">${inline(b.c, ctx)}</a></li>`)
          .join('')
      : '';
    return `<li><a href="${up}${helpPath(p.id)}"${current ? ' aria-current="page"' : ''}>${esc(p.title)}</a>${sections && `<ol>${sections}</ol>`}</li>`;
  }).join('');

  const url = input.siteUrl + helpPath(page.id);
  const title = index
    ? `GrafcetMaker ${helpCenter.toLowerCase()}`
    : `${page.title} | GrafcetMaker help`;
  const description = summary(page.blocks);
  const crumbs = [
    { name: 'GrafcetMaker', item: input.siteUrl },
    { name: helpCenter, item: input.siteUrl + helpPath('index') },
    ...(index ? [] : [{ name: page.title, item: url }]),
  ];
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: page.title,
        description,
        inLanguage: lang,
        url,
        image: `${input.siteUrl}og-image.png`,
        about: { '@type': 'SoftwareApplication', name: 'GrafcetMaker', url: input.siteUrl },
        author: org(input.siteUrl),
        publisher: org(input.siteUrl),
        isPartOf: site(input.siteUrl),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
      },
    ],
  };

  return frame(
    {
      lang,
      up,
      url,
      title,
      description,
      alternates: [],
      nav: `<nav class="nav" aria-label="GrafcetMaker"><a href="${up}${DEFAULT_LANG}/">${esc(text.guide)}</a><a href="${up}${helpPath('index')}"${index ? ' aria-current="page"' : ''}>${esc(helpCenter)}</a></nav>`,
      structured,
      main: `<article class="layout">
        <header class="intro">
          <h1>${esc(page.title)}</h1>
        </header>
        <nav class="toc" aria-labelledby="toc-title">
          <h2 id="toc-title">${esc(helpCenter)}</h2>
          <ol>${pages}</ol>
        </nav>
        <div class="text">
          ${body.join('\n          ')}
        </div>
      </article>`,
      links: `<a href="${up}">${esc(text.openEditor)}</a> · <a href="${up}${DEFAULT_LANG}/">${esc(text.guide)}</a> · <a href="${up}${helpPath('index')}">${esc(helpCenter)}</a>`,
    },
    input,
  );
}

interface DocLink {
  lang: Lang;
  title: string;
  /** Published path, from the site root. */
  path: string;
  description: string;
}

/** Every page of the site, for the home page text and llms.txt. */
function docLinks(): DocLink[] {
  return [
    ...LANGS.map((l) => ({
      lang: l,
      title: SITE_TEXT[l].title,
      path: `${l}/`,
      description: SITE_TEXT[l].description,
    })),
    ...PAGES.map((p) => ({
      lang: 'en' as const,
      title: p.title,
      path: helpPath(p.id),
      description: summary(p.blocks),
    })),
  ];
}

/**
 * The home page text (docs/home.md and a list of every page) that index.html carries in its root
 * for readers without JavaScript: search engines and AI crawlers read it, the editor replaces it.
 */
export async function renderHome(home: string): Promise<string> {
  const ctx: Context = { lang: 'en', up: './', file: 'docs/home.md', figures: {} };
  const body = await blocks(parseMarkdown(home), ctx);
  const docs = docLinks()
    .map((d) => {
      const lang = d.lang === 'en' ? '' : ` lang="${d.lang}"`;
      return `<li${lang}><a href="${esc(ctx.up + d.path)}"${d.lang === 'en' ? '' : ` hreflang="${d.lang}"`}>${prose(d.title, d.lang)}</a>: ${prose(d.description, d.lang)}</li>`;
    })
    .join('');
  return `<main class="static-home">${body.join('')}<h2 id="documentation">Documentation</h2><ul>${docs}</ul></main>`;
}

/**
 * llms.txt (llmstxt.org): the home page text as Markdown with absolute links, its first paragraph
 * as the summary, then every page of the site.
 */
function llmsTxt(input: SiteInput): string {
  const abs = (target: string) => new URL(href(target, './'), input.siteUrl).href;
  const md = input.home
    .replace(/\r\n?/g, '\n')
    .replace(/\]\(([^)\s]+)\)/g, (_, target: string) => `](${abs(target)})`);
  const [title = '# GrafcetMaker', intro = '', ...rest] = md.trim().split(/\n{2,}/);
  const docs = docLinks()
    .map((d) => `- [${d.title}](${abs(d.path)}): ${d.description}`)
    .join('\n');
  return `${[title, `> ${intro.replace(/\n/g, ' ')}`, ...rest, '## Documentation', docs].join('\n\n')}\n`;
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
  const help = PAGES.map(
    (p) => `  <url>
    <loc>${esc(siteUrl + helpPath(p.id))}</loc>
  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${esc(siteUrl)}</loc>
  </url>
${[...guides, ...help].join('\n')}
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
  for (const page of PAGES)
    files.push({ fileName: `${helpPath(page.id)}index.html`, source: await helpPage(page, input) });
  files.push({ fileName: 'sitemap.xml', source: sitemap(input.siteUrl) });
  files.push({ fileName: 'robots.txt', source: robots(input.siteUrl) });
  files.push({ fileName: 'llms.txt', source: llmsTxt(input) });
  return files;
}
