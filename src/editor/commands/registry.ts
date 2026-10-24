import i18next from 'i18next';
import { create } from 'zustand';
import { startTour } from '@/app/start/tourStore';
import { closeSplit, focusOtherPane, openSplit, swapPanes } from './split';
import { guideUrl, openHelp, toggleHelp } from '@/app/help/helpStore';
import { setPrefs, showBottomTab, showSideTab, usePrefs } from '@/app/prefs';
import { toggleProperties } from '@/app/sheet';
import { toast } from '@/app/toasts';
import { isCompact } from '@/app/ui/media';
import {
  newProject,
  openProjectDialog,
  saveProject,
  saveProjectAs,
  downloadCopy,
  copyShareLink,
} from '@/app/persistence/session';
import { setLanguage, type Language } from '@/i18n';
import { useTheme } from '@/theme/theme';
import { fitToContent, setZoom, zoomBy } from '../canvas/viewport';
import {
  nextEvent,
  resetSimulation,
  startSimulation,
  stopSimulation,
  togglePlay,
  useSim,
} from '../simulation/simStore';
import { doc } from '../store/document';
import { ui, useUi, type Tool } from '../store/uiStore';
import { canGoToParent, canOpenChild, convertSelected, goToParent, openChild } from './hierarchy';
import {
  alternativeBranch,
  autoLayoutActive,
  cancelPending,
  parallelBranch,
  renumberActive,
  sinkTransition,
  sourceTransition,
  startLoop,
} from './structure';
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
  canRotateSelection,
  rotateSelection,
  toggleInitialStep,
} from './edit';
import { removeUnusedVariables } from './variables';

/** Undo / redo, saying so when changes someone else made since (live session) were kept. */
function stepHistory(step: () => boolean): void {
  if (step()) toast(i18next.t('live.keptOthers'), 'info', 5000);
}

export type CommandGroup = 'file' | 'edit' | 'insert' | 'view' | 'tools' | 'simulate' | 'help';

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
export type AppDialog =
  | 'localHistory'
  | 'shortcuts'
  | 'about'
  | 'export'
  | 'settings'
  | 'feedback'
  | 'start'
  | 'changelog'
  | 'live'
  | null;
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

