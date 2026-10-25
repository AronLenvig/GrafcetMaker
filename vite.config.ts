import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, runnerImport, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const root = fileURLToPath(new URL('.', import.meta.url));
const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/**
 * Absolute URL of the public website, for canonical links, the sitemap and link previews. Public
 * mirrors build with their own, e.g. `SITE_URL=https://grafcet.example.com/ npm run build`.
 */
const SITE_URL = (process.env.SITE_URL || 'https://grafcet.org/').replace(/\/*$/, '/');

/**
 * Adds a strict Content-Security-Policy <meta> to a built page. Inline scripts (only the no-flash
 * theme bootstrap) are allowed by hash, never by 'unsafe-inline'; JSON-LD data blocks never run.
 */
function withCsp(html: string): string {
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) =>
      `'sha256-${createHash('sha256')
        .update(m[1] ?? '')
        .digest('base64')}'`,
  );
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
  return html.replace(
    /<meta charset="UTF-8" \/>/,
    `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
  );
}

function contentSecurityPolicy(): Plugin {
  return {
    name: 'grafcetmaker-csp',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: withCsp },
  };
}

type SiteFile = { fileName: string; source: string };

/** What src/site/render.ts exports (the config is type-checked apart from src). */
interface SiteModule {
  renderHome(home: string, lang: string): Promise<string>;
  appPages(
    html: string,
    input: { siteUrl: string; homes: Record<string, string> },
  ): Promise<SiteFile[]>;
  buildSite(input: {
    siteUrl: string;
    guides: Record<string, string>;
    homes: Record<string, string>;
    themeScript: string;
    css: string;
  }): Promise<SiteFile[]>;
}

/** Markdown files of a docs folder by name: docs/guide/<lang>.md, docs/home/<lang>.md. */
const markdownIn = (dir: string) =>
  Object.fromEntries(
    readdirSync(new URL(`./docs/${dir}`, import.meta.url))
      .filter((f) => f.endsWith('.md'))
      .map((f) => [f.slice(0, -3), read(`./docs/${dir}/${f}`)]),
  );

/**
 * The public website around the app: SITE_URL in index.html, and at build time the home page text
 * for readers without JavaScript (docs/home/<lang>.md, in the root element of index.html), the
 * editor's page in each language, the static GRAFCET guide (docs/guide/<lang>.md), the help pages
 * (docs/help), sitemap.xml, robots.txt and llms.txt, all rendered by src/site.
 */
function website(): Plugin[] {
  let site: Promise<SiteModule> | undefined;
  // src/site imports the app's modules, so it is loaded through Vite, once per build.
  const loadSite = () =>
    (site ??= runnerImport<SiteModule>('/src/site/render.ts', {
      configFile: false,
      root,
      logLevel: 'error',
      resolve: { alias },
    }).then((r) => r.module));
  const sitePlugin: Plugin = {
    name: 'grafcetmaker-website',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const page = html.replaceAll('__SITE_URL__', SITE_URL);
        // While developing, the root stays empty (the editor replaces the text anyway), and
        // /<lang>/ gets the base of the built <lang>/index.html.
        if (ctx.server)
          return /^\/[a-z]{2}\/(?:index\.html)?(?:[?#]|$)/.test(ctx.originalUrl ?? '')
            ? page.replace('<base href="./" />', '<base href="../" />')
            : page;
        const home = await (await loadSite()).renderHome(read('./docs/home/en.md'), 'en');
        return page.replace('<!--static-home-->', () => home);
      },
    },
    async generateBundle() {
      const css = this.emitFile({
        type: 'asset',
        name: 'site.css',
        source: `${read('./src/theme/tokens.css')}\n${read('./src/site/site.css')}`,
      });
      const files = await (
        await loadSite()
      ).buildSite({
        siteUrl: SITE_URL,
        guides: markdownIn('guide'),
        homes: markdownIn('home'),
        themeScript: /<script>([\s\S]*?)<\/script>/.exec(read('./index.html'))?.[1] ?? '',
        css: this.getFileName(css),
      });
      for (const { fileName, source } of files)
        this.emitFile({
          type: 'asset',
          fileName,
          source: fileName.endsWith('.html') ? withCsp(source) : source,
        });
    },
  };
  // After Vite has written index.html (scripts, styles, CSP): the editor's page in each language.
  const appPagesPlugin: Plugin = {
    name: 'grafcetmaker-app-pages',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') throw new Error('index.html is not in the bundle');
      const files = await (
        await loadSite()
      ).appPages(String(index.source), { siteUrl: SITE_URL, homes: markdownIn('home') });
      for (const { fileName, source } of files) this.emitFile({ type: 'asset', fileName, source });
    },
  };
  return [sitePlugin, appPagesPlugin];
}

const pkg = JSON.parse(read('./package.json')) as { version: string };

/**
 * Live collaboration while developing: run the relay (`npm run relay`), then start the dev or
 * preview server with GM_RELAY_URL=http://localhost:8081 so the app finds it at api/room.
 */
const relayUrl = process.env.GM_RELAY_URL;
const relayProxy = relayUrl ? { '/api/room': { target: relayUrl, ws: true } } : undefined;

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    contentSecurityPolicy(),
    website(),
    // Offline support: everything is precached; updates wait for the user (see src/app/pwa.ts).
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'GrafcetMaker',
        short_name: 'GrafcetMaker',
        description: 'GRAFCET (IEC 60848) editor and simulator',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        file_handlers: [
          {
            action: '.',
            accept: { 'application/json': ['.grafcet.json'] },
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // The link-preview image is for other sites, never shown in the app; the app has its own
        // help, so the help pages of the website are not kept offline.
        globIgnores: ['og-image.png', '*/help/**', '404.html'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // The editor's pages and the guide are precached as themselves. Any other address goes to
        // the server, whose 404 page leads to the editor: the editor's page answering there would
        // load nothing, its paths being relative.
        navigateFallback: null,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: { alias },
  worker: { format: 'es' },
  server: { proxy: relayProxy },
  preview: { proxy: relayProxy },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
});
