/**
 * The public website around the app, rendered at build time (vite.config.ts): the editor's page
 * in each language at <lang>/index.html (index.html with the language's texts), the GRAFCET guide
 * at <lang>/guide/, the help pages at <lang>/help/, the home page text that
 * index.html carries for readers without JavaScript, and sitemap.xml, robots.txt and llms.txt.
 * Pages are plain HTML and CSS (no JavaScript but the theme bootstrap), bundled with the app so
 * they work offline and on-premise. Text comes from Markdown and is escaped; no HTML is injected.
 */
import { EXAMPLES, type ExampleId } from '@/app/examples/examples';
import { FIGURES } from '@/app/help/figures';
import { inlineText, parseMarkdown, type Block, type Inline } from '@/app/help/markdown';
import { helpPages, type HelpPage } from '@/app/help/pages';
import { SOURCE_URL } from '@/app/source';
import { flagSvg } from '@/app/ui/flags';
import { encodeTextHash } from '@/core/io/grafcetText';
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
  /** Markdown of the home page text by language (docs/home/<lang>.md). */
  homes: Partial<Record<string, string>>;
  /** Markdown of the guide for AI assistants (docs/ai.md), published as ai.txt. */
  ai: string;
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

/** The brand mark: an initial step and its transition in an outlined tile, colored by site.css. */
const LOGO = `<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false"><rect class="tile" x="1" y="1" width="30" height="30" rx="7"/><g fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="5" width="14" height="14"/><rect x="12.5" y="8.5" width="7" height="7"/><path d="M16 19v8"/></g><rect x="11.5" y="22" width="9" height="2.5" fill="currentColor"/></svg>`;

/** The chevron of the language button. */
const CHEVRON = `<svg class="chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Published paths, from the site root. The root itself is the editor in the visitor's language.
/** The editor in a language. */
const appPath = (lang: Lang) => `${lang}/`;
const guidePath = (lang: Lang) => `${lang}/guide/`;
const helpPath = (lang: Lang, id: string) => `${lang}/help/${id === 'index' ? '' : `${id}/`}`;

/** From a page at `path` back to the site root. */
const upFrom = (path: string) => '../'.repeat(path.split('/').filter(Boolean).length);

const helpCenter = (lang: Lang) => helpPages(lang).byId.get('index')?.title ?? 'Help center';

/** The language versions of a page for search engines; the English one is the x-default. */
const hreflang = (siteUrl: string, path: (l: Lang) => string) => [
  ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(siteUrl + path(l))}" />`),
  `<link rel="alternate" hreflang="x-default" href="${esc(siteUrl + path(DEFAULT_LANG))}" />`,
];

/**
 * The language of the page as one flag button beside the brand, opening the list of languages
 * (flag and name) for the same page. A <details> element: the pages have no JavaScript.
 */
function languageMenu(lang: Lang, up: string, path: (l: Lang) => string): string {
  const text = SITE_TEXT[lang];
  const items = LANGS.map(
    (l) =>
      `<li><a href="${up}${path(l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="page"' : ''}>${flagSvg(l, 'flag')}<span>${esc(SITE_TEXT[l].language)}</span></a></li>`,
  ).join('');
  const label = `${text.languages}: ${text.language}`;
  return `<details class="lang"><summary aria-label="${esc(label)}" title="${esc(label)}">${flagSvg(lang, 'flag')}${CHEVRON}</summary><ul>${items}</ul></details>`;
}

/** The same page in the other languages, as flags named on hover. */
const languageLinks = (lang: Lang, up: string, path: (l: Lang) => string) =>
  LANGS.map(
    (l) =>
      `<a href="${up}${path(l)}" hreflang="${l}" lang="${l}" title="${esc(SITE_TEXT[l].language)}" aria-label="${esc(SITE_TEXT[l].language)}"${l === lang ? ' aria-current="page"' : ''}>${flagSvg(l, 'flag')}</a>`,
  ).join('');

/**
 * Links of the Markdown sources: `app:` and `app:#help/…` lead into the editor and
 * `page.md#anchor` to a help page, both in the same language; the rest stays as written. `up`
 * leads from the page to the site root.
 */
