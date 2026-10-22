/**
 * Compiles a project into an indexed program for the simulator: steps and transitions get dense
 * indices, expressions are parsed once and their `Xn` references resolved per grafcet, forcing
 * orders are resolved to target grafcets/steps, and grafcets get forcing-hierarchy levels.
 */
import type { ArithNode, BoolNode } from '../expr/ast';
import { cachedAssignment, cachedBool, cachedForcing, cachedOutput } from '../expr/cache';
import { buildEnv, variableIndex } from '../expr/check';
import type { ActionKind, Id, Project, Variable } from '../model/types';

/** An expression bound to the grafcet it belongs to (for `Xn` resolution) with a unique key. */
export interface CExpr {
  /** Unique key; stateful nodes are keyed `${uid}#${node.id}`. */
  uid: string;
  /** Grafcet the expression belongs to. */
  grafcet: number;
  /**
   * evolution: evaluated during the search for stability (receptivities, stored actions);
   * output: evaluated once per cycle on the stable situation (continuous action conditions).
   */
  phase: 'evolution' | 'output';
  ast: BoolNode;
  /** Step number → global step index, for this expression's grafcet. */
  steps: Map<number, number>;
}

export interface CStep {
  idx: number;
  id: Id;
  grafcet: number;
  number: number;
  initial: boolean;
}

export interface CTransition {
  idx: number;
  id: Id;
  grafcet: number;
  from: number[];
  to: number[];
  /** null when the receptivity does not parse: the transition never clears. */
  receptivity: CExpr | null;
}

export interface CForcing {
  target: number;
  mode: 'steps' | 'freeze' | 'init';
  steps: number[];
}

export interface CAction {
  idx: number;
  id: Id;
  step: number;
  kind: ActionKind;
  /** Lower-cased name of the variable written (continuous and stored actions). */
  target?: string;
  /** Value of a stored action: boolean expression (BOOL target) or arithmetic. */
  boolValue?: CExpr;
  arithValue?: { ast: ArithNode; steps: Map<number, number> };
  condition?: CExpr;
  forcing?: CForcing;
}

export interface CGrafcet {
  idx: number;
  id: Id;
  name: string;
  steps: number[];
  transitions: number[];
  /** Forcing level: 0 = not forced; forced grafcets are processed after the ones forcing them. */
  level: number;
}

export interface CompileProblem {
  kind: 'expression' | 'forcingCycle';
  elementId: Id;
}

export interface Program {
  grafcets: CGrafcet[];
  steps: CStep[];
  transitions: CTransition[];
  actions: CAction[];
  /** Actions per step index, in display order. */
  actionsByStep: CAction[][];
  /** Transitions leaving each step index (for enabling). */
  outgoing: number[][];
  variables: Map<string, Variable>;
  /** Variables driven by at least one continuous action (recomputed every cycle). */
  continuousTargets: Set<string>;
  /** Every boolean expression, for stateful-node bookkeeping. */
  expressions: CExpr[];
  problems: CompileProblem[];
}

