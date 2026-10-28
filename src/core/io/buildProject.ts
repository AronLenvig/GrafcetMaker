/**
 * A project from a compact description: variables, then grafcets as steps (with their actions),
 * transitions by step numbers, comments and free actions. Built with the editor's own model
 * operations and auto-layout, so the result is drawn like a user's chart. Used by the examples
 * and the text format (grafcetText.ts).
 */
import { ACTION_HEIGHT, computeGeometry, grafcetBounds, PITCH, ROW } from '../layout/geometry';
import { autoLayout } from '../layout/autoLayout';
import { createGrafcet, createProject, newId } from '../model/factory';
import { addAction, addComment, addFreeAction, addStep, addTransition } from '../model/ops';
import type {
  ActionKind,
  GrafcetKind,
  Project,
  ScenarioEvent,
  Step,
  StepKind,
  Variable,
  VariableType,
} from '../model/types';

export type SpecAction = [kind: ActionKind, text: string, condition?: string];
export interface SpecStep {
  n: number;
  label?: string;
  kind?: StepKind;
  /** Column hint (0 = main line) ordering branches left to right before auto-layout. */
  col?: number;
  actions?: SpecAction[];
  /** Macro-step or enclosing step: the name of its expansion or enclosed grafcet. */
  ref?: string;
}
export interface SpecGrafcet {
  name: string;
  kind?: GrafcetKind;
  steps: SpecStep[];
  /** [from step numbers, receptivity, to step numbers] */
  transitions: [number[], string, number[]][];
  comments?: string[];
  /** Actions without a step (always active), drawn below the explanations. */
  free?: SpecAction[];
}
export type SpecVariable = [
  name: string,
  type: VariableType,
  dir: Variable['direction'],
  address?: string,
  comment?: string,
  initial?: boolean | number,
];
export interface ProjectSpec {
  name: string;
  variables: SpecVariable[];
  grafcets: SpecGrafcet[];
  scenarios?: { name: string; events: ScenarioEvent[] }[];
}

export function buildProject(spec: ProjectSpec): Project {
  const p = createProject(spec.name);
  p.grafcets = {};
  p.grafcetOrder = [];
  for (const [name, type, direction, address, comment, initial] of spec.variables) {
    const v: Variable = { id: newId(), name, type, direction };
    if (address) v.address = address;
    if (comment) v.comment = comment;
    if (initial !== undefined) v.initialValue = initial;
    p.variables[v.id] = v;
  }
  const refs: [Step, string][] = [];
  for (const eg of spec.grafcets) {
    const g = createGrafcet(eg.name, eg.kind ?? 'partial');
    const ids = new Map<number, string>();
    eg.steps.forEach((s, i) => {
      const step = addStep(
        g,
        { x: 200 + (s.col ?? 0) * 160, y: 100 + i * PITCH },
        s.kind ?? 'normal',
        s.n,
      );
      if (s.label) step.label = s.label;
      if (s.ref) refs.push([step, s.ref]);
      ids.set(s.n, step.id);
      for (const [kind, text, condition] of s.actions ?? []) {
        const a = addAction(g, step.id, kind, text);
        if (condition) a.condition = condition;
      }
    });
    for (const [from, receptivity, to] of eg.transitions) {
      const at = (n: number | undefined) =>
        n === undefined ? undefined : g.steps[ids.get(n)!]!.position;
      const above = at(from[0]);
      const below = at(to[0]);
      // Branch order comes from x: a simple link takes the column of the step it leads to.
      const x = from.length > 1 || to.length > 1 || !below ? (above ?? below)!.x : below.x;
      const y = above ? above.y + ROW : below!.y - ROW;
      addTransition(
        g,
        { x, y },
        from.map((n) => ids.get(n)!),
        to.map((n) => ids.get(n)!),
        receptivity,
      );
    }
    for (const [id, pos] of autoLayout(g)) {
      const el = g.steps[id] ?? g.transitions[id];
      if (el) el.position = pos;
    }
    // Explanations to the right of the chart.
    const b = grafcetBounds(g, computeGeometry(g));
    let y = b ? b.y : 80;
    const x = (b ? b.x + b.width : 300) + 60;
    for (const text of eg.comments ?? []) {
      const c = addComment(g, { x, y }, text);
      y += (c.text.split('\n').length + 1) * 16 + 24;
    }
    for (const [kind, text, condition] of eg.free ?? []) {
      // Room above the box for its condition.
      const a = addFreeAction(g, { x, y: y + 20 }, kind, text);
      if (condition) a.condition = condition;
      y += 20 + ACTION_HEIGHT + 24;
    }
    p.grafcets[g.id] = g;
    p.grafcetOrder.push(g.id);
  }
  const byName = new Map(Object.values(p.grafcets).map((g) => [g.name, g.id]));
  for (const [step, name] of refs) step.refGrafcetId = byName.get(name)!;
  if (spec.scenarios?.length) {
    p.scenarios = {};
    for (const sc of spec.scenarios) {
      const id = newId();
      p.scenarios[id] = { id, name: sc.name, events: sc.events };
    }
  }
  return p;
}
