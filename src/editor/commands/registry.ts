import { create } from 'zustand';
import { setPrefs, usePrefs } from '@/app/prefs';
import {
  newProject,
  openProjectDialog,
  saveProject,
  saveProjectAs,
  downloadCopy,
} from '@/app/persistence/session';
import { showBottomTab } from '@/panels/BottomPanel';
import { useTheme } from '@/theme/theme';
import { fitToContent, setZoom, zoomBy } from '../canvas/viewport';
import { doc } from '../store/document';
import { ui, useUi, type Tool } from '../store/uiStore';
import {
  addActionToSelection,
  addGrafcet,
  addStepAtCenter,
  appendSequence,
  copySelection,
  cutSelection,
  deleteSelection,
  editSelection,
  nudgeSelection,
  pasteFromSystem,
  selectAll,
  toggleInitialStep,
} from './edit';

export type CommandGroup = 'file' | 'edit' | 'insert' | 'view' | 'tools' | 'help';

export interface Command {
  id: string;
  /** i18n key under `commands.` */
  label: string;
  group: CommandGroup;
  /** Key combos, e.g. `Mod+S` (Mod = Ctrl, or Cmd on Apple platforms). First one is displayed. */
  keys?: string[];
  /** Fires even while typing in a text field. */
  global?: boolean;
  /** Hidden from the command palette (e.g. arrow-key nudges). */
  hidden?: boolean;
  run: () => void | Promise<unknown>;
  enabled?: () => boolean;
}

/** App-level dialogs opened by commands. */
export type AppDialog = 'localHistory' | 'shortcuts' | 'about' | null;
export const useAppDialog = create<{ open: AppDialog }>(() => ({ open: null }));
export const openAppDialog = (open: AppDialog) => useAppDialog.setState({ open });

const hasSelection = () =>
  Object.keys(useUi.getState().selection).length > 0 || !!useUi.getState().selectedLink;
const singleSelection = () => Object.keys(useUi.getState().selection).length === 1;
const activeGid = () => useUi.getState().activeGrafcetId;
const withGid = (fn: (gid: string) => void) => () => {
  const gid = activeGid();
  if (gid) fn(gid);
};

function tool(id: Tool, key: string): Command {
  return {
    id: `tools.${id}`,
    label: `tools.${id}`,
    group: 'tools',
    keys: [key],
    run: () => ui.setTool(id),
  };
}

const NUDGE = 10;

