import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Project } from '@/core/model/types';

enablePatches();

export interface HistoryEntry {
  label: string;
  patches: Patch[];
  inverse: Patch[];
}

export interface DocumentState {
  project: Project;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Top of `past` when last saved; `undefined` = never saved since load (always dirty). */
  cleanAt: HistoryEntry | null | undefined;
  /** Increments on every document change (including transaction steps). */
  revision: number;
}

export type Recipe = (draft: Project) => void;

const MAX_HISTORY = 300;

export function isDirty(s: DocumentState): boolean {
  return s.cleanAt === undefined || (s.past[s.past.length - 1] ?? null) !== s.cleanAt;
}

/** Folds a transaction made only of `replace` ops into one patch per path (drags stay small). */
function compact(entry: HistoryEntry): HistoryEntry {
  if (!entry.patches.every((p) => p.op === 'replace')) return entry;
  const keys = entry.patches.map((p) => p.path.join('\u0000'));
  const unique = [...new Set(keys)];
  for (const a of unique) {
    for (const b of unique) if (a !== b && b.startsWith(a + '\u0000')) return entry;
  }
  const lastForward = new Map<string, Patch>();
  entry.patches.forEach((p, i) => lastForward.set(keys[i]!, p));
  // inverse is in reverse application order: the last occurrence restores the original value.
  const originalValue = new Map<string, Patch>();
  for (const p of entry.inverse) originalValue.set(p.path.join('\u0000'), p);
  return {
    label: entry.label,
    patches: unique.map((k) => lastForward.get(k)!),
    inverse: unique.map((k) => originalValue.get(k)!),
  };
}

export interface DocumentStore {
  store: StoreApi<DocumentState>;
  /** Applies one undoable change. Returns false (and records nothing) if nothing changed. */
  execute: (label: string, recipe: Recipe) => boolean;
  undo: () => void;
  redo: () => void;
  /** Starts a transaction: subsequent update() calls become a single history entry on commit(). */
  begin: (label: string) => void;
  update: (recipe: Recipe) => void;
  commit: () => void;
  cancel: () => void;
  /** Replaces the document and clears history. */
  load: (project: Project, opts?: { dirty?: boolean }) => void;
  markSaved: () => void;
}

export function createDocumentStore(initial: Project): DocumentStore {
  const store = createStore<DocumentState>()(() => ({
    project: initial,
    past: [],
    future: [],
    cleanAt: null,
    revision: 0,
  }));
  let tx: { label: string; patches: Patch[]; inverse: Patch[] } | null = null;

  const pushEntry = (entry: HistoryEntry, project: Project) => {
    const s = store.getState();
    const past = [...s.past, entry];
    if (past.length > MAX_HISTORY) past.shift();
    store.setState({ project, past, future: [], revision: s.revision + 1 });
  };

  const produce = (recipe: Recipe) =>
    produceWithPatches(store.getState().project, (d: Project) => {
      recipe(d);
    });

  const update = (recipe: Recipe) => {
    if (!tx) {
      execute('Edit', recipe);
      return;
    }
    const [project, patches, inverse] = produce(recipe);
    if (!patches.length) return;
    tx.patches.push(...patches);
    tx.inverse.unshift(...inverse);
    store.setState((s) => ({ project, revision: s.revision + 1 }));
  };

  const execute = (label: string, recipe: Recipe): boolean => {
    if (tx) {
      const before = tx.patches.length;
      update(recipe);
      return tx.patches.length > before;
    }
    const [project, patches, inverse] = produce(recipe);
    if (!patches.length) return false;
    pushEntry({ label, patches, inverse }, project);
    return true;
  };

  const commit = () => {
    const t = tx;
    tx = null;
    if (!t || !t.patches.length) return;
    pushEntry(
      compact({ label: t.label, patches: t.patches, inverse: t.inverse }),
      store.getState().project,
    );
  };

  const cancel = () => {
    const t = tx;
    tx = null;
    if (!t || !t.patches.length) return;
    store.setState((s) => ({
      project: applyPatches(s.project, t.inverse),
      revision: s.revision + 1,
    }));
  };

  const begin = (label: string) => {
    if (tx) commit();
    tx = { label, patches: [], inverse: [] };
  };

  const undo = () => {
    if (tx) cancel();
    const s = store.getState();
    const entry = s.past[s.past.length - 1];
    if (!entry) return;
    store.setState({
      project: applyPatches(s.project, entry.inverse),
      past: s.past.slice(0, -1),
      future: [entry, ...s.future],
      revision: s.revision + 1,
    });
  };

  const redo = () => {
    if (tx) commit();
    const s = store.getState();
    const entry = s.future[0];
    if (!entry) return;
    store.setState({
      project: applyPatches(s.project, entry.patches),
      past: [...s.past, entry],
      future: s.future.slice(1),
      revision: s.revision + 1,
    });
  };

  const load = (project: Project, opts?: { dirty?: boolean }) => {
    tx = null;
    store.setState((s) => ({
      project,
      past: [],
      future: [],
      cleanAt: opts?.dirty ? undefined : null,
      revision: s.revision + 1,
    }));
  };

  const markSaved = () => {
    store.setState((s) => ({ cleanAt: s.past[s.past.length - 1] ?? null }));
  };

  return {
    store,
    execute,
    undo,
    redo,
    begin,
    update,
    commit,
    cancel,
    load,
    markSaved,
  };
}