function href(target: string, up: string, lang: Lang): string {
  if (target.startsWith('app:')) return up + appPath(lang) + target.slice(4);
  const help = /^(?:\.\/)?([\w-]+)\.md(#[\w-]+)?$/.exec(target);
  return help ? up + helpPath(lang, help[1]!) + (help[2] ?? '') : target;
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
          return `<a href="${esc(href(x.href, ctx.up, ctx.lang))}">${inline(x.c, ctx)}</a>`;
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
  const link = ctx.up + appPath(ctx.lang) + (await encodeShareHash(project));
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
  /** The page in each language (the language menu beside the brand). */
  path: (lang: Lang) => string;
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
      <a class="brand" href="${f.up}${appPath(f.lang)}">${LOGO}<span>Grafcet<span class="maker">Maker</span></span></a>
      ${languageMenu(f.lang, f.up, f.path)}
      <a class="button outline open" href="${f.up}${appPath(f.lang)}">${esc(text.openEditor)}</a>
    </header>
    <main id="main">
      ${f.main}
    </main>
    <footer class="foot">
      <p>${esc(text.footer)}</p>
      <p>${f.links} · <a href="${SOURCE_URL}">GitHub</a></p>
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
  const up = upFrom(guidePath(lang));
  const ctx: Context = { lang, up, file: `docs/guide/${lang}.md`, figures: guideFigures(lang) };
  const body = await blocks(
    parsed.filter((b) => b !== h1),
    ctx,
  );
  const toc = h2s(parsed)
    .map((b) => `<li><a href="#${esc(b.id)}">${inline(b.c, ctx)}</a></li>`)
    .join('');

  const url = input.siteUrl + guidePath(lang);
  const updated = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${text.updated}T00:00:00Z`),
  );
  const alternates = hreflang(input.siteUrl, guidePath);
  const languages = languageLinks(lang, up, guidePath);
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
          {
            '@type': 'ListItem',
            position: 1,
            name: 'GrafcetMaker',
            item: input.siteUrl + appPath(lang),
          },
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
      path: guidePath,
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
      links: `<a href="${up}${appPath(lang)}">${esc(text.openEditor)}</a> · <a href="${up}${helpPath(lang, 'index')}">${esc(helpCenter(lang))}</a> · ${languages}`,
    },
    input,
  );
}

/** A page of the in-app help (docs/help), published for search engines and visitors. */
async function helpPage(lang: Lang, page: HelpPage, input: SiteInput): Promise<string> {
  const text = SITE_TEXT[lang];
  const index = page.id === 'index';
  const path = helpPath(lang, page.id);
  const up = upFrom(path);
  const file = `docs/help/${lang === 'en' ? '' : `${lang}/`}${page.id}.md`;
  const ctx: Context = { lang, up, file, figures: FIGURES };
  const body = await blocks(page.blocks, ctx);
  const center = helpCenter(lang);
  const pages = helpPages(lang)
    .pages.map((p) => {
      const current = p.id === page.id;
      const sections = current
        ? h2s(page.blocks)
            .map((b) => `<li><a href="#${esc(b.id)}">${inline(b.c, ctx)}</a></li>`)
            .join('')
        : '';
      return `<li><a href="${up}${helpPath(lang, p.id)}"${current ? ' aria-current="page"' : ''}>${esc(p.title)}</a>${sections && `<ol>${sections}</ol>`}</li>`;
    })
    .join('');

  const url = input.siteUrl + path;
  const title = `${index ? center : page.title} | GrafcetMaker`;
  const description = summary(page.blocks);
  const alternates = hreflang(input.siteUrl, (l) => helpPath(l, page.id));
  const languages = languageLinks(lang, up, (l) => helpPath(l, page.id));
  const crumbs = [
    { name: 'GrafcetMaker', item: input.siteUrl + appPath(lang) },
    { name: center, item: input.siteUrl + helpPath(lang, 'index') },
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
      alternates,
      path: (l) => helpPath(l, page.id),
      structured,
      main: `<article class="layout">
        <header class="intro">
          <h1>${esc(page.title)}</h1>
        </header>
        <nav class="toc" aria-labelledby="toc-title">
          <h2 id="toc-title">${esc(center)}</h2>
          <ol>${pages}</ol>
        </nav>
        <div class="text">
          ${body.join('\n          ')}
        </div>
      </article>`,
      links: `<a href="${up}${appPath(lang)}">${esc(text.openEditor)}</a> · <a href="${up}${guidePath(lang)}">${esc(text.guide)}</a> · <a href="${up}${helpPath(lang, 'index')}">${esc(center)}</a> · ${languages}`,
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

/** The guide in every language and the help in one, for the home page text and llms.txt. */
function docLinks(lang: Lang): DocLink[] {
  return [
    ...LANGS.map((l) => ({
      lang: l,
      title: SITE_TEXT[l].title,
      path: guidePath(l),
      description: SITE_TEXT[l].description,
    })),
    ...helpPages(lang).pages.map((p) => ({
      lang,
      title: p.title,
      path: helpPath(lang, p.id),
      description: summary(p.blocks),
    })),
  ];
}

/**
 * The home page text (docs/home/<lang>.md and a list of the pages) that the editor's page carries
 * in its root for readers without JavaScript: search engines and AI crawlers read it, the editor
 * replaces it. Links are from the site root: the editor's pages pin it with <base>.
 */
export async function renderHome(home: string, lang: Lang): Promise<string> {
  const ctx: Context = { lang, up: './', file: `docs/home/${lang}.md`, figures: {} };
  const body = await blocks(parseMarkdown(home), ctx);
  const docs = docLinks(lang)
    .map((d) => {
      const other = d.lang === lang ? '' : ` lang="${d.lang}"`;
      return `<li${other}><a href="${esc(ctx.up + d.path)}"${other && ` hreflang="${d.lang}"`}>${prose(d.title, d.lang)}</a>: ${prose(d.description, d.lang)}</li>`;
    })
    .join('');
  return `<main class="static-home">${body.join('')}<h2 id="documentation">${esc(SITE_TEXT[lang].documentation)}</h2><ul>${docs}</ul></main>`;
}

/**
 * The editor's page in each language (<lang>/index.html), made from the built index.html: one
 * folder down (<base>), with the language's texts for search results, link previews and readers
 * without JavaScript. The English texts must be index.html's own, word for word.
 */
export async function appPages(
  html: string,
  input: Pick<SiteInput, 'siteUrl' | 'homes'>,
): Promise<SiteFile[]> {
  const swap = (page: string, from: string, to: string) => {
    if (!page.includes(from))
      throw new Error(`index.html: "${from}" not found; keep it in step with src/site/locales.ts`);
    return page.replaceAll(from, to);
  };
  const en = SITE_TEXT.en;
  const files: SiteFile[] = [];
  for (const lang of LANGS) {
    const text = SITE_TEXT[lang];
    const home = input.homes[lang];
    if (home === undefined) throw new Error(`docs/home/${lang}.md is missing`);
    const url = input.siteUrl + appPath(lang);
    let page = swap(html, '<html lang="en">', `<html lang="${lang}">`);
    page = swap(page, '<base href="./" />', '<base href="../" />');
    page = swap(
      page,
      `<link rel="canonical" href="${input.siteUrl}" />`,
      `<link rel="canonical" href="${url}" />`,
    );
    page = swap(
      page,
      `<meta property="og:url" content="${input.siteUrl}" />`,
      `<meta property="og:url" content="${url}" />`,
    );
    for (const key of ['appTitle', 'appDescription', 'ogTitle', 'ogDescription'] as const)
      page = swap(page, esc(en[key]), esc(text[key]));
    const body = await renderHome(home, lang);
    page = page.replace(/<main class="static-home">[\s\S]*?<\/main>/, () => body);
    files.push({ fileName: `${appPath(lang)}index.html`, source: page });
  }
  return files;
}

/**
 * ai.txt: how an AI assistant writes a chart as GRAFCET text and hands it over as a link
 * (docs/ai.md), with the site's address, and the link of its last example made from that example.
 */
function aiTxt(input: SiteInput): string {
  const blocks = [...input.ai.matchAll(/```grafcet\n([\s\S]*?)```/g)];
  const example = blocks[blocks.length - 1]?.[1];
  if (!example) throw new Error('docs/ai.md: no ```grafcet example');
  return input.ai
    .replaceAll('{{exampleLink}}', encodeTextHash(example))
    .replaceAll('{{site}}', input.siteUrl);
}

/**
 * What llms.txt says first: assistants can make charts for the people they help, and when to (the
 * list of docs/ai.md, which ai.txt carries too).
 */
const AI_SECTION = (siteUrl: string, ai: string) => {
  const when = /## When to use GrafcetMaker\n\n([\s\S]*?)\n\n## /.exec(ai)?.[1];
  if (!when) throw new Error('docs/ai.md: no "## When to use GrafcetMaker" section');
  return `## For AI assistants\n\nYou can make a GRAFCET chart for the person you are helping and give it to them as a link that opens it in GrafcetMaker: read [ai.txt](${siteUrl}ai.txt) for the text format and the link.\n\n${when}`;
};

/**
 * llms.txt (llmstxt.org): the home page text as Markdown with absolute links, its first paragraph
 * as the summary, how assistants make charts (ai.txt), then every page of the site.
 */
function llmsTxt(input: SiteInput): string {
  const abs = (target: string) => new URL(href(target, './', 'en'), input.siteUrl).href;
  const md = (input.homes.en ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\]\(([^)\s]+)\)/g, (_, target: string) => `](${abs(target)})`);
  const [title = '# GrafcetMaker', intro = '', ...blocks] = md.trim().split(/\n{2,}/);
  // The home page's own section for assistants (written for people) gives way to AI_SECTION.
  const own = blocks.indexOf('## For AI assistants');
  const end = blocks.findIndex((b, i) => i > own && b.startsWith('## '));
  const rest =
    own < 0 ? blocks : [...blocks.slice(0, own), ...blocks.slice(end < 0 ? blocks.length : end)];
  const docs = docLinks('en')
    .map((d) => `- [${d.title}](${abs(d.path)}): ${d.description}`)
    .join('\n');
  const source = `- [GitHub](${SOURCE_URL}): the source code (MIT), issues and self-hosting.`;
  const parts = [
    title,
    `> ${intro.replace(/\n/g, ' ')}`,
    AI_SECTION(input.siteUrl, input.ai),
    ...rest,
    '## Documentation',
    docs,
  ];
  return `${[...parts, '## Source code', source].join('\n\n')}\n`;
}