export function compile(project: Project): Program {
  const variables = variableIndex(project);
  const grafcets: CGrafcet[] = [];
  const steps: CStep[] = [];
  const transitions: CTransition[] = [];
  const actions: CAction[] = [];
  const stepIndex = new Map<Id, number>();
  const problems: CompileProblem[] = [];
  const expressions: CExpr[] = [];

  project.grafcetOrder.forEach((gid) => {
    const g = project.grafcets[gid];
    if (!g) return;
    const cg: CGrafcet = {
      idx: grafcets.length,
      id: g.id,
      name: g.name,
      steps: [],
      transitions: [],
      level: 0,
    };
    grafcets.push(cg);
    for (const s of Object.values(g.steps).sort(
      (a, b) => a.number - b.number || (a.id < b.id ? -1 : 1),
    )) {
      const idx = steps.length;
      steps.push({
        idx,
        id: s.id,
        grafcet: cg.idx,
        number: s.number,
        initial: s.kind === 'initial',
      });
      stepIndex.set(s.id, idx);
      cg.steps.push(idx);
    }
  });

  const grafcetByName = new Map(grafcets.map((g) => [g.name.toLowerCase(), g]));

  for (const cg of grafcets) {
    const g = project.grafcets[cg.id]!;
    const env = buildEnv(project, g.id, variables);
    const resolved = new Map<number, number>();
    const resolver = (n: number): number | undefined => {
      if (resolved.has(n)) return resolved.get(n);
      const r = env.resolveStep(n);
      const idx = typeof r === 'object' ? stepIndex.get(r.stepId) : undefined;
      if (idx !== undefined) resolved.set(n, idx);
      return idx;
    };
    const bindSteps = (ast: BoolNode | ArithNode): Map<number, number> => {
      collectStepNumbers(ast).forEach((n) => resolver(n));
      return resolved;
    };
    const bool = (
      uid: string,
      source: string,
      ownerId: Id,
      phase: CExpr['phase'] = 'evolution',
    ): CExpr | null => {
      const r = cachedBool(source);
      if (!r.ok) {
        problems.push({ kind: 'expression', elementId: ownerId });
        return null;
      }
      const e: CExpr = { uid, grafcet: cg.idx, phase, ast: r.value, steps: bindSteps(r.value) };
      expressions.push(e);
      return e;
    };

    for (const t of Object.values(g.transitions).sort(
      (a, b) => a.position.x - b.position.x || a.position.y - b.position.y,
    )) {
      const idx = transitions.length;
      transitions.push({
        idx,
        id: t.id,
        grafcet: cg.idx,
        from: t.from.map((s) => stepIndex.get(s)!).filter((x) => x !== undefined),
        to: t.to.map((s) => stepIndex.get(s)!).filter((x) => x !== undefined),
        receptivity: bool(`t:${t.id}`, t.receptivity, t.id),
      });
      cg.transitions.push(idx);
    }

    for (const a of Object.values(g.actions).sort((x, y) => x.order - y.order)) {
      const step = stepIndex.get(a.stepId);
      if (step === undefined) continue;
      const ca: CAction = { idx: actions.length, id: a.id, step, kind: a.kind };
      if (a.condition !== undefined && a.condition.trim() && a.kind !== 'forcing') {
        ca.condition =
          bool(`c:${a.id}`, a.condition, a.id, a.kind === 'continuous' ? 'output' : 'evolution') ??
          undefined;
        if (!ca.condition) continue;
      }
      if (a.kind === 'continuous') {
        const r = cachedOutput(a.text);
        if (!r.ok) {
          problems.push({ kind: 'expression', elementId: a.id });
          continue;
        }
        ca.target = r.value.name.toLowerCase();
      } else if (a.kind === 'forcing') {
        const r = cachedForcing(a.text);
        const target = r.ok ? grafcetByName.get(r.value.grafcet.toLowerCase()) : undefined;
        if (!r.ok || !target) {
          problems.push({ kind: 'expression', elementId: a.id });
          continue;
        }
        const targetSteps = target.steps.filter((i) =>
          r.value.steps.some((s) => s.number === steps[i]!.number),
        );
        ca.forcing = { target: target.idx, mode: r.value.mode, steps: targetSteps };
      } else {
        const r = cachedAssignment(a.text);
        if (!r.ok) {
          problems.push({ kind: 'expression', elementId: a.id });
          continue;
        }
        const v = variables.get(r.value.target.toLowerCase());
        ca.target = r.value.target.toLowerCase();
        if (!v || v.type === 'BOOL') {
          if (!r.value.bool) {
            problems.push({ kind: 'expression', elementId: a.id });
            continue;
          }
          ca.boolValue = {
            uid: `v:${a.id}`,
            grafcet: cg.idx,
            phase: 'evolution',
            ast: r.value.bool,
            steps: bindSteps(r.value.bool),
          };
          expressions.push(ca.boolValue);
        } else {
          if (!r.value.arith) {
            problems.push({ kind: 'expression', elementId: a.id });
            continue;
          }
          ca.arithValue = { ast: r.value.arith, steps: bindSteps(r.value.arith) };
        }
      }
      actions.push(ca);
    }
  }

  // Forcing levels: a forced grafcet sits below every grafcet forcing it. Cycles are broken.
  const forcedBy = new Map<number, Set<number>>();
  for (const a of actions) {
    if (!a.forcing) continue;
    const forcer = steps[a.step]!.grafcet;
    if (forcer === a.forcing.target) continue;
    const set = forcedBy.get(a.forcing.target) ?? new Set<number>();
    set.add(forcer);
    forcedBy.set(a.forcing.target, set);
  }
  const level = new Map<number, number>();
  const visiting = new Set<number>();
  const levelOf = (gi: number): number => {
    if (level.has(gi)) return level.get(gi)!;
    if (visiting.has(gi)) {
      problems.push({ kind: 'forcingCycle', elementId: grafcets[gi]!.id });
      return 0;
    }
    visiting.add(gi);
    let l = 0;
    for (const f of forcedBy.get(gi) ?? []) l = Math.max(l, levelOf(f) + 1);
    visiting.delete(gi);
    level.set(gi, l);
    return l;
  };
  for (const g of grafcets) g.level = levelOf(g.idx);

  const actionsByStep: CAction[][] = steps.map(() => []);
  for (const a of actions) actionsByStep[a.step]!.push(a);
  const outgoing: number[][] = steps.map(() => []);
  for (const t of transitions) for (const s of t.from) outgoing[s]!.push(t.idx);
  const continuousTargets = new Set(
    actions.filter((a) => a.kind === 'continuous' && a.target).map((a) => a.target!),
  );

  return {
    grafcets,
    steps,
    transitions,
    actions,
    actionsByStep,
    outgoing,
    variables,
    continuousTargets,
    expressions,
    problems,
  };
}

function collectStepNumbers(n: BoolNode | ArithNode, out: number[] = []): number[] {
  switch (n.type) {
    case 'step':
      out.push(n.number);
      break;
    case 'not':
    case 'edge':
    case 'timer':
    case 'neg':
      collectStepNumbers(n.operand, out);
      break;
    case 'and':
    case 'or':
    case 'arith':
    case 'cmp':
      collectStepNumbers(n.left, out);
      collectStepNumbers(n.right, out);
      break;
    default:
      break;
  }
  return out;
}
