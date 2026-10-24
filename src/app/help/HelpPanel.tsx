import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, BookIcon, ChevronRightIcon, CloseIcon, SearchIcon } from '../ui/icons';
import { IconButton } from '../ui/primitives';
import { Blocks } from './MarkdownView';
import { closeHelp, HELP_HOME, openHelp, useHelp } from './helpStore';
import { useLanguage } from '@/i18n';
import { helpPages, ORDER, searchHelp } from './pages';

function Results({ query }: { query: string }) {
  const { t } = useTranslation();
  const language = useLanguage((s) => s.language);
  const hits = useMemo(() => searchHelp(helpPages(language).pages, query), [language, query]);
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
  const { pages, byId: pageById } = helpPages(useLanguage((s) => s.language));
  const page = pageById.get(pageId) ?? pageById.get(HELP_HOME) ?? pages[0];
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
      className="flex h-full min-h-0 flex-col bg-surface"
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
