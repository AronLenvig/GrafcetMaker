import { create } from 'zustand';
import type { Id, Project } from '@/core/model/types';
import type { Issue } from '@/core/validation/types';
import { validateProject } from '@/core/validation/validate';
import { doc } from '../store/document';

interface ProblemsState {
  issues: Issue[];
  /** Issues per element id (every element an issue designates). */
  byElement: Map<Id, Issue[]>;
  counts: { error: number; warning: number; info: number };
  /** Duration of the last validation run, in ms. */
  ms: number;
}

export const useProblems = create<ProblemsState>(() => ({
  issues: [],
  byElement: new Map(),
  counts: { error: 0, warning: 0, info: 0 },
  ms: 0,
}));

const DEBOUNCE_MS = 150;

function publish(issues: Issue[], ms: number): void {
  const byElement = new Map<Id, Issue[]>();
  const counts = { error: 0, warning: 0, info: 0 };
  for (const i of issues) {
    counts[i.severity]++;
    for (const id of i.elementIds) {
      const list = byElement.get(id);
      if (list) list.push(i);
      else byElement.set(id, [i]);
    }
  }
  useProblems.setState({ issues, byElement, counts, ms });
}

let started = false;

/** Validates the document in a Web Worker after every change (debounced). */
export function startValidation(): void {
  if (started) return;
  started = true;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL('../../workers/validation.worker.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    worker = null;
  }
  const runInline = (project: Project) => {
    const t0 = performance.now();
    publish(validateProject(project), performance.now() - t0);
  };
  if (worker) {
    worker.onmessage = (e: MessageEvent<{ id: number; issues: Issue[]; ms: number }>) => {
      if (e.data.id === seq) publish(e.data.issues, e.data.ms);
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      runInline(doc.store.getState().project);
    };
  }
  const run = () => {
    const project = doc.store.getState().project;
    seq++;
    if (worker) worker.postMessage({ id: seq, project });
    else runInline(project);
  };
  doc.store.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, DEBOUNCE_MS);
  });
  run();
}
