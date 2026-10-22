import { customAlphabet } from 'nanoid';
import { SCHEMA_VERSION } from './schema';
import type { Grafcet, GrafcetKind, Point, Project, Step, StepKind } from './types';

/** URL-safe, unambiguous ids; 12 chars keeps files compact with negligible collision risk. */
export const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export function createStep(number: number, position: Point, kind: StepKind = 'normal'): Step {
  return { id: newId(), number, kind, position: { ...position } };
}

export function createGrafcet(name: string, kind: GrafcetKind = 'partial'): Grafcet {
  return { id: newId(), name, kind, steps: {}, transitions: {}, actions: {}, comments: {} };
}

/** A new project: one partial grafcet G1 with initial step 0, ready for `Enter` to append. */
export function createProject(name: string, now: Date = new Date()): Project {
  const g = createGrafcet('G1');
  const s = createStep(0, { x: 200, y: 100 }, 'initial');
  g.steps[s.id] = s;
  const iso = now.toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    name,
    meta: { author: '', company: '', revision: 'A', createdAt: iso, updatedAt: iso },
    variables: {},
    grafcets: { [g.id]: g },
    grafcetOrder: [g.id],
  };
}
