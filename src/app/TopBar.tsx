import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKeys, getCommand, runCommand } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import { isDirty } from '@/editor/store/documentStore';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { listRecent, type RecentEntry } from './persistence/db';
import { openRecent, useSession } from './persistence/session';
import { setPrefs, usePrefs } from './prefs';
import { LogoIcon, SearchIcon } from './ui/icons';
import {
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

function Title() {
  const { t } = useTranslation();
  const name = useDoc((s) => s.project.name);
  const dirty = useDoc(isDirty);
  const fileName = useSession((s) => s.fileName);
  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${name} — ${t('app.name')}`;
  }, [dirty, name, t]);
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={fileName ?? undefined}>
      {dirty && (
        <span className="text-accent" aria-label={t('file.unsaved')} title={t('file.unsaved')}>
          ●
        </span>
      )}
      <span className="truncate font-medium">{name}</span>
      {fileName && <span className="hidden truncate text-muted md:inline">— {fileName}</span>}
    </div>
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
          <Item id="file.localHistory" />
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
          <Item id="view.palette" />
        </Menu>
        <Menu label={t('menu.help')}>
          <Item id="help.shortcuts" />
          <Item id="help.about" />
        </Menu>
      </nav>
      <div className="mx-2 flex min-w-0 flex-1 justify-center">
        <Title />
      </div>
      <Tip label={t('commands.view.palette')} keys={formatKeys('Mod+K')} side="bottom">
        <IconButton label={t('commands.view.palette')} onClick={() => runCommand('view.palette')}>
          <SearchIcon size={16} />
        </IconButton>
      </Tip>
      <ThemeSwitcher />
    </header>
  );
}
