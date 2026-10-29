import i18next from 'i18next';
import { create } from 'zustand';
import { createProject } from '@/core/model/factory';
import type { Project } from '@/core/model/types';
import {
  checkFileSize,
  ProjectFileError,
  parseProjectFile,
  serializeProject,
  suggestedFileName,
} from '@/core/io/projectFile';
import {
  decodeTextHash,
  GrafcetTextError,
  parseGrafcetText,
  projectToText,
  TEXT_PREFIX,
} from '@/core/io/grafcetText';
import { decodeShareHash, encodeShareHash, SHARE_PREFIX } from '@/core/io/shareLink';
import { tDynamic } from '@/i18n/dynamic';
import { fitToContent } from '@/editor/canvas/viewport';
import { doc, getProject } from '@/editor/store/document';
import { isDirty } from '@/editor/store/documentStore';
import { stopSimulation } from '@/editor/simulation/simStore';
import { useUi } from '@/editor/store/uiStore';
import { showDialog } from '../dialogs/dialogStore';
import { toast } from '../toasts';
import { addSnapshot, db, safely, touchRecent, type RecentEntry, type Snapshot } from './db';
import {
  downloadBlob,
  ensurePermission,
  pickFile,
  pickSaveHandle,
  supportsFileSystemAccess,
  writeHandle,
} from './fileAccess';
import { flushAutosave, rememberLastProject, readLastProject } from './autosave';

const t = i18next.t.bind(i18next);

interface SessionState {
  /** Name of the file the project was opened from / saved to, if any. */
  fileName: string | null;
  /** The empty project the app starts with on a first visit (nothing restored or opened yet). */
  fresh: boolean;
}

export const useSession = create<SessionState>(() => ({ fileName: null, fresh: true }));

let fileHandle: FileSystemFileHandle | null = null;

async function showError(title: string, message: string, details?: string[]): Promise<void> {
  await showDialog({
    title,
    message,
    details,
    actions: [{ id: 'ok', label: t('common.ok'), variant: 'primary' }],
    cancelId: 'ok',
  });
}

function loadErrorMessage(e: unknown): { message: string; details?: string[] } {
  if (e instanceof ProjectFileError) {
    return {
      message: t(`file.errors.${e.code}`, { version: e.version ?? '' }),
      details: e.details.length ? e.details : undefined,
    };
  }
  return { message: t('file.errors.unknown'), details: [String(e)] };
}

/** Swaps the open document. Never called before the user agreed to drop unsaved changes. */
async function loadIntoEditor(
  project: Project,
  opts: { dirty?: boolean; fileName?: string | null; handle?: FileSystemFileHandle | null } = {},
): Promise<void> {
  await flushAutosave();
  stopSimulation();
  doc.load(project, { dirty: opts.dirty });
  fileHandle = opts.handle ?? null;
  useSession.setState({ fileName: opts.fileName ?? null, fresh: false });
  useUi.setState({
    activeGrafcetId: project.grafcetOrder[0] ?? null,
    selection: {},
    selectedLink: null,
    editing: null,
    viewports: {},
  });
  rememberLastProject(project.id);
  requestAnimationFrame(() => {
    const gid = project.grafcetOrder[0];
    if (gid) fitToContent(gid);
  });
  await touchRecent({
    id: project.id,
    name: project.name,
    fileName: opts.fileName ?? undefined,
    openedAt: Date.now(),
    handle: opts.handle ?? undefined,
  });
}

/** Asks what to do with unsaved changes. Resolves true when it is OK to replace the document. */
export async function confirmDiscardIfDirty(): Promise<boolean> {
  const state = doc.store.getState();
  if (!isDirty(state)) return true;
  const choice = await showDialog({
    title: t('dialogs.unsaved.title'),
    message: t('dialogs.unsaved.message', { name: state.project.name }),
    actions: [
      { id: 'cancel', label: t('common.cancel') },
      { id: 'discard', label: t('dialogs.unsaved.discard'), variant: 'danger' },
      { id: 'save', label: t('dialogs.unsaved.save'), variant: 'primary' },
    ],
    cancelId: 'cancel',
  });
  if (choice === 'save') return saveProject();
  if (choice === 'discard') {
    // Keep a local copy anyway: "discard" must never mean "lost forever".
    await addSnapshot(state.project, 'beforeReplace');
    return true;
  }
  return false;
}