/** Arrow keys move the selection by `dx`, `dy` grid steps of NUDGE (hidden from the palette). */
function nudge(id: string, key: string, dx: number, dy: number): Command {
  return {
    id: `edit.${id}`,
    label: 'edit.nudge',
    group: 'edit',
    keys: [key],
    hidden: true,
    run: () => nudgeSelection(dx * NUDGE, dy * NUDGE),
  };
}

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
  { id: 'file.copyLink', label: 'file.copyLink', group: 'file', run: copyShareLink },
  { id: 'file.live', label: 'file.live', group: 'file', run: () => openAppDialog('live') },
  {
    id: 'insert.macroStep',
    label: 'insert.macroStep',
    group: 'insert',
    run: () => convertSelected('macro'),
    enabled: singleSelection,
  },
  {
    id: 'insert.enclosingStep',
    label: 'insert.enclosingStep',
    group: 'insert',
    run: () => convertSelected('enclosing'),
    enabled: singleSelection,
  },
  {
    id: 'view.openChild',
    label: 'view.openChild',
    group: 'view',
    keys: ['Alt+ArrowDown'],
    run: () => void openChild(),
    enabled: canOpenChild,
  },
  {
    id: 'view.goToParent',
    label: 'view.goToParent',
    group: 'view',
    keys: ['Alt+ArrowUp'],
    run: goToParent,
    enabled: canGoToParent,
  },
  {
    id: 'file.export',
    label: 'file.export',
    group: 'file',
    keys: ['Mod+E'],
    global: true,
    run: () => openAppDialog('export'),
  },
  ...(['pdf', 'svg', 'png', 'webp', 'st', 'xml'] as const).map((f): Command => ({
    id: `file.export${f[0]!.toUpperCase()}${f.slice(1)}`,
    label: `file.export${f[0]!.toUpperCase()}${f.slice(1)}`,
    group: 'file',
    run: () =>
      import('@/app/export/exporters').then((m) => {
        m.requestExportFormat(f);
        openAppDialog('export');
      }),
  })),
  {
    id: 'file.exportVariablesXlsx',
    label: 'file.exportVariablesXlsx',
    group: 'file',
    run: () => import('@/app/export/commands').then((m) => m.exportVariables('xlsx')),
  },
  {
    id: 'file.exportVariablesCsv',
    label: 'file.exportVariablesCsv',
    group: 'file',
    run: () => import('@/app/export/commands').then((m) => m.exportVariables('csv')),
  },
  {
    id: 'file.importVariables',
    label: 'file.importVariables',
    group: 'file',
    run: () => import('@/app/export/commands').then((m) => m.importVariablesDialog()),
    enabled: () => useUi.getState().mode === 'edit',
  },
  {
    id: 'file.copyPng',
    label: 'file.copyPng',
    group: 'file',
    run: () => import('@/app/export/commands').then((m) => m.copyDiagram('png')),
  },
  {
    id: 'file.copySvg',
    label: 'file.copySvg',
    group: 'file',
    run: () => import('@/app/export/commands').then((m) => m.copyDiagram('svg')),
  },
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
    run: () => stepHistory(doc.undo),
    enabled: () => doc.store.getState().past.length > 0,
  },
  {
    id: 'edit.redo',
    label: 'edit.redo',
    group: 'edit',
    keys: ['Mod+Shift+Z', 'Mod+Y'],
    run: () => stepHistory(doc.redo),
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
    id: 'edit.removeUnusedVariables',
    label: 'edit.removeUnusedVariables',
    group: 'edit',
    run: removeUnusedVariables,
    enabled: () => useUi.getState().mode === 'edit',
  },
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
    id: 'edit.rotate',
    label: 'edit.rotate',
    group: 'edit',
    keys: ['R'],
    run: rotateSelection,
    enabled: canRotateSelection,
  },
  nudge('nudgeLeft', 'ArrowLeft', -1, 0),
  nudge('nudgeRight', 'ArrowRight', 1, 0),
  nudge('nudgeUp', 'ArrowUp', 0, -1),
  nudge('nudgeDown', 'ArrowDown', 0, 1),
  nudge('nudgeLeftFar', 'Shift+ArrowLeft', -5, 0),
  nudge('nudgeRightFar', 'Shift+ArrowRight', 5, 0),
  nudge('nudgeUpFar', 'Shift+ArrowUp', 0, -5),
  nudge('nudgeDownFar', 'Shift+ArrowDown', 0, 5),
  {
    id: 'edit.escape',
    label: 'edit.escape',
    group: 'edit',
    keys: ['Escape'],
    hidden: true,
    run: () => {
      if (useUi.getState().pending) return cancelPending();
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
  },
  { id: 'insert.step', label: 'insert.step', group: 'insert', run: addStepAtCenter },
  {
    id: 'insert.parallel',
    label: 'insert.parallel',
    group: 'insert',
    keys: ['P'],
    run: parallelBranch,
    enabled: singleSelection,
  },
  {
    id: 'insert.alternative',
    label: 'insert.alternative',
    group: 'insert',
    keys: ['O'],
    run: alternativeBranch,
    enabled: singleSelection,
  },
  {
    id: 'insert.loop',
    label: 'insert.loop',
    group: 'insert',
    keys: ['L'],
    run: startLoop,
    enabled: singleSelection,
  },
  {
    id: 'insert.source',
    label: 'insert.source',
    group: 'insert',
    run: sourceTransition,
    enabled: singleSelection,
  },
  {
    id: 'insert.sink',
    label: 'insert.sink',
    group: 'insert',
    run: sinkTransition,
    enabled: singleSelection,
  },
  {
    id: 'arrange.layout',
    label: 'arrange.layout',
    group: 'edit',
    run: () => autoLayoutActive(false),
  },
  {
    id: 'arrange.layoutSelection',
    label: 'arrange.layoutSelection',
    group: 'edit',
    run: () => autoLayoutActive(true),
    enabled: hasSelection,
  },
  { id: 'arrange.renumber', label: 'arrange.renumber', group: 'edit', run: renumberActive },
  { id: 'insert.grafcet', label: 'insert.grafcet', group: 'insert', run: () => void addGrafcet() },

  tool('select', 'V'),
  tool('hand', 'H'),
  tool('step', 'S'),
  tool('transition', 'T'),
  tool('comment', 'C'),
  tool('action', 'Shift+A'),

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
    id: 'view.toggleRight',
    label: 'view.toggleRight',
    group: 'view',
    run: toggleProperties,
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
  ...(['En', 'Fr', 'De', 'Es', 'Da', 'Sv'] as const).map((l): Command => ({
    id: `view.language${l}`,
    label: `view.language${l}`,
    group: 'view',
    run: () => void setLanguage(l.toLowerCase() as Language),
  })),
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
    id: 'view.splitRight',
    label: 'view.splitRight',
    group: 'view',
    keys: ['Mod+\\'],
    global: true,
    run: () => openSplit('columns'),
  },
  {
    id: 'view.splitDown',
    label: 'view.splitDown',
    group: 'view',
    run: () => openSplit('rows'),
  },
  {
    id: 'view.closeSplit',
    label: 'view.closeSplit',
    group: 'view',
    run: closeSplit,
    enabled: () => !!useUi.getState().split,
  },
  {
    id: 'view.focusOtherPane',
    label: 'view.focusOtherPane',
    group: 'view',
    keys: ['Mod+Alt+\\'],
    global: true,
    run: focusOtherPane,
    enabled: () => !!useUi.getState().split,
  },
  {
    id: 'view.swapPanes',
    label: 'view.swapPanes',
    group: 'view',
    run: swapPanes,
    enabled: () => !!useUi.getState().split,
  },
  {
    id: 'view.toggleHints',
    label: 'view.toggleHints',
    group: 'view',
    run: () => setPrefs({ showHints: !usePrefs.getState().showHints }),
  },
  {
    id: 'view.outline',
    label: 'view.outline',
    group: 'view',
    run: () => showSideTab('outline'),
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
    id: 'view.showProblems',
    label: 'view.showProblems',
    group: 'view',
    run: () => showBottomTab('problems'),
  },
  {
    id: 'view.showSimulation',
    label: 'view.showSimulation',
    group: 'view',
    run: () => showBottomTab('simulation'),
    // Desktops show the simulation panel only while simulating (phones have it as a tab).
    enabled: () => isCompact() || useSim.getState().on,
  },
  {
    id: 'view.showChronogram',
    label: 'view.showChronogram',
    group: 'view',
    run: () => showBottomTab('chronogram'),
  },

  {
    id: 'sim.toggle',
    label: 'simulate.toggle',
    group: 'simulate',
    keys: ['F5'],
    global: true,
    run: () => (useSim.getState().on ? togglePlay() : startSimulation()),
  },
  {
    id: 'sim.stop',
    label: 'simulate.stop',
    group: 'simulate',
    keys: ['Shift+F5'],
    global: true,
    run: stopSimulation,
    enabled: () => useSim.getState().on,
  },
  {
    id: 'sim.step',
    label: 'simulate.step',
    group: 'simulate',
    keys: ['F10'],
    run: nextEvent,
    enabled: () => useSim.getState().on,
  },
  {
    id: 'sim.reset',
    label: 'simulate.reset',
    group: 'simulate',
    run: resetSimulation,
    enabled: () => useSim.getState().on,
  },

  {
    id: 'help.open',
    label: 'help.open',
    group: 'help',
    keys: ['F1'],
    global: true,
    run: toggleHelp,
  },
  {
    id: 'help.startScreen',
    label: 'help.startScreen',
    group: 'help',
    run: () => openAppDialog('start'),
  },
  { id: 'help.tour', label: 'help.tour', group: 'help', run: startTour },
  {
    id: 'help.gettingStarted',
    label: 'help.gettingStarted',
    group: 'help',
    run: () => openHelp('getting-started'),
  },
  { id: 'help.basics', label: 'help.basics', group: 'help', run: () => openHelp('grafcet-basics') },
  {
    id: 'help.expressions',
    label: 'help.expressions',
    group: 'help',
    run: () => openHelp('expressions'),
  },
  {
    id: 'help.guide',
    label: 'help.guide',
    group: 'help',
    run: () => void window.open(guideUrl(), '_blank', 'noopener'),
  },
  {
    id: 'help.shortcuts',
    label: 'help.shortcuts',
    group: 'help',
    keys: ['?', 'Shift+?'],
    run: () => openAppDialog('shortcuts'),
  },
  {
    id: 'help.whatsNew',
    label: 'help.whatsNew',
    group: 'help',
    run: () => openAppDialog('changelog'),
  },
  { id: 'help.about', label: 'help.about', group: 'help', run: () => openAppDialog('about') },
  {
    id: 'help.feedback',
    label: 'help.feedback',
    group: 'help',
    run: () => openAppDialog('feedback'),
  },
  {
    id: 'file.settings',
    label: 'file.settings',
    group: 'file',
    keys: ['Mod+,'],
    global: true,
    run: () => openAppDialog('settings'),
  },
];

const byId = new Map(COMMANDS.map((c) => [c.id, c]));

export function getCommand(id: string): Command {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown command ${id}`);
  return c;
}

/** Editing commands are unavailable while simulating (the diagram is locked). */
export function isAvailable(c: Command): boolean {
  if (useUi.getState().mode === 'simulate') {
    if (c.group === 'insert' || c.group === 'tools' || c.id.startsWith('arrange.')) return false;
    if (c.group === 'edit' && c.id !== 'edit.escape' && c.id !== 'edit.selectAll') return false;
    if (c.id === 'file.new' || c.id === 'file.open') return false;
  }
  return !c.enabled || c.enabled();
}

export function runCommand(id: string): void {
  const c = getCommand(id);
  if (!isAvailable(c)) return;
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
      if (k === 'Escape') return 'Esc';
      return k;
    })
    .join(isApple ? '' : '+');
}