/** One page of the sitemap with its language versions; `xDefault` is for other languages. */
function sitemapUrl(loc: string, versions: string[], xDefault: string, lastmod?: string): string {
  const links = [...LANGS.map((l, i) => [l, versions[i]!]), ['x-default', xDefault]].map(
    ([l, u]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(u!)}"/>`,
  );
  return `  <url>
    <loc>${esc(loc)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}${links.join('\n')}
  </url>`;
}

function sitemap(siteUrl: string): string {
  /** A page in every language; the root of the site is the editor's x-default. */
  const page = (path: (l: Lang) => string, xDefault: string, lastmod?: (l: Lang) => string) => {
    const versions = LANGS.map((l) => siteUrl + path(l));
    return LANGS.map((l, i) => sitemapUrl(versions[i]!, versions, xDefault, lastmod?.(l)));
  };
  const editors = LANGS.map((l) => siteUrl + appPath(l));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[
  sitemapUrl(siteUrl, editors, siteUrl),
  ...page(appPath, siteUrl),
  ...page(guidePath, siteUrl + guidePath(DEFAULT_LANG), (l) => SITE_TEXT[l].updated),
  ...helpPages(DEFAULT_LANG).pages.flatMap((p) =>
    page((l) => helpPath(l, p.id), siteUrl + helpPath(DEFAULT_LANG, p.id)),
  ),
].join('\n')}
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
    files.push({
      fileName: `${guidePath(lang)}index.html`,
      source: await guidePage(lang, src, input),
    });
  }
  for (const lang of LANGS)
    for (const page of helpPages(lang).pages)
      files.push({
        fileName: `${helpPath(lang, page.id)}index.html`,
        source: await helpPage(lang, page, input),
      });
  files.push({ fileName: 'sitemap.xml', source: sitemap(input.siteUrl) });
  files.push({ fileName: 'robots.txt', source: robots(input.siteUrl) });
  files.push({ fileName: 'llms.txt', source: llmsTxt(input) });
  files.push({ fileName: 'ai.txt', source: aiTxt(input) });
  return files;
}