export async function newProject(): Promise<void> {
  if (!(await confirmDiscardIfDirty())) return;
  await loadIntoEditor(createProject(t('file.untitled')));
}

/** Opens a project made in the app (an example); asks first when there are unsaved changes. */
export async function openNewProject(project: Project): Promise<boolean> {
  if (!(await confirmDiscardIfDirty())) return false;
  await loadIntoEditor(project);
  return true;
}

/**
 * Converts a grafcet.io file into a new, unsaved project (saving writes a .grafcet.json; the
 * original file is never overwritten), then lists what the conversion changed, if anything.
 */
async function importGrafcetIoFile(file: File, text: string): Promise<void> {
  const { importGrafcetIo } = await import('@/core/io/grafcetIo');
  const name = file.name.replace(/\.grafcetio$/i, '').replace(/\.json$/i, '');
  let result: Awaited<ReturnType<typeof importGrafcetIo>>;
  try {
    result = importGrafcetIo(text, name, file.size);
  } catch (e) {
    const { message, details } = loadErrorMessage(e);
    await showError(t('file.errors.openTitle', { name: file.name }), message, details);
    return;
  }
  if (!(await confirmDiscardIfDirty())) return;
  await loadIntoEditor(result.project, { dirty: true });
  if (!result.notes.length) {
    toast(t('file.import.done', { name: file.name }), 'success', 5000);
    return;
  }
  await showDialog({
    title: t('file.import.title', { name: file.name }),
    message: t('file.import.notesIntro'),
    details: result.notes.map((n) => tDynamic(i18next.t, `file.import.notes.${n.code}`, n.params)),
    actions: [{ id: 'ok', label: t('common.ok'), variant: 'primary' }],
    cancelId: 'ok',
  });
}

/** Opens a project file (dialog, drag-and-drop, recent). Invalid files never replace the document. */
export async function openFile(file: File, handle?: FileSystemFileHandle): Promise<void> {
  let project: Project;
  try {
    checkFileSize(file.size);
    const text = await file.text();
    // grafcet.io files (.grafcetio) are converted; the check runs on the cheap marker first.
    if (/\.grafcetio$/i.test(file.name) || text.includes('grafcet.io')) {
      const { isGrafcetIo } = await import('@/core/io/grafcetIo');
      if (isGrafcetIo(file.name, text)) return await importGrafcetIoFile(file, text);
    }
    project = parseProjectFile(text, file.size);
  } catch (e) {
    const { message, details } = loadErrorMessage(e);
    await showError(t('file.errors.openTitle', { name: file.name }), message, details);
    return;
  }
  if (!(await confirmDiscardIfDirty())) return;
  const existing = await safely(() => db.projects.get(project.id));
  if (existing?.dirty) await addSnapshot(existing.project, 'beforeReplace');
  await loadIntoEditor(project, { fileName: file.name, handle: handle ?? null });
}

/**
 * Opens the project of a live session. Rejoining (`rejoin`: this device kept the room's records,
 * e.g. after a reload) updates the same open project in place. Otherwise unsaved changes are
 * asked about first, even when the room holds a project with the open one's id: whoever started
 * the room chose that id. Returns false when the user cancelled.
 */
export async function openLiveProject(project: Project, rejoin: boolean): Promise<boolean> {
  const same = getProject().id === project.id;
  if (!(same && rejoin)) {
    if (!(await confirmDiscardIfDirty())) return false;
    const existing = await safely(() => db.projects.get(project.id));
    if (existing?.dirty) await addSnapshot(existing.project, 'beforeReplace');
  }
  if (same) {
    doc.applyRemote(project);
    useSession.setState({ fresh: false });
    rememberLastProject(project.id);
    return true;
  }
  // Never saved to a file on this device.
  await loadIntoEditor(project, { dirty: true });
  return true;
}

/** Links longer than this may be cut by some chat and email apps; the user is told so. */
const LONG_LINK = 8000;

