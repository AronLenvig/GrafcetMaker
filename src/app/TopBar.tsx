import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKeys, getCommand, runCommand } from '@/editor/commands/registry';
import { doc, useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { isDirty } from '@/editor/store/documentStore';
import { useProblems } from '@/editor/validation/problems';
import { SeverityIcon } from '@/panels/ProblemsPanel';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { listRecent, type RecentEntry } from './persistence/db';
import { openRecent, useSession } from './persistence/session';
import { setPrefs, showBottomTab, usePrefs } from './prefs';
import { LogoIcon, PlayIcon, SearchIcon, SettingsIcon } from './ui/icons';
import {
  Button,
  IconButton,
  Menu,
  MenuCheckItem,
  MenuItem,
  MenuSeparator,
  SubMenu,
  Tip,
} from './ui/primitives';

function Item({ id, label }: { id: string; label?: string }) {
  const { t } = useTranslation();
  const cmd = getCommand(id);
  const keys = cmd.keys?.[0];
  return (
    <MenuItem
      keys={keys ? formatKeys(keys) : undefined}
      disabled={cmd.enabled ? !cmd.enabled() : false}
      onSelect={() => runCommand(id)}
    >
      {label ?? t(`commands.${cmd.label}` as 'commands.file.new')}
    </MenuItem>
  );
}

/** Undo/Redo items naming the change they act on. */
function UndoRedoItems() {
  const { t } = useTranslation();
  const undo = useDoc((s) => s.past[s.past.length - 1]?.label);
  const redo = useDoc((s) => s.future[0]?.label);
  const what = (label: string) => t(label as 'history.edit');
  return (
    <>
      <Item
        id="edit.undo"
        label={undo ? t('commands.edit.undoWhat', { what: what(undo) }) : undefined}
      />
      <Item
        id="edit.redo"
        label={redo ? t('commands.edit.redoWhat', { what: what(redo) }) : undefined}
      />
    </>
  );
}

function RecentMenu() {
  const { t } = useTranslation();
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  useEffect(() => {
    void listRecent().then(setRecent);
  }, []);
  return (
    <SubMenu label={t('commands.file.openRecent')} disabled={recent.length === 0}>
      {recent.map((r) => (
        <MenuItem key={r.id} onSelect={() => void openRecent(r)}>
          <span className="block max-w-72 truncate">{r.name}</span>
          {r.fileName && (
            <span className="block max-w-72 truncate text-xs text-muted">{r.fileName}</span>
          )}
        </MenuItem>
      ))}
    </SubMenu>
  );
}

/** Project name; double-click (or Enter / F2 when focused) renames it in place. */
function Title() {
  const { t } = useTranslation();
  const name = useDoc((s) => s.project.name);
  const dirty = useDoc(isDirty);
  const fileName = useSession((s) => s.fileName);
  const locked = useUi((s) => s.mode === 'simulate');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${name} — ${t('app.name')}`;
  }, [dirty, name, t]);
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
      <h1 className="sr-only">{t('app.heading', { name })}</h1>
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
          className="max-w-[40vw] cursor-text truncate rounded px-1.5 py-0.5 font-medium hover:bg-surface-2"
        >
          {name}
        </button>
      )}
      {fileName && !editing && (
        <span className="hidden truncate text-muted md:inline">— {fileName}</span>
      )}
    </div>
  );
}

function ProblemsIndicator() {
  const { t } = useTranslation();
  const counts = useProblems((s) => s.counts);
  return (
    <button
      type="button"
      onClick={() => showBottomTab('problems')}
      title={t('problems.open')}
      aria-label={t('problems.summary', { errors: counts.error, warnings: counts.warning })}
      data-tour="problems"
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

export function TopBar() {
  const { t } = useTranslation();
  const prefs = usePrefs();
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-2">
      <LogoIcon size={18} className="mx-1 text-text" />
      <nav aria-label={t('menu.label')} className="flex items-center">
        <Menu label={t('menu.file')}>
          <Item id="file.new" />
          <Item id="file.open" />
          <RecentMenu />
          <MenuSeparator />
          <Item id="file.save" />
          <Item id="file.saveAs" />
          <Item id="file.downloadCopy" />
          <MenuSeparator />
          <Item id="file.export" />
          <SubMenu label={t('commands.file.exportAs')}>
            <Item id="file.exportPdf" />
            <Item id="file.exportSvg" />
            <Item id="file.exportPng" />
            <Item id="file.exportWebp" />
            <MenuSeparator />
            <Item id="file.exportSt" />
            <Item id="file.exportXml" />
          </SubMenu>
          <Item id="file.copyPng" />
          <Item id="file.copySvg" />
          <SubMenu label={t('commands.file.variables')}>
            <Item id="file.importVariables" />
            <Item id="file.exportVariablesXlsx" />
            <Item id="file.exportVariablesCsv" />
          </SubMenu>
          <MenuSeparator />
          <Item id="file.localHistory" />
          <Item id="file.settings" />
        </Menu>
        <Menu label={t('menu.edit')}>
          <UndoRedoItems />
          <MenuSeparator />
          <MenuItem keys={formatKeys('Mod+X')} onSelect={() => runCommand('edit.cut')}>
            {t('commands.edit.cut')}
          </MenuItem>
          <MenuItem keys={formatKeys('Mod+C')} onSelect={() => runCommand('edit.copy')}>
            {t('commands.edit.copy')}
          </MenuItem>
          <MenuItem keys={formatKeys('Mod+V')} onSelect={() => runCommand('edit.paste')}>
            {t('commands.edit.paste')}
          </MenuItem>
          <Item id="edit.delete" />
          <Item id="edit.deleteNoHeal" />
          <MenuSeparator />
          <Item id="edit.selectAll" />
          <Item id="edit.rename" />
          <Item id="edit.toggleInitial" />
          <MenuSeparator />
          <Item id="insert.append" />
          <Item id="insert.action" />
          <Item id="insert.step" />
          <Item id="insert.grafcet" />
          <MenuSeparator />
          <Item id="insert.parallel" />
          <Item id="insert.alternative" />
          <Item id="insert.loop" />
          <Item id="insert.source" />
          <Item id="insert.sink" />
          <Item id="insert.macroStep" />
          <Item id="insert.enclosingStep" />
          <MenuSeparator />
          <Item id="arrange.layout" />
          <Item id="arrange.layoutSelection" />
          <Item id="arrange.renumber" />
        </Menu>
        <Menu label={t('menu.view')}>
          <Item id="view.zoomIn" />
          <Item id="view.zoomOut" />
          <Item id="view.zoomReset" />
          <Item id="view.fit" />
          <Item id="view.fitSelection" />
          <SubMenu label={t('split.menu')}>
            <Item id="view.splitRight" />
            <Item id="view.splitDown" />
            <Item id="view.focusOtherPane" />
            <Item id="view.swapPanes" />
            <Item id="view.closeSplit" />
          </SubMenu>
          <Item id="view.openChild" />
          <Item id="view.goToParent" />
          <MenuSeparator />
          <MenuCheckItem
            checked={prefs.textbookNotation}
            onCheckedChange={(v) => setPrefs({ textbookNotation: v })}
          >
            {t('commands.view.textbook')}
          </MenuCheckItem>
          <MenuCheckItem
            checked={prefs.showGrid}
            onCheckedChange={(v) => setPrefs({ showGrid: v })}
          >
            {t('commands.view.showGrid')}
          </MenuCheckItem>
          <MenuCheckItem
            checked={prefs.snapToGrid}
            onCheckedChange={(v) => setPrefs({ snapToGrid: v })}
          >
            {t('commands.view.snapToGrid')}
          </MenuCheckItem>
          <MenuCheckItem
            checked={prefs.showHints}
            onCheckedChange={(v) => setPrefs({ showHints: v })}
          >
            {t('commands.view.hints')}
          </MenuCheckItem>
          <MenuCheckItem
            checked={!prefs.leftCollapsed}
            onCheckedChange={(v) => setPrefs({ leftCollapsed: !v })}
          >
            {t('commands.view.showTools')}
          </MenuCheckItem>
          <MenuCheckItem
            checked={!prefs.rightCollapsed}
            onCheckedChange={(v) => setPrefs({ rightCollapsed: !v })}
          >
            {t('commands.view.showProperties')}
          </MenuCheckItem>
          <MenuSeparator />
          <Item id="view.showVariables" />
          <Item id="view.variableList" />
          <Item id="view.showProblems" />
          <Item id="view.palette" />
        </Menu>
        <Menu label={t('menu.simulate')}>
          <Item id="sim.toggle" label={t('commands.simulate.start')} />
          <MenuSeparator />
          <Item id="view.showSimulation" />
          <Item id="view.showChronogram" />
        </Menu>
        <Menu label={t('menu.help')}>
          <Item id="help.open" />
          <Item id="help.startScreen" />
          <Item id="help.tour" />
          <Item id="help.gettingStarted" />
          <Item id="help.basics" />
          <Item id="help.expressions" />
          <MenuSeparator />
          <Item id="help.shortcuts" />
          <Item id="help.feedback" />
          <Item id="help.whatsNew" />
          <Item id="help.about" />
        </Menu>
      </nav>
      <div className="mx-2 flex min-w-0 flex-1 justify-center">
        <Title />
      </div>
      <ProblemsIndicator />
      {/* Start the simulation (the simulation bar replaces this bar while it runs). */}
      <Tip label={t('commands.simulate.start')} keys="F5" side="bottom">
        <Button
          size="sm"
          aria-label={t('simulation.simulateLabel')}
          onClick={() => runCommand('sim.toggle')}
          className="gap-1.5"
        >
          <PlayIcon size={12} className="text-success" />
          {t('simulation.simulate')}
        </Button>
      </Tip>
      <Tip label={t('commands.view.palette')} keys={formatKeys('Mod+K')} side="bottom">
        <IconButton label={t('commands.view.palette')} onClick={() => runCommand('view.palette')}>
          <SearchIcon size={16} />
        </IconButton>
      </Tip>
      <ThemeSwitcher />
      <Tip label={t('commands.file.settings')} keys={formatKeys('Mod+,')} side="bottom">
        <IconButton label={t('commands.file.settings')} onClick={() => runCommand('file.settings')}>
          <SettingsIcon size={16} />
        </IconButton>
      </Tip>
    </header>
  );
}
