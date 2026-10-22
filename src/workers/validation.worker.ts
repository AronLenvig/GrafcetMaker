import type { Project } from '@/core/model/types';
import { validateProject } from '@/core/validation/validate';

export interface ValidationRequest {
  id: number;
  project: Project;
}

/** Runs validation off the main thread; replies with the issues and how long it took. */
self.onmessage = (e: MessageEvent<ValidationRequest>) => {
  const t0 = performance.now();
  const issues = validateProject(e.data.project);
  self.postMessage({ id: e.data.id, issues, ms: performance.now() - t0 });
};