export const COMMANDS: Command[] = [
  { id: 'file.new', label: 'file.new', group: 'file', run: newProject },
  {
    id: 'file.open',
    label: 'file.open',
    group: 'file',
    keys: ['Mod+O'],
    global: true,
    run: openProjectDialog,
  },
  {
    id: 'file.save',
    label: 'file.save',
    group: 'file',
    keys: ['Mod+S'],
    global: true,
    run: saveProject,
  },
  {
    id: 'file.saveAs',
    label: 'file.saveAs',
    group: 'file',
    keys: ['Mod+Shift+S'],
    global: true,
    run: saveProjectAs,
  },
  { id: 'file.downloadCopy', label: 'file.downloadCopy', group: 'file', run: () => downloadCopy() },
  {
    id: 'file.localHistory',
    label: 'file.localHistory',
    group: 'file',
    run: () => openAppDialog('localHistory'),
  },

  {
    id: 'edit.undo',
    label: 'edit.undo',
    group: 'edit',
    keys: ['Mod+Z'],
    run: doc.undo,
    enabled: () => doc.store.getState().past.length > 0,
  },
  {
    id: 'edit.redo',
    label: 'edit.redo',
    group: 'edit',
    keys: ['Mod+Shift+Z', 'Mod+Y'],
    run: doc.redo,
    enabled: () => doc.store.getState().future.length > 0,
  },
  {
    id: 'edit.cut',
    label: 'edit.cut',
    group: 'edit',
    run: () => cutSelection(),
    enabled: hasSelection,
  },
  {
    id: 'edit.copy',
    label: 'edit.copy',
    group: 'edit',
    run: () => void copySelection(),
    enabled: hasSelection,
  },
  { id: 'edit.paste', label: 'edit.paste', group: 'edit', run: pasteFromSystem },
  {
    id: 'edit.delete',
    label: 'edit.delete',
    group: 'edit',
    keys: ['Delete', 'Backspace'],
    run: () => deleteSelection(true),
    enabled: hasSelection,
  },
  {
    id: 'edit.deleteNoHeal',
    label: 'edit.deleteNoHeal',
    group: 'edit',
    keys: ['Shift+Delete', 'Shift+Backspace'],
    run: () => deleteSelection(false),
    enabled: hasSelection,
  },
  { id: 'edit.selectAll', label: 'edit.selectAll', group: 'edit', keys: ['Mod+A'], run: selectAll },
  {
    id: 'edit.rename',
    label: 'edit.rename',
    group: 'edit',
    keys: ['F2'],
    run: editSelection,
    enabled: singleSelection,
  },
  {
    id: 'edit.toggleInitial',
    label: 'edit.toggleInitial',
    group: 'edit',
    run: toggleInitialStep,
    enabled: hasSelection,
  },
  {
    id: 'edit.nudgeLeft',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['ArrowLeft'],
    hidden: true,
    run: () => nudgeSelection(-NUDGE, 0),
  },
  {
    id: 'edit.nudgeRight',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['ArrowRight'],
    hidden: true,
    run: () => nudgeSelection(NUDGE, 0),
  },
  {
    id: 'edit.nudgeUp',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['ArrowUp'],
    hidden: true,
    run: () => nudgeSelection(0, -NUDGE),
  },
  {
    id: 'edit.nudgeDown',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['ArrowDown'],
    hidden: true,
    run: () => nudgeSelection(0, NUDGE),
  },
  {
    id: 'edit.nudgeLeftFar',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['Shift+ArrowLeft'],
    hidden: true,
    run: () => nudgeSelection(-5 * NUDGE, 0),
  },
  {
    id: 'edit.nudgeRightFar',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['Shift+ArrowRight'],
    hidden: true,
    run: () => nudgeSelection(5 * NUDGE, 0),
  },
  {
    id: 'edit.nudgeUpFar',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['Shift+ArrowUp'],
    hidden: true,
    run: () => nudgeSelection(0, -5 * NUDGE),
  },
  {
    id: 'edit.nudgeDownFar',
    label: 'edit.nudge',
    group: 'edit',
    keys: ['Shift+ArrowDown'],
    hidden: true,
    run: () => nudgeSelection(0, 5 * NUDGE),
  },
  {
    id: 'edit.escape',
    label: 'edit.escape',
    group: 'edit',
    keys: ['Escape'],
    hidden: true,
    run: () => {
      ui.setTool('select');
      ui.clearSelection();
    },
  },

  {
    id: 'insert.append',
    label: 'insert.append',
    group: 'insert',
    keys: ['Enter'],
    run: appendSequence,
  },
  {
    id: 'insert.action',
    label: 'insert.action',
    group: 'insert',
    keys: ['A'],
    run: () => addActionToSelection(),
    enabled: singleSelection,
  },
  { id: 'insert.step', label: 'insert.step', group: 'insert', run: addStepAtCenter },
  { id: 'insert.grafcet', label: 'insert.grafcet', group: 'insert', run: () => void addGrafcet() },

  tool('select', 'V'),
  tool('hand', 'H'),
  tool('step', 'S'),
  tool('transition', 'T'),
  tool('comment', 'C'),

  {
    id: 'view.zoomIn',
    label: 'view.zoomIn',
    group: 'view',
    keys: ['=', '+', 'Shift++'],
    run: withGid((gid) => zoomBy(gid, 1.25)),
  },
  {
    id: 'view.zoomOut',
    label: 'view.zoomOut',
    group: 'view',
    keys: ['-'],
    run: withGid((gid) => zoomBy(gid, 1 / 1.25)),
  },
  {
    id: 'view.fit',
    label: 'view.fit',
    group: 'view',
    keys: ['Shift+1', 'Shift+!'],
    run: withGid((gid) => fitToContent(gid)),
  },
  {
    id: 'view.fitSelection',
    label: 'view.fitSelection',
    group: 'view',
    keys: ['Shift+2', 'Shift+@'],
    run: () => {
      const gid = activeGid();
      const ids = ui.selectedIds();
      if (gid && ids.length) fitToContent(gid, ids);
    },
  },
  {
    id: 'view.zoomReset',
    label: 'view.zoomReset',
    group: 'view',
    keys: ['Shift+0', 'Shift+)'],
    run: withGid((gid) => setZoom(gid, 1)),
  },
  {
    id: 'view.toggleGrid',
    label: 'view.toggleGrid',
    group: 'view',
    run: () => setPrefs({ showGrid: !usePrefs.getState().showGrid }),
  },
  {
    id: 'view.toggleSnap',
    label: 'view.toggleSnap',
    group: 'view',
    run: () => setPrefs({ snapToGrid: !usePrefs.getState().snapToGrid }),
  },
  {
    id: 'view.toggleLeft',
    label: 'view.toggleLeft',
    group: 'view',
    run: () => setPrefs({ leftCollapsed: !usePrefs.getState().leftCollapsed }),
  },
  {
    id: 'view.toggleRight',
    label: 'view.toggleRight',
    group: 'view',
    run: () => setPrefs({ rightCollapsed: !usePrefs.getState().rightCollapsed }),
  },
  {
    id: 'view.themeSystem',
    label: 'view.themeSystem',
    group: 'view',
    run: () => useTheme.getState().setMode('system'),
  },
  {
    id: 'view.themeLight',
    label: 'view.themeLight',
    group: 'view',
    run: () => useTheme.getState().setMode('light'),
  },
  {
    id: 'view.themeDark',
    label: 'view.themeDark',
    group: 'view',
    run: () => useTheme.getState().setMode('dark'),
  },
  {
    id: 'view.toggleTextbook',
    label: 'view.toggleTextbook',
    group: 'view',
    run: () => setPrefs({ textbookNotation: !usePrefs.getState().textbookNotation }),
  },
  {
    id: 'view.showVariables',
    label: 'view.showVariables',
    group: 'view',
    run: () => showBottomTab('variables'),
  },
  {
    id: 'view.palette',
    label: 'view.palette',
    group: 'view',
    keys: ['Mod+K'],
    global: true,
    run: () => ui.set({ paletteOpen: true }),
  },

  {
    id: 'help.shortcuts',
    label: 'help.shortcuts',
    group: 'help',
    keys: ['?', 'Shift+?'],
    run: () => openAppDialog('shortcuts'),
  },
  { id: 'help.about', label: 'help.about', group: 'help', run: () => openAppDialog('about') },
];

const byId = new Map(COMMANDS.map((c) => [c.id, c]));

export function getCommand(id: string): Command {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown command ${id}`);
  return c;
}

export function runCommand(id: string): void {
  const c = getCommand(id);
  if (c.enabled && !c.enabled()) return;
  void c.run();
}

export const isApple =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** Human-readable key combo for menus and tooltips. */
export function formatKeys(combo: string): string {
  return combo
    .split('+')
    .map((k) => {
      if (k === 'Mod') return isApple ? '⌘' : 'Ctrl';
      if (k === 'Shift') return isApple ? '⇧' : 'Shift';
      if (k === 'Alt') return isApple ? '⌥' : 'Alt';
      if (k === 'ArrowUp') return '↑';
      if (k === 'ArrowDown') return '↓';
      if (k === 'ArrowLeft') return '←';
      if (k === 'ArrowRight') return '→';
      if (k === 'Delete') return isApple ? '⌦' : 'Del';
      return k;
    })
    .join(isApple ? '' : '+');
}
