import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { sameJson } from '@/core/model/json';
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
  /** Increments each time another project is loaded (a live session leaves when it changes). */
  generation: number;
}

export type Recipe = (draft: Project) => void;

const MAX_HISTORY = 300;

export function isDirty(s: DocumentState): boolean {
  return s.cleanAt === undefined || (s.past[s.past.length - 1] ?? null) !== s.cleanAt;
}

type Path = Patch['path'];

const ELEMENT_MAPS = new Set<unknown>(['steps', 'transitions', 'actions', 'comments']);

/**
 * The part of the project a patch changes, as undo and redo compare it: one field of one record
 * (a step's position, a transition's receptivity, the project name…), or a whole record or map
 * when the patch adds or removes it.
 */
function fieldPath(path: Path): Path {
  const [top, , part] = path;
  if (top === 'variables' || top === 'scenarios') return path.slice(0, 3);
  if (top === 'grafcets') return path.slice(0, ELEMENT_MAPS.has(part) ? 5 : 3);
  return path.slice(0, 1);
}

function valueAt(value: unknown, path: Path): unknown {
  let v = value;
  for (const k of path) {
    if (typeof v !== 'object' || v === null) return undefined;
    v = (v as Record<string | number, unknown>)[k];
  }
  return v;
}

/** Applies patches; when some no longer fit the project, applies field by field, skipping those. */
function applySafely(project: Project, patches: Patch[]): Project {
  try {
    return applyPatches(project, patches);
  } catch {
    const groups = new Map<string, Patch[]>();
    for (const p of patches) {
      const key = JSON.stringify(fieldPath(p.path));
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    let out = project;
    for (const group of groups.values()) {
      try {
        out = applyPatches(out, group);
      } catch {
        // A record deleted meanwhile (live session): nothing left to restore there.
      }
    }
    return out;
  }
}

/**
 * Undo (`forward` false) or redo of one entry against `project`, where `expected` is the project
 * as the entry left it. Fields that differ from `expected` were changed by someone else since (a
 * live session): those patches are skipped, so undo never takes back another person's work. The
 * entry returned holds the patches applied (the same object when nothing was skipped), or null
 * when nothing could be applied.
 */
function replay(
  project: Project,
  expected: Project | undefined,
  entry: HistoryEntry,
  forward: boolean,
): { project: Project; entry: HistoryEntry | null; partial: boolean } {
  const patches = forward ? entry.patches : entry.inverse;
  if (!expected || expected === project) {
    try {
      return { project: applyPatches(project, patches), entry, partial: false };
    } catch {
      return { project, entry: null, partial: true };
    }
  }
  // Each patch is governed by the shortest compared path containing it (a removed record also
  // covers the fields of that record changed in the same entry).
  const paths = [...entry.patches, ...entry.inverse]
    .map((p) => fieldPath(p.path))
    .sort((a, b) => a.length - b.length);
  const verdicts = new Map<string, boolean>();
  const keep = (p: Patch) => {
    const f = fieldPath(p.path);
    const g = paths.find((x) => x.length <= f.length && x.every((k, i) => k === f[i]))!;
    const key = JSON.stringify(g);
    let ok = verdicts.get(key);
    if (ok === undefined) {
      ok = sameJson(valueAt(project, g), valueAt(expected, g));
      verdicts.set(key, ok);
    }
    return ok;
  };
  const kept: HistoryEntry = {
    label: entry.label,
    patches: entry.patches.filter(keep),
    inverse: entry.inverse.filter(keep),
  };
  const partial = [...verdicts.values()].some((ok) => !ok);
  const applied = forward ? kept.patches : kept.inverse;
  if (!applied.length) return { project, entry: null, partial };
  try {
    return { project: applyPatches(project, applied), entry: partial ? kept : entry, partial };
  } catch {
    return { project, entry: null, partial: true };
  }
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
  /**
   * Undo / redo. In a live session, changes someone else made since are kept: returns true when
   * some of the entry was skipped for that reason.
   */
  undo: () => boolean;
  redo: () => boolean;
  /** Starts a transaction: subsequent update() calls become a single history entry on commit(). */
  begin: (label: string) => void;
  update: (recipe: Recipe) => void;
  commit: () => void;
  cancel: () => void;
  /** Replaces the document and clears history. */
  load: (project: Project, opts?: { dirty?: boolean }) => void;
  /** Shows other people's changes (live session): the document changes, the history does not. */
  applyRemote: (project: Project) => void;
  markSaved: () => void;
}

export function createDocumentStore(initial: Project): DocumentStore {
  const store = createStore<DocumentState>()(() => ({
    project: initial,
    past: [],
    future: [],
    cleanAt: null,
    revision: 0,
    generation: 0,
  }));
  let tx: { label: string; patches: Patch[]; inverse: Patch[] } | null = null;
  /** The project as each history entry left it (compared by undo and redo, see replay). */
  const stamps = new WeakMap<HistoryEntry, Project>();

  const pushEntry = (entry: HistoryEntry, project: Project) => {
    const s = store.getState();
    const past = [...s.past, entry];
    if (past.length > MAX_HISTORY) past.shift();
    stamps.set(entry, project);
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
      project: applySafely(s.project, t.inverse),
      revision: s.revision + 1,
    }));
  };

  const begin = (label: string) => {
    if (tx) commit();
    tx = { label, patches: [], inverse: [] };
  };

  // An entry that nothing is left of (someone else changed all of it) is dropped and the next one
  // is tried, so one Undo always undoes something when it can.
  const undo = (): boolean => {
    if (tx) cancel();
    const s = store.getState();
    let { project, past, future } = s;
    let partial = false;
    while (past.length) {
      const entry = past[past.length - 1]!;
      past = past.slice(0, -1);
      const r = replay(project, stamps.get(entry), entry, false);
      partial ||= r.partial;
      if (!r.entry) continue;
      project = r.project;
      future = [r.entry, ...future];
      stamps.set(r.entry, project);
      break;
    }
    if (past !== s.past) store.setState({ project, past, future, revision: s.revision + 1 });
    return partial;
  };

  const redo = (): boolean => {
    if (tx) commit();
    const s = store.getState();
    let { project, past, future } = s;
    let partial = false;
    while (future.length) {
      const entry = future[0]!;
      future = future.slice(1);
      const r = replay(project, stamps.get(entry), entry, true);
      partial ||= r.partial;
      if (!r.entry) continue;
      project = r.project;
      past = [...past, r.entry];
      stamps.set(r.entry, project);
      break;
    }
    if (future !== s.future) store.setState({ project, past, future, revision: s.revision + 1 });
    return partial;
  };

  const load = (project: Project, opts?: { dirty?: boolean }) => {
    tx = null;
    store.setState((s) => ({
      project,
      past: [],
      future: [],
      cleanAt: opts?.dirty ? undefined : null,
      revision: s.revision + 1,
      generation: s.generation + 1,
    }));
  };

  const applyRemote = (project: Project) => {
    store.setState((s) => (s.project === project ? s : { project, revision: s.revision + 1 }));
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
    applyRemote,
    markSaved,
  };
}
