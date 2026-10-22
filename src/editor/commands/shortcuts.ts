import { isDialogOpen } from '@/app/dialogs/dialogStore';
import { useUi } from '../store/uiStore';
import { COMMANDS, isApple, isAvailable, type Command } from './registry';
import { copySelection, cutSelection, pasteText } from './edit';

function comboOf(e: KeyboardEvent): string {
  const mod = isApple ? e.metaKey : e.ctrlKey;
  let key = e.key;
  if (key.length === 1) key = key.toUpperCase();
  if (key === ' ') key = 'Space';
  const parts: string[] = [];
  if (mod) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && key !== 'Shift') parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

const table = new Map<string, Command>();
for (const c of COMMANDS) for (const k of c.keys ?? []) table.set(k.toUpperCase(), c);

function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement)
    return !['checkbox', 'radio', 'button', 'range', 'color'].includes(el.type);
  return false;
}

/**
 * Focus is in an interactive control that handles its own keys (menus, dialogs, lists, tab strips).
 * In a tab strip only plain keys are its own: Ctrl/Cmd shortcuts (undo, save…) still apply.
 */
function isInsideWidget(el: EventTarget | null, modified: boolean): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[role="menu"],[role="dialog"],[role="listbox"]')) return true;
  return !modified && !!el.closest('[role="tablist"]');
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.defaultPrevented || e.isComposing) return;
  if (isDialogOpen() || useUi.getState().paletteOpen) return;
  const cmd = table.get(comboOf(e).toUpperCase());
  if (!cmd) return;
  // Plain keys (Enter, arrows, letters) only act on the diagram when nothing else has focus.
  const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
  if (!cmd.global && (isTextField(e.target) || isInsideWidget(e.target, !plain))) return;
  if (
    plain &&
    !cmd.global &&
    e.target instanceof HTMLElement &&
    e.target.closest('button,a,[role="button"]')
  )
    return;
  if (!isAvailable(cmd)) return;
  e.preventDefault();
  void cmd.run();
}

function canvasHasFocusContext(e: Event): boolean {
  return (
    !isTextField(e.target) &&
    !isDialogOpen() &&
    !useUi.getState().paletteOpen &&
    useUi.getState().mode === 'edit'
  );
}

/** Installs global keyboard shortcuts and clipboard handlers. Returns an uninstaller. */
export function installShortcuts(): () => void {
  const onCopy = (e: ClipboardEvent) => {
    if (canvasHasFocusContext(e) && copySelection(e.clipboardData)) e.preventDefault();
  };
  const onCut = (e: ClipboardEvent) => {
    if (!canvasHasFocusContext(e) || !Object.keys(useUi.getState().selection).length) return;
    cutSelection(e.clipboardData);
    e.preventDefault();
  };
  const onPaste = (e: ClipboardEvent) => {
    if (!canvasHasFocusContext(e)) return;
    if (pasteText(e.clipboardData?.getData('text/plain') ?? null)) e.preventDefault();
  };
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('copy', onCopy);
  document.addEventListener('cut', onCut);
  document.addEventListener('paste', onPaste);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('cut', onCut);
    document.removeEventListener('paste', onPaste);
  };
}
