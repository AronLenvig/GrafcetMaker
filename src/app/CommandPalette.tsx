import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMMANDS, formatKeys, type Command } from '@/editor/commands/registry';
import { setActiveGrafcet } from '@/editor/commands/edit';
import { useDoc } from '@/editor/store/document';
import { ui, useUi } from '@/editor/store/uiStore';
import { SearchIcon } from './ui/icons';
import { cx } from './ui/primitives';

interface Entry {
  key: string;
  label: string;
  group: string;
  keys?: string;
  run: () => void;
}

/** Every word of the query must occur in the label (case-insensitive); earlier matches rank higher. */
function score(label: string, query: string): number {
  const l = label.toLowerCase();
  let total = 0;
  for (const word of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    const i = l.indexOf(word);
    if (i < 0) return -1;
    total += i;
  }
  return total;
}

/** Ctrl/Cmd+K: run any command or jump to a grafcet by typing. */
export function CommandPalette() {
  const { t } = useTranslation();
  const open = useUi((s) => s.paletteOpen);
  const order = useDoc((s) => s.project.grafcetOrder);
  const grafcets = useDoc((s) => s.project.grafcets);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    if (!open) return [];
    const cmds = COMMANDS.filter((c: Command) => !c.hidden && (!c.enabled || c.enabled())).map(
      (c) => ({
        key: c.id,
        label: t(`commands.${c.label}` as 'commands.file.new'),
        group: t(`commands.groups.${c.group}`),
        keys: c.keys?.[0] ? formatKeys(c.keys[0]) : undefined,
        run: () => void c.run(),
      }),
    );
    const tabs = order.flatMap((gid) => {
      const g = grafcets[gid];
      return g
        ? [
            {
              key: `goto:${gid}`,
              label: t('palette.goto', { name: g.name }),
              group: t('commands.groups.navigate'),
              run: () => setActiveGrafcet(gid),
            },
          ]
        : [];
    });
    return [...cmds, ...tabs];
  }, [open, order, grafcets, t]);

  const results = useMemo(() => {
    if (!query.trim()) return entries;
    return entries
      .map((e) => ({ e, s: score(`${e.group} ${e.label}`, query) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((x) => x.e);
  }, [entries, query]);

  const close = () => {
    ui.set({ paletteOpen: false });
    setQuery('');
    setActive(0);
  };
  const runEntry = (e: Entry | undefined) => {
    if (!e) return;
    close();
    // Let the dialog close (and focus return) before running, so commands can open their own UI.
    requestAnimationFrame(() => e.run());
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? ui.set({ paletteOpen: true }) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content className="fixed top-[15vh] left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface text-text shadow-pop">
          <Dialog.Title className="sr-only">{t('palette.title')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('palette.description')}</Dialog.Description>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <SearchIcon size={16} className="text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(results.length - 1, a + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  runEntry(results[active]);
                }
              }}
              placeholder={t('palette.placeholder')}
              aria-label={t('palette.title')}
              aria-controls="palette-list"
              aria-activedescendant={results[active] ? `palette-${results[active].key}` : undefined}
              role="combobox"
              aria-expanded
              className="h-11 flex-1 bg-transparent outline-none"
            />
          </div>
          <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1">
            {results.length === 0 && <li className="px-3 py-2 text-muted">{t('palette.empty')}</li>}
            {results.map((e, i) => (
              <li
                key={e.key}
                id={`palette-${e.key}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => runEntry(e)}
                className={cx(
                  'flex cursor-default items-center gap-3 rounded px-3 py-1.5',
                  i === active && 'bg-accent-soft',
                )}
              >
                <span className="w-20 shrink-0 text-xs text-muted">{e.group}</span>
                <span className="flex-1">{e.label}</span>
                {e.keys && <kbd className="font-mono text-xs text-muted">{e.keys}</kbd>}
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
