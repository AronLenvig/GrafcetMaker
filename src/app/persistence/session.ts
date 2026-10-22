import i18next from 'i18next';
import { create } from 'zustand';
import { createProject } from '@/core/model/factory';
import type { Project } from '@/core/model/types';
import {
  ProjectFileError,
  parseProjectFile,
  serializeProject,
  suggestedFileName,
} from '@/core/io/projectFile';
import { fitToContent } from '@/editor/canvas/viewport';
import { doc, getProject } from '@/editor/store/document';
import { isDirty } from '@/editor/store/documentStore';
import { stopSimulation } from '@/editor/simulation/simStore';
import { useUi } from '@/editor/store/uiStore';
import { showDialog } from '../dialogs/dialogStore';
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
}

export const useSession = create<SessionState>(() => ({ fileName: null }));

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
  useSession.setState({ fileName: opts.fileName ?? null });
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

/** Opens a project file (dialog, drag-and-drop, recent). Invalid files never replace the document. */
export async function openFile(file: File, handle?: FileSystemFileHandle): Promise<void> {
  let project: Project;
  try {
    project = parseProjectFile(await file.text(), file.size);
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
