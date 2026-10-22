import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { EXPORT_FONT_FAMILY, grafcetToSvg } from '@/core/io/svgExport';
import { useTheme } from '@/theme/theme';
import { currentThemePalette } from '../export/exporters';
import { usePrefs } from '../prefs';
import { cx } from '../ui/primitives';
import { FIGURES } from './figures';
import { openHelp, useHelp } from './helpStore';
import type { Block, Inline } from './markdown';

/* Rendering of parsed Markdown (help pages, changelog): React elements only, never HTML. */

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

export function Blocks({ blocks }: { blocks: Block[] }) {
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
