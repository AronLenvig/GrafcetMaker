import { doc } from '@/editor/store/document';
import { isDirty } from '@/editor/store/documentStore';
import { addSnapshot, db, safely } from './db';

const DEBOUNCE_MS = 500;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const LAST_PROJECT_KEY = 'grafcetmaker.lastProject';

let timer: ReturnType<typeof setTimeout> | undefined;
let lastSnapshotAt = Date.now();
let lastSnapshotRevision = -1;
let fileNameOf: () => string | undefined = () => undefined;

export function rememberLastProject(id: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } catch {
    // Not remembered: startup falls back to the most recently updated project.
  }
}

export function readLastProject(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

/** Writes the open document to IndexedDB now (cancels the pending debounce). */
export async function flushAutosave(): Promise<void> {
  if (timer === undefined) return;
  clearTimeout(timer);
  timer = undefined;
  const s = doc.store.getState();
  const { project } = s;
  await safely(() =>
    db.projects.put({
      id: project.id,
      name: project.name,
      project,
      updatedAt: Date.now(),
      dirty: isDirty(s),
      fileName: fileNameOf(),
    }),
  );
  rememberLastProject(project.id);
  const known = await safely(() => db.recent.get(project.id));
  if (!known)
    await safely(() => db.recent.put({ id: project.id, name: project.name, openedAt: Date.now() }));
  if (Date.now() - lastSnapshotAt > SNAPSHOT_INTERVAL_MS && s.revision !== lastSnapshotRevision) {
    lastSnapshotAt = Date.now();
    lastSnapshotRevision = s.revision;
    await addSnapshot(project, 'auto');
  }
}

function schedule(): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushAutosave();
  }, DEBOUNCE_MS);
}

/** Autosaves after every command (debounced) and when the page is hidden or closed. */
export function startAutosave(getFileName: () => string | undefined): void {
  fileNameOf = getFileName;
  doc.store.subscribe((s, prev) => {
    if (s.project !== prev.project || s.cleanAt !== prev.cleanAt) schedule();
  });
  window.addEventListener('pagehide', () => void flushAutosave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAutosave();
  });
}
