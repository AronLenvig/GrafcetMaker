import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EXPORT_FONT_FAMILY, grafcetToSvg } from '@/core/io/svgExport';
import { useTheme } from '@/theme/theme';
import { currentThemePalette } from '../export/exporters';
import { usePrefs } from '../prefs';
import { ArrowLeftIcon, BookIcon, ChevronRightIcon, CloseIcon, SearchIcon } from '../ui/icons';
import { cx, IconButton } from '../ui/primitives';
import { FIGURES } from './figures';
import { closeHelp, HELP_HOME, openHelp, useHelp } from './helpStore';
import type { Block, Inline } from './markdown';
import { ORDER, pageById, PAGES, searchHelp } from './pages';

/** A help diagram, drawn by the exporter in the colors of the current theme. */
function Figure({ id, caption }: { id: string; caption: string }) {
  const resolved = useTheme((s) => s.resolved);
  const textbook = usePrefs((s) => s.textbookNotation);
  const svg = useMemo(() => {
    const make = FIGURES[id];
    if (!make) return null;
    // resolved: the palette is read from the theme's CSS variables.
    void resolved;
    return grafcetToSvg(make(), {
      palette: { ...currentThemePalette(), background: null },
      textbook,
      fontFamily: EXPORT_FONT_FAMILY,
      margin: 14,
      title: caption,
    });
  }, [id, caption, resolved, textbook]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!svg) return;
    const u = URL.createObjectURL(new Blob([svg.svg], { type: 'image/svg+xml' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [svg]);
  if (!svg) return null;
  return (
    <figure className="my-4 flex flex-col items-center gap-1.5 rounded-md border border-border bg-canvas p-3">
      {url && (
        <img
          src={url}
          alt={caption}
          width={svg.box.width}
          height={svg.box.height}
          className="max-w-full"
        />
      )}
      {caption && <figcaption className="text-center text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}

function go(href: string): void {
  const m = /^(?:\.\/)?([\w-]+)\.md(?:#([\w-]+))?$/.exec(href);
  if (m) openHelp(m[1]!, m[2] ?? null);
  else if (href.startsWith('#')) {
    const { page } = useHelp.getState();
    openHelp(page, href.slice(1));
  }
}

function Inlines({ c }: { c: Inline[] }) {
  return (
    <>
      {c.map((x, i) => {
        switch (x.t) {
          case 'text':
            return <span key={i}>{x.v}</span>;
          case 'code':
            return (
              <code key={i} className="rounded bg-surface-2 px-1 py-px font-mono text-[0.92em]">
                {x.v}
              </code>
            );
          case 'kbd':
            return (
              <kbd key={i} className="gm-kbd">
                {x.v}
              </kbd>
            );
          case 'strong':
            return (
              <strong key={i} className="font-semibold">
                <Inlines c={x.c} />
              </strong>
            );
          case 'em':
            return (
              <em key={i}>
                <Inlines c={x.c} />
              </em>
            );
          case 'link':
            return /^https?:\/\//.test(x.href) ? (
              <a
                key={i}
                href={x.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent underline"
              >
                <Inlines c={x.c} />
              </a>
            ) : (
              <a
                key={i}
                href={`#help/${x.href.replace(/\.md(#|$)/, '$1').replace('#', '/')}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(x.href);
                }}
                className="text-accent underline"
              >
                <Inlines c={x.c} />
              </a>
            );
        }
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i): ReactNode => {
        switch (b.t) {
          case 'h': {
            const Tag = b.level === 1 ? 'h1' : b.level === 2 ? 'h2' : 'h3';
            return (
              <Tag
                key={i}
                id={`help-${b.id}`}
                className={cx(
                  'scroll-mt-3 font-semibold text-text',
                  b.level === 2 ? 'mt-6 mb-2 text-[15px]' : 'mt-4 mb-1.5 text-sm',
                )}
              >
                <Inlines c={b.c} />
              </Tag>
            );
          }
          case 'p':
            return (
              <p key={i} className="mb-3 leading-relaxed">
                <Inlines c={b.c} />
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = b.t;
            return (
              <List
                key={i}
                className={cx(
                  'mb-3 flex flex-col gap-1.5 pl-5 leading-relaxed',
                  b.t === 'ul' ? 'list-disc' : 'list-decimal',
                )}
              >
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inlines c={item} />
                  </li>
                ))}
              </List>
            );
          }
          case 'quote':
            return (
              <div
                key={i}
                className="mb-3 flex flex-col gap-1.5 rounded-md border-l-4 border-accent bg-accent-soft px-3 py-2 leading-relaxed"
              >
                {b.c.map((p, j) => (
                  <p key={j}>
                    <Inlines c={p} />
                  </p>
                ))}
              </div>
            );
          case 'code':
            return (
              <pre
                key={i}
                className="mb-3 overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs leading-relaxed"
              >
                {b.v}
              </pre>
            );
          case 'table':
            return (
              <div key={i} className="mb-3 overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-strong text-left">
                      {b.head.map((c, j) => (
                        <th key={j} className="px-2 py-1.5 font-semibold">
                          <Inlines c={c} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-b border-border align-top">
                        {r.map((c, k) => (
                          <td key={k} className="px-2 py-1.5">
                            <Inlines c={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'figure':
            return <Figure key={i} id={b.id} caption={b.caption} />;
        }
      })}
    </>
  );
}

function Results({ query }: { query: string }) {
  const { t } = useTranslation();
  const hits = useMemo(() => searchHelp(query), [query]);
  if (!hits.length) return <p className="text-muted">{t('help.noResults', { query })}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {hits.map((h) => (
        <li key={`${h.page}-${h.anchor ?? ''}`}>
          <button
            type="button"
            onClick={() => openHelp(h.page, h.anchor)}
            className="flex w-full flex-col items-start gap-0.5 rounded-md border border-border px-3 py-2 text-left hover:border-accent hover:bg-accent-soft"
          >
            <span className="text-xs text-muted">
              {h.pageTitle}
              {h.anchor && ` › ${h.title}`}
            </span>
            <span className="line-clamp-2 text-xs">{h.snippet}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Help center docked at the right: beginner guides, reference pages and search (F1). */
export default function HelpPanel() {
  const { t } = useTranslation();
  const { page: pageId, anchor } = useHelp();
  const [query, setQuery] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const page = pageById.get(pageId) ?? pageById.get(HELP_HOME) ?? PAGES[0];
  const index = page ? ORDER.indexOf(page.id) : -1;
  const prev = index > 0 ? pageById.get(ORDER[index - 1]!) : undefined;
  const next = index >= 0 ? pageById.get(ORDER[index + 1]!) : undefined;

  useEffect(() => {
    setQuery('');
    requestAnimationFrame(() => {
      const target = anchor ? document.getElementById(`help-${anchor}`) : null;
      if (target) target.scrollIntoView({ block: 'start' });
      else body.current?.scrollTo({ top: 0 });
    });
  }, [pageId, anchor]);

  return (
    <aside
      aria-label={t('help.panel')}
      className="flex h-full min-h-0 flex-col border-l border-border bg-surface"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !query) {
          e.stopPropagation();
          closeHelp();
        }
      }}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          {page && page.id !== HELP_HOME ? (
            <IconButton
              label={t('help.contents')}
              title={t('help.contents')}
              className="h-7 w-7"
              onClick={() => openHelp(HELP_HOME)}
            >
              <ArrowLeftIcon size={15} />
            </IconButton>
          ) : (
            <BookIcon size={16} className="mx-1.5 text-muted" />
          )}
          <h2 className="min-w-0 flex-1 truncate font-semibold">
            {query ? t('help.search') : (page?.title ?? '')}
          </h2>
          <IconButton
            label={t('help.close')}
            title={t('help.close')}
            className="h-7 w-7"
            onClick={closeHelp}
          >
            <CloseIcon size={15} />
          </IconButton>
        </div>
        <div className="relative">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.stopPropagation();
                setQuery('');
              }
            }}
            placeholder={t('help.searchPlaceholder')}
            aria-label={t('help.search')}
            className="gm-input gm-input-sm pl-8"
          />
        </div>
      </div>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px]">
        {query.trim() ? <Results query={query} /> : page && <Blocks blocks={page.blocks} />}
        {!query.trim() && (prev || next) && (
          <nav aria-label={t('help.pages')} className="mt-6 flex gap-2 border-t border-border pt-3">
            {prev && (
              <button
                type="button"
                onClick={() => openHelp(prev.id)}
                className="flex min-w-0 flex-1 flex-col items-start rounded-md border border-border px-3 py-2 text-left hover:border-accent"
              >
                <span className="text-xs text-muted">{t('help.previous')}</span>
                <span className="truncate">{prev.title}</span>
              </button>
            )}
            {next && (
              <button
                type="button"
                onClick={() => openHelp(next.id)}
                className="flex min-w-0 flex-1 flex-col items-end rounded-md border border-border px-3 py-2 text-right hover:border-accent"
              >
                <span className="flex items-center gap-1 text-xs text-muted">
                  {t('help.next')} <ChevronRightIcon size={12} />
                </span>
                <span className="truncate">{next.title}</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </aside>
  );
}
