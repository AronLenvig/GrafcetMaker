import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKeys, getCommand, runCommand } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import { tDynamic } from '@/i18n/dynamic';
import { useTheme, type ThemeMode } from '@/theme/theme';
import { THEME_OPTIONS, ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { LanguageSwitcher } from './LanguageMenu';
import { listRecent, type RecentEntry } from './persistence/db';
import { openRecent } from './persistence/session';
import { setPrefs, usePrefs } from './prefs';
import { ChevronDownIcon, CloseIcon, LogoIcon, MenuIcon } from './ui/icons';
import {
  cx,
  IconButton,
  MenuCheckItem,
  menuContentClass,
  MenuItem,
  MenuSeparator,
  SubMenu,
  Tip,
} from './ui/primitives';

type BoolPref = 'textbookNotation' | 'showGrid' | 'snapToGrid' | 'showHints';

/**
 * One entry of the main menu. `desktopOnly` entries make no sense on a phone (panels and split
 * view that the phone layout does not have, keyboard shortcuts) and are left out of the drawer.
 */
type MenuNode =
  | { command: string; keys?: string; label?: string; desktopOnly?: boolean }
  | { separator: true }
  | { sub: string; items: MenuNode[]; desktopOnly?: boolean }
  | { pref: BoolPref; label: string; desktopOnly?: boolean }
  | { special: 'recent' | 'undoRedo' };

interface MenuSection {
  label: 'file' | 'edit' | 'view' | 'simulate' | 'help';
  items: MenuNode[];
}

const SEP: MenuNode = { separator: true };
const cmd = (command: string, extra: Partial<Extract<MenuNode, { command: string }>> = {}) => ({
  command,
  ...extra,
});

/** The main menu: rendered as the menu bar on desktops and tablets, as a drawer on phones. */
const MAIN_MENU: MenuSection[] = [
  {
    label: 'file',
    items: [
      cmd('file.new'),
      cmd('file.open'),
      { special: 'recent' },
      SEP,
      cmd('file.save'),
      cmd('file.saveAs'),
      cmd('file.downloadCopy'),
      cmd('file.copyLink'),
      cmd('file.live'),
      SEP,
      cmd('file.export'),
      {
        sub: 'commands.file.exportAs',
        items: [
          cmd('file.exportPdf'),
          cmd('file.exportSvg'),
          cmd('file.exportPng'),
          cmd('file.exportWebp'),
          SEP,
          cmd('file.exportSt'),
          cmd('file.exportXml'),
        ],
      },
      cmd('file.copyPng'),
      cmd('file.copySvg'),
      {
        sub: 'commands.file.variables',
        items: [
          cmd('file.importVariables'),
          cmd('file.exportVariablesXlsx'),
          cmd('file.exportVariablesCsv'),
        ],
      },
      SEP,
      cmd('file.localHistory'),
      cmd('file.settings'),
    ],
  },
  {
    label: 'edit',
    items: [
      { special: 'undoRedo' },
      SEP,
      cmd('edit.cut', { keys: 'Mod+X' }),
      cmd('edit.copy', { keys: 'Mod+C' }),
      cmd('edit.paste', { keys: 'Mod+V' }),
      cmd('edit.delete'),
      cmd('edit.deleteNoHeal'),
      SEP,
      cmd('edit.selectAll'),
      cmd('edit.rename'),
      cmd('edit.toggleInitial'),
      SEP,
      cmd('insert.append'),
      cmd('insert.action'),
      cmd('insert.step'),
      cmd('insert.grafcet'),
      SEP,
      cmd('insert.parallel'),
      cmd('insert.alternative'),
      cmd('insert.loop'),
      cmd('insert.source'),
      cmd('insert.sink'),
      cmd('insert.macroStep'),
      cmd('insert.enclosingStep'),
      SEP,
      cmd('arrange.layout'),
      cmd('arrange.layoutSelection'),
      cmd('arrange.renumber'),
    ],
  },
  {
    label: 'view',
    items: [
      cmd('view.zoomIn'),
      cmd('view.zoomOut'),
      cmd('view.zoomReset'),
      cmd('view.fit'),
      cmd('view.fitSelection'),
      {
        sub: 'split.menu',
        desktopOnly: true,
        items: [
          cmd('view.splitRight'),
          cmd('view.splitDown'),
          cmd('view.focusOtherPane'),
          cmd('view.swapPanes'),
          cmd('view.closeSplit'),
        ],
      },
      cmd('view.openChild'),
      cmd('view.goToParent'),
      SEP,
      { pref: 'textbookNotation', label: 'commands.view.textbook' },
      { pref: 'showGrid', label: 'commands.view.showGrid' },
      { pref: 'snapToGrid', label: 'commands.view.snapToGrid' },
      { pref: 'showHints', label: 'commands.view.hints', desktopOnly: true },
      SEP,
      cmd('view.toggleRight', { desktopOnly: true }),
      cmd('view.showVariables'),
      cmd('view.showProblems'),
      cmd('view.palette'),
    ],
  },
  {
    label: 'simulate',
    items: [
      cmd('sim.toggle', { label: 'commands.simulate.start' }),
      SEP,
      cmd('view.showSimulation'),
      cmd('view.showChronogram'),
    ],
  },
  {
    label: 'help',
    items: [
      cmd('help.open'),
      cmd('help.startScreen'),
      cmd('help.tour', { desktopOnly: true }),
      cmd('help.gettingStarted'),
      cmd('help.basics'),
      cmd('help.expressions'),
      cmd('help.guide'),
      SEP,
      cmd('help.shortcuts', { desktopOnly: true }),
      cmd('help.feedback'),
      cmd('help.whatsNew'),
      cmd('help.about'),
    ],
  },
];

function useCommandLabel() {
  const { t } = useTranslation();
  return (id: string, override?: string) =>
    override ? tDynamic(t, override) : tDynamic(t, `commands.${getCommand(id).label}`);
}

function isEnabled(id: string): boolean {
  const c = getCommand(id);
  return c.enabled ? c.enabled() : true;
}

/** Undo / Redo naming the change they act on. */
function useUndoRedoLabels(): [string, string] {
  const { t } = useTranslation();
  const undo = useDoc((s) => s.past[s.past.length - 1]?.label);
  const redo = useDoc((s) => s.future[0]?.label);
  return [
    undo ? t('commands.edit.undoWhat', { what: tDynamic(t, undo) }) : t('commands.edit.undo'),
    redo ? t('commands.edit.redoWhat', { what: tDynamic(t, redo) }) : t('commands.edit.redo'),
  ];
}

function useRecent(): RecentEntry[] {
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  useEffect(() => {
    void listRecent().then(setRecent);
  }, []);
  return recent;
}

// ---- Menu bar (desktops and tablets) ----

function BarCommand({ node }: { node: Extract<MenuNode, { command: string }> }) {
  const label = useCommandLabel();
  const keys = node.keys ?? getCommand(node.command).keys?.[0];
  return (
    <MenuItem
      keys={keys ? formatKeys(keys) : undefined}
      disabled={!isEnabled(node.command)}
      onSelect={() => runCommand(node.command)}
    >
      {label(node.command, node.label)}
    </MenuItem>
  );
}

function BarRecent() {
  const { t } = useTranslation();
  const recent = useRecent();
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

function BarUndoRedo() {
  const labels = useUndoRedoLabels();
  return (
    <>
      {(['edit.undo', 'edit.redo'] as const).map((id, i) => {
        const keys = getCommand(id).keys?.[0];
        return (
          <MenuItem
            key={id}
            keys={keys ? formatKeys(keys) : undefined}
            disabled={!isEnabled(id)}
            onSelect={() => runCommand(id)}
          >
            {labels[i]}
          </MenuItem>
        );
      })}
    </>
  );
}

type PrefNode = Extract<MenuNode, { pref: BoolPref }>;

/** A preference as a check item (subscribed to that preference only). */
function BarPref({ node }: { node: PrefNode }) {
  const { t } = useTranslation();
  const on = usePrefs((s) => s[node.pref]);
  return (
    <MenuCheckItem checked={on} onCheckedChange={(v) => setPrefs({ [node.pref]: v })}>
      {tDynamic(t, node.label)}
    </MenuCheckItem>
  );
}

function BarNode({ node }: { node: MenuNode }) {
  const { t } = useTranslation();
  if ('separator' in node) return <MenuSeparator />;
  if ('special' in node) return node.special === 'recent' ? <BarRecent /> : <BarUndoRedo />;
  if ('sub' in node) {
    return (
      <SubMenu label={tDynamic(t, node.sub)}>
        {node.items.map((n, i) => (
          <BarNode key={i} node={n} />
        ))}
      </SubMenu>
    );
  }
  if ('pref' in node) return <BarPref node={node} />;
  return <BarCommand node={node} />;
}

/**
 * Desktops and tablets: the main menu behind one button (File, Edit, View, Simulate and Help as
 * submenus) with the theme as one row of icons at the bottom, so the canvas keeps the screen.
 */
export function MainMenuButton() {
  const { t } = useTranslation();
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <IconButton
          label={t('menu.open')}
          title={t('menu.open')}
          className="h-9 w-9 data-[state=open]:bg-surface-2"
        >
          <MenuIcon size={18} />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label={t('menu.label')}
          className={menuContentClass}
          align="start"
          sideOffset={8}
          collisionPadding={8}
        >
          {MAIN_MENU.map((s) => (
            <SubMenu key={s.label} label={t(`menu.${s.label}`)}>
              {s.items.map((n, i) => (
                <BarNode key={i} node={n} />
              ))}
            </SubMenu>
          ))}
          <MenuSeparator />
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="flex-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
              {t('theme.label')}
            </span>
            <DropdownMenu.RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as ThemeMode)}
              aria-label={t('theme.label')}
              className="flex gap-0.5"
            >
              {THEME_OPTIONS.map(({ mode: m, Icon }) => (
                <Tip key={m} label={t(`theme.${m}`)} side="bottom">
                  <DropdownMenu.RadioItem
                    value={m}
                    aria-label={t(`theme.${m}`)}
                    className="flex h-7 w-8 cursor-default items-center justify-center rounded text-muted outline-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-text data-[state=checked]:bg-surface-2 data-[state=checked]:text-text data-[state=checked]:ring-1 data-[state=checked]:ring-accent"
                  >
                    <Icon size={15} />
                  </DropdownMenu.RadioItem>
                </Tip>
              ))}
            </DropdownMenu.RadioGroup>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---- Drawer (phones) ----

/** Drops desktop-only entries and the separators they leave doubled or dangling. */
function forPhone(items: MenuNode[]): MenuNode[] {
  const kept = items
    .filter((n) => !('desktopOnly' in n && n.desktopOnly))
    .map((n) => ('sub' in n ? { ...n, items: forPhone(n.items) } : n));
  return kept.filter(
    (n, i) =>
      !('separator' in n) || (i > 0 && i < kept.length - 1 && !('separator' in kept[i - 1]!)),
  );
}

const row =
  'flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface-2 active:bg-surface-2 disabled:opacity-45 disabled:hover:bg-transparent';

function Group({
  label,
  depth,
  defaultOpen = false,
  children,
}: {
  label: string;
  depth: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(row, depth === 0 && 'font-semibold')}
        style={{ paddingLeft: 16 + depth * 16 }}
      >
        <span className="flex-1">{label}</span>
        <ChevronDownIcon
          size={16}
          className={cx('text-muted transition-transform', !open && '-rotate-90')}
        />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

type Run = (action: () => unknown) => void;

function DrawerUndoRedo({ depth, run }: { depth: number; run: Run }) {
  const [undo, redo] = useUndoRedoLabels();
  return (
    <div>
      {(
        [
          ['edit.undo', undo],
          ['edit.redo', redo],
        ] as const
      ).map(([id, text]) => (
        <button
          key={id}
          type="button"
          className={row}
          style={{ paddingLeft: 16 + depth * 16 }}
          disabled={!isEnabled(id)}
          onClick={() => run(() => runCommand(id))}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Open recent (the list is read once, when its group is shown). */
function DrawerRecent({ depth, run }: { depth: number; run: Run }) {
  const { t } = useTranslation();
  const recent = useRecent();
  if (!recent.length) return null;
  return (
    <Group label={t('commands.file.openRecent')} depth={depth}>
      {recent.map((r) => (
        <button
          key={r.id}
          type="button"
          className={cx(row, 'flex-col items-start gap-0')}
          style={{ paddingLeft: 16 + (depth + 1) * 16 }}
          onClick={() => run(() => openRecent(r))}
        >
          <span className="w-full truncate">{r.name}</span>
          {r.fileName && <span className="w-full truncate text-xs text-muted">{r.fileName}</span>}
        </button>
      ))}
    </Group>
  );
}

function DrawerPref({ node, depth }: { node: PrefNode; depth: number }) {
  const { t } = useTranslation();
  const on = usePrefs((s) => s[node.pref]);
  return (
    <button
      type="button"
      aria-pressed={on}
      className={row}
      style={{ paddingLeft: 16 + depth * 16 }}
      onClick={() => setPrefs({ [node.pref]: !on })}
    >
      <span className="flex-1">{tDynamic(t, node.label)}</span>
      <span aria-hidden="true" className="w-4 text-center text-accent">
        {on ? '✓' : ''}
      </span>
    </button>
  );
}

function DrawerNodes({ items, depth, run }: { items: MenuNode[]; depth: number; run: Run }) {
  const { t } = useTranslation();
  const label = useCommandLabel();
  const pad = { paddingLeft: 16 + depth * 16 };
  return (
    <>
      {items.map((n, i) => {
        if ('separator' in n) return <div key={i} className="mx-4 my-1 h-px bg-border" />;
        if ('special' in n)
          return n.special === 'undoRedo' ? (
            <DrawerUndoRedo key={i} depth={depth} run={run} />
          ) : (
            <DrawerRecent key={i} depth={depth} run={run} />
          );
        if ('sub' in n) {
          return (
            <Group key={i} label={tDynamic(t, n.sub)} depth={depth}>
              <DrawerNodes items={n.items} depth={depth + 1} run={run} />
            </Group>
          );
        }
        if ('pref' in n) return <DrawerPref key={i} node={n} depth={depth} />;
        return (
          <button
            key={i}
            type="button"
            className={row}
            style={pad}
            disabled={!isEnabled(n.command)}
            onClick={() => run(() => runCommand(n.command))}
          >
            {label(n.command, n.label)}
          </button>
        );
      })}
    </>
  );
}

/** Phones: the main menu as a drawer from the left, with the theme at the bottom. */
export function MenuDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  // Close first, then act: a command may open a dialog, which must not fight the closing drawer.
  const run = (action: () => unknown) => {
    onOpenChange(false);
    requestAnimationFrame(() => void action());
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(320px,86vw)] flex-col border-r border-border bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-text shadow-pop outline-none"
        >
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <LogoIcon size={20} className="text-accent" />
            <Dialog.Title className="flex-1 text-sm font-semibold">{t('app.name')}</Dialog.Title>
            <Dialog.Close
              aria-label={t('common.close')}
              className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
            >
              <CloseIcon size={18} />
            </Dialog.Close>
          </div>
          <nav aria-label={t('menu.label')} className="min-h-0 flex-1 overflow-y-auto py-1">
            {MAIN_MENU.map((s, i) => (
              <Group key={s.label} label={t(`menu.${s.label}`)} depth={0} defaultOpen={i === 0}>
                <DrawerNodes items={forPhone(s.items)} depth={1} run={run} />
              </Group>
            ))}
          </nav>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="text-sm text-muted">{t('theme.label')}</span>
            <ThemeSwitcher />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="text-sm text-muted">{t('language.label')}</span>
            <LanguageSwitcher />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
