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

/** What src/site/render.ts exports (the config is type-checked apart from src). */
interface SiteModule {
  buildSite(input: {
    siteUrl: string;
    guides: Record<string, string>;
    themeScript: string;
    css: string;
  }): Promise<{ fileName: string; source: string }[]>;
}

/**
 * The public website around the app: SITE_URL in index.html, and at build time the static GRAFCET
 * guide in each language (docs/guide/<lang>.md rendered by src/site), sitemap.xml and robots.txt.
 */
function website(): Plugin {
  return {
    name: 'grafcetmaker-website',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('__SITE_URL__', SITE_URL),
    },
    async generateBundle() {
      const css = this.emitFile({
        type: 'asset',
        name: 'site.css',
        source: `${read('./src/theme/tokens.css')}\n${read('./src/site/site.css')}`,
      });
      const guides = Object.fromEntries(
        readdirSync(new URL('./docs/guide', import.meta.url))
          .filter((f) => f.endsWith('.md'))
          .map((f) => [f.slice(0, -3), read(`./docs/guide/${f}`)]),
      );
      const { module } = await runnerImport<SiteModule>('/src/site/render.ts', {
        configFile: false,
        root,
        logLevel: 'error',
        resolve: { alias },
      });
      const files = await module.buildSite({
        siteUrl: SITE_URL,
        guides,
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
        // The link-preview image is for other sites, never shown in the app.
        globIgnores: ['og-image.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        // The guide pages are precached as themselves; never answer them with the app.
        navigateFallbackDenylist: [/\/(?:en|fr|de|es)\/(?:index\.html)?$/],
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
