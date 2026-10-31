import { useUi } from '../store/uiStore';

/**
 * Commands: what the menus, the command palette, the toolbar and the keyboard shortcuts run. The
 * list is app-level wiring (src/app/commands/registry.ts) registered once at startup; the editor
 * and the panels look commands up by id.
 */
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

const byId = new Map<string, Command>();

export function registerCommands(list: readonly Command[]): void {
  for (const c of list) byId.set(c.id, c);
}

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
