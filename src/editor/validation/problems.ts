import i18next from 'i18next';
import { create } from 'zustand';
import { toast } from '@/app/toasts';
import type { Id, Project } from '@/core/model/types';
import type { Issue } from '@/core/validation/types';
import type { ValidationReply } from '@/workers/validation.worker';
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

/** The issues last published, as text: a run that finds the same ones changes nothing. */
let publishedKey = '';
/** The last validation error shown, so a failure repeated on every edit is shown once. */
let failure: string | null = null;

function publish(issues: Issue[], ms: number): void {
  failure = null;
  const key = JSON.stringify(issues);
  if (key === publishedKey) {
    useProblems.setState({ ms });
    return;
  }
  publishedKey = key;
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

function failed(message: string): void {
  if (message === failure) return;
  failure = message;
  toast(i18next.t('problems.checkFailed', { message }), 'error', 8000);
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Validation in this thread, loaded only when the worker is not available. */
async function validateInline(project: Project): Promise<{ issues: Issue[]; ms: number }> {
  const { validateProject } = await import('@/core/validation/validate');
  const t0 = performance.now();
  return { issues: validateProject(project), ms: performance.now() - t0 };
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
    const id = seq;
    validateInline(project).then(
      (r) => id === seq && publish(r.issues, r.ms),
      (err: unknown) => failed(errorText(err)),
    );
  };
  if (worker) {
    worker.onmessage = (e: MessageEvent<ValidationReply>) => {
      if (e.data.id !== seq) return;
      if ('error' in e.data) failed(e.data.error);
      else publish(e.data.issues, e.data.ms);
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