/** A URL of this page holding the whole project (see core/io/shareLink). */
export async function shareLink(project: Project = getProject()): Promise<string> {
  return location.href.replace(/#.*$/, '') + (await encodeShareHash(project));
}

/** File › Copy share link. */
export async function copyShareLink(): Promise<void> {
  const link = shareLink();
  let ok = true;
  try {
    // A pending clipboard item keeps the click's permission while the project is compressed
    // (required by Safari); browsers without it fall back to writeText.
    const blob = link.then((l) => new Blob([l], { type: 'text/plain' }));
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
  } catch {
    ok = await link
      .then((l) => navigator.clipboard.writeText(l))
      .then(
        () => true,
        () => false,
      );
  }
  const length = (await link).length;
  if (!ok) toast(t('export.copyFailed'), 'error');
  else if (length > LONG_LINK)
    toast(t('file.share.copiedLong', { count: length }), 'warning', 8000);
  else toast(t('file.share.copied'), 'success', 5000);
}

/**
 * File › Open from text: the dialog's text, and the error of the last attempt. A `#text=` link
 * that cannot be read opens the dialog with its text and the error, to fix or send back.
 */
export const useTextDraft = create<{ open: boolean; text: string; error: string | null }>(() => ({
  open: false,
  text: '',
  error: null,
}));

export const openTextDialog = () => useTextDraft.setState({ open: true, error: null });

/** A GRAFCET text error as the user reads it: the line and what is wrong. */
export function textErrorMessage(e: unknown): string {
  if (!(e instanceof GrafcetTextError)) return String(e);
  const message = tDynamic(t, `file.text.errors.${e.code}`, e.params);
  return e.line ? t('file.text.line', { line: e.line, message }) : message;
}

/**
 * Opens the project a GRAFCET text describes, in place of the open one (asking first when it has
 * unsaved changes). Throws GrafcetTextError when the text cannot be read; false when cancelled.
 */
export async function openProjectText(text: string): Promise<boolean> {
  const project = parseGrafcetText(text);
  if (!(await confirmDiscardIfDirty())) return false;
  // Like a share link: not unsaved work yet, so trying the next variant asks nothing.
  await loadIntoEditor(project);
  toast(t('file.text.opened', { name: project.name }), 'success', 5000);
  return true;
}

/** File › Copy as text: the project as GRAFCET text, to paste to an AI assistant. */
export async function copyProjectText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(projectToText(getProject()));
    toast(t('file.text.copied'), 'success', 6000);
  } catch {
    toast(t('export.copyFailed'), 'error');
  }
}

/** A `#text=` link: the chart opens, or the dialog shows its text and what is wrong. */
async function openTextLink(hash: string): Promise<void> {
  let text = '';
  try {
    text = decodeTextHash(hash);
    await openProjectText(text);
  } catch (e) {
    useTextDraft.setState({ open: true, text, error: textErrorMessage(e) });
  }
}

/**
 * Opens the project of a share link or a GRAFCET text link (`#text=`) in the address bar (on
 * launch, or pasted into an open tab) and removes the link from the URL, so a reload restores the
 * user's own work. Returns false when the URL holds no such link.
 */
export async function openSharedLink(): Promise<boolean> {
  const hash = location.hash;
  if (hash.startsWith(TEXT_PREFIX)) {
    history.replaceState(null, '', location.pathname + location.search);
    await openTextLink(hash);
    return true;
  }
  if (!hash.startsWith(SHARE_PREFIX)) return false;
  history.replaceState(null, '', location.pathname + location.search);
  let project: Project;
  try {
    project = await decodeShareHash(hash);
  } catch (e) {
    const { message, details } = loadErrorMessage(e);
    await showError(t('file.share.openTitle'), message, details);
    return true;
  }
  if (!(await confirmDiscardIfDirty())) return true;
  const existing = await safely(() => db.projects.get(project.id));
  if (existing?.dirty) await addSnapshot(existing.project, 'beforeReplace');
  await loadIntoEditor(project);
  toast(t('file.share.opened', { name: project.name }), 'success', 5000);
  return true;
}

export async function openProjectDialog(): Promise<void> {
  try {
    const picked = await pickFile();
    if (picked) await openFile(picked.file, picked.handle);
  } catch (e) {
    await showError(t('file.errors.openTitle', { name: '' }), String(e));
  }
}

function fileContent(project: Project): string {
  return serializeProject({
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  });
}

