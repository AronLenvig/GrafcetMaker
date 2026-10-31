import type { Project } from '@/core/model/types';
import type { Issue } from '@/core/validation/types';
import { validateProject } from '@/core/validation/validate';

export interface ValidationRequest {
  id: number;
  project: Project;
}

export type ValidationReply =
  | { id: number; issues: Issue[]; ms: number }
  /** Validation threw: shown to the user (running it in the page would throw the same). */
  | { id: number; error: string };

/** Runs validation off the main thread; replies with the issues and how long it took. */
self.onmessage = (e: MessageEvent<ValidationRequest>) => {
  const t0 = performance.now();
  let reply: ValidationReply;
  try {
    reply = { id: e.data.id, issues: validateProject(e.data.project), ms: performance.now() - t0 };
  } catch (err) {
    reply = { id: e.data.id, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(reply);
};
