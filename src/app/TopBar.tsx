import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { runCommand } from '@/editor/commands/registry';
import { doc, useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { isDirty } from '@/editor/store/documentStore';
import { useProblems } from '@/editor/validation/problems';
import { SeverityIcon } from '@/panels/ProblemsPanel';
import { LiveIsland } from './collab/LiveIsland';
import { MenuDrawer } from './menus';
import { useSession } from './persistence/session';
import { showBottomTab } from './prefs';
import { MenuIcon, PlayIcon } from './ui/icons';
import { IconButton } from './ui/primitives';

/** The page title of index.html, written for search results. */
const SITE_TITLE = document.title;

/** Project name; double-click (or Enter / F2 when focused) renames it in place. */
export function Title() {
  const { t } = useTranslation();
  const name = useDoc((s) => s.project.name);
  const dirty = useDoc(isDirty);
  const fileName = useSession((s) => s.fileName);
  // A first visit (what search engines see): the starting project, neither opened nor drawn.
  const fresh = useSession((s) => s.fresh);
  const untouched = useDoc((s) => s.past.length === 0);
  const firstVisit = fresh && untouched;
  const locked = useUi((s) => s.mode === 'simulate');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = firstVisit ? SITE_TITLE : `${dirty ? '● ' : ''}${name} — ${t('app.name')}`;
  }, [dirty, firstVisit, name, t]);
  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const start = () => {
    if (locked) return;
    setDraft(name);
    setEditing(true);
  };
  const finish = (save: boolean) => {
    setEditing(false);
    const next = draft.trim();
    if (save && next && next !== name)
      doc.execute('history.editProject', (p) => void (p.name = next.slice(0, 200)));
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5" title={fileName ?? undefined}>
      <h1 className="sr-only">
        {t('app.heading', { name: firstVisit ? t('app.tagline') : name })}
      </h1>
      {dirty && (
        <span className="text-accent" aria-label={t('file.unsaved')} title={t('file.unsaved')}>
          ●
        </span>
      )}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          aria-label={t('props.project.name')}
          aria-invalid={!draft.trim()}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') finish(true);
            if (e.key === 'Escape') finish(false);
          }}
          className="gm-input gm-input-sm w-64 text-center font-medium"
          style={{ width: `${Math.max(16, draft.length + 4)}ch` }}
        />
      ) : (
        <button
          type="button"
          onDoubleClick={start}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'F2') {
              e.preventDefault();
              e.stopPropagation();
              start();
            }
          }}
          title={t('file.renameHint')}
          aria-label={t('file.renameProject', { name })}
          className="max-w-full cursor-text truncate rounded px-1.5 py-0.5 font-medium hover:bg-surface-2"
        >
          {name}
        </button>
      )}
    </div>
  );
}

export function ProblemsIndicator() {
  const { t } = useTranslation();
  const counts = useProblems((s) => s.counts);
  return (
    <button
      type="button"
      onClick={() => showBottomTab('problems')}
      title={t('problems.open')}
      aria-label={t('problems.summary', { errors: counts.error, warnings: counts.warning })}
      className="flex h-7 items-center gap-2 rounded-md px-2 tabular-nums hover:bg-surface-2"
    >
      <span className="flex items-center gap-1">
        <SeverityIcon severity="error" size={14} />
        {counts.error}
      </span>
      <span className="flex items-center gap-1">
        <SeverityIcon severity="warning" size={14} />
        {counts.warning}
      </span>
    </button>
  );
}

/** Phones: the menu drawer, the project name, problems and Simulate. */
export function TopBar() {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  return (
    <header className="shrink-0 border-b border-border bg-surface pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <div className="flex h-11 items-center gap-1 px-1">
        <IconButton label={t('menu.open')} className="h-10 w-10" onClick={() => setMenu(true)}>
          <MenuIcon size={20} />
        </IconButton>
        <div className="flex min-w-0 flex-1 justify-center">
          <Title />
        </div>
        <LiveIsland compact />
        <ProblemsIndicator />
        <IconButton
          label={t('simulation.simulateLabel')}
          className="h-10 w-10 text-success"
          onClick={() => runCommand('sim.toggle')}
        >
          <PlayIcon size={18} />
        </IconButton>
      </div>
      <MenuDrawer open={menu} onOpenChange={setMenu} />
    </header>
  );
}