async function afterSave(project: Project, fileName: string): Promise<void> {
  doc.markSaved();
  useSession.setState({ fileName });
  await addSnapshot(project, 'save');
  await touchRecent({
    id: project.id,
    name: project.name,
    fileName,
    openedAt: Date.now(),
    handle: fileHandle ?? undefined,
  });
  await flushAutosave();
}

/** Ctrl/Cmd+S: writes to the same file when possible, otherwise Save As / download. */
export async function saveProject(): Promise<boolean> {
  const project = getProject();
  if (!fileHandle) return saveProjectAs();
  try {
    if (!(await ensurePermission(fileHandle, 'readwrite'))) return saveProjectAs();
    await writeHandle(fileHandle, fileContent(project));
    await afterSave(project, fileHandle.name);
    return true;
  } catch (e) {
    await showError(t('file.errors.saveTitle'), t('file.errors.saveFailed'), [String(e)]);
    return false;
  }
}

/** Ctrl/Cmd+Shift+S. Without the File System Access API the file is downloaded. */
export async function saveProjectAs(): Promise<boolean> {
  const project = getProject();
  const name = suggestedFileName(project);
  try {
    if (!supportsFileSystemAccess) {
      downloadBlob(fileContent(project), name, 'application/json');
      await afterSave(project, name);
      return true;
    }
    const handle = await pickSaveHandle(name);
    if (!handle) return false;
    await writeHandle(handle, fileContent(project));
    fileHandle = handle;
    await afterSave(project, handle.name);
    return true;
  } catch (e) {
    await showError(t('file.errors.saveTitle'), t('file.errors.saveFailed'), [String(e)]);
    return false;
  }
}

/** Downloads a copy without changing the current file binding (also used by the error boundary). */
export function downloadCopy(project: Project = getProject()): void {
  downloadBlob(fileContent(project), suggestedFileName(project), 'application/json');
}

function parseStored(project: Project): Project | null {
  try {
    return parseProjectFile(JSON.stringify(project));
  } catch {
    return null;
  }
}

export async function openRecent(entry: RecentEntry): Promise<void> {
  const stored = await safely(() => db.projects.get(entry.id));
  // Unsaved local work wins over the (older) file on disk.
  if (entry.handle && !stored?.dirty) {
    try {
      if (await ensurePermission(entry.handle, 'read')) {
        await openFile(await entry.handle.getFile(), entry.handle);
        return;
      }
    } catch {
      // File moved or deleted: fall back to the local copy below.
    }
  }
  const project = stored ? parseStored(stored.project) : null;
  if (!stored || !project) {
    await safely(() => db.recent.delete(entry.id));
    await showError(
      t('file.errors.recentTitle'),
      t('file.errors.recentMissing', { name: entry.name }),
    );
    return;
  }
  if (!(await confirmDiscardIfDirty())) return;
  await loadIntoEditor(project, {
    dirty: stored.dirty,
    fileName: stored.fileName,
    handle: entry.handle ?? null,
  });
}

export async function restoreSnapshot(snapshot: Snapshot): Promise<void> {
  const project = parseStored(snapshot.project);
  if (!project) {
    await showError(t('history.local.title'), t('file.errors.invalid'));
    return;
  }
  if (!(await confirmDiscardIfDirty())) return;
  await loadIntoEditor(project, {
    dirty: true,
    fileName: useSession.getState().fileName,
    handle: fileHandle,
  });
}

/**
 * On launch: reopen the last project as it was, unsaved changes included (crash, reload, closed
 * tab): the browser copy is always the latest; Save writes it to a file.
 */
export async function startup(): Promise<void> {
  const lastId = readLastProject();
  let stored = lastId ? await safely(() => db.projects.get(lastId)) : undefined;
  stored ??= await safely(() => db.projects.orderBy('updatedAt').last());
  const project = stored ? parseStored(stored.project) : null;
  if (!stored || !project) {
    const gid = getProject().grafcetOrder[0];
    if (gid) requestAnimationFrame(() => fitToContent(gid));
    return;
  }
  const recent = await safely(() => db.recent.get(stored.id));
  await loadIntoEditor(project, {
    dirty: stored.dirty,
    fileName: stored.fileName,
    handle: recent?.handle ?? null,
  });
}
