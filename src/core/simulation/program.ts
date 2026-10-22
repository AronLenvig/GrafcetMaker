/**
 * Compiles a project into an indexed program for the simulator: steps and transitions get dense
 * indices, expressions are parsed once and their `Xn` references resolved per grafcet, forcing
 * orders are resolved to target grafcets/steps, and grafcets get forcing-hierarchy levels.
 */
import type { ArithNode, BoolNode } from '../expr/ast';
import { cachedAssignment, cachedBool, cachedForcing, cachedOutput } from '../expr/cache';
import { buildEnv, variableIndex } from '../expr/check';
import { entryExit } from '../model/hierarchy';
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
  /** Active at start: initial steps of partial grafcets only (enclosed ones start with their enclosing step). */
  initial: boolean;
}

/** A macro-step: its activity is that of its expansion, entered at E and left from S. */
export interface CMacro {
  entry: number;
  exit: number;
  members: number[];
}

/** An enclosing step and the enclosed grafcet it activates (initial steps) and deactivates. */
export interface CEnclosure {
  members: number[];
  initial: number[];
}

export interface CTransition {
  idx: number;
  id: Id;
  grafcet: number;
  from: number[];
  to: number[];
  /** null when the receptivity does not parse: the transition never clears. */
  receptivity: CExpr | null;
  /** Transitions of an enclosed grafcet can only clear while its enclosing step is active. */
  guard?: number;
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
  /** Its initial situation (G{INIT}): initial steps, or for an enclosed grafcet its * steps. */
  initial: number[];
}

export interface CompileProblem {
  kind: 'expression' | 'forcingCycle' | 'hierarchy';
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
  /** Macro-steps by step index. */
  macros: Map<number, CMacro>;
  /** Enclosing steps by step index. */
  enclosures: Map<number, CEnclosure>;
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
      initial: [],
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
        initial: s.kind === 'initial' && g.kind === 'partial',
      });
      stepIndex.set(s.id, idx);
      cg.steps.push(idx);
      if (s.kind === 'initial' && g.kind !== 'macroExpansion') cg.initial.push(idx);
    }
  });

  const grafcetByName = new Map(grafcets.map((g) => [g.name.toLowerCase(), g]));
  const cgById = new Map(grafcets.map((g) => [g.id, g]));

  // Hierarchy: macro-steps are inlined (entry/exit), enclosing steps guard their enclosed grafcet.
  const macros = new Map<number, CMacro>();
  const enclosures = new Map<number, CEnclosure>();
  const guardOf = new Map<number, number>();
  for (const cg of grafcets) {
    for (const s of Object.values(project.grafcets[cg.id]!.steps)) {
      if ((s.kind !== 'macro' && s.kind !== 'enclosing') || !s.refGrafcetId) continue;
      const child = project.grafcets[s.refGrafcetId];
      const cc = cgById.get(s.refGrafcetId);
      const idx = stepIndex.get(s.id)!;
      if (!child || !cc) continue;
      if (s.kind === 'macro' && child.kind === 'macroExpansion') {
        const { entries, exits } = entryExit(child);
        if (entries.length !== 1 || exits.length !== 1) {
          problems.push({ kind: 'hierarchy', elementId: s.id });
          continue;
        }
        macros.set(idx, {
          entry: stepIndex.get(entries[0]!.id)!,
          exit: stepIndex.get(exits[0]!.id)!,
          members: cc.steps,
        });
      } else if (s.kind === 'enclosing' && child.kind === 'enclosed') {
        enclosures.set(idx, {
          members: cc.steps,
          initial: cc.steps.filter((i) => child.steps[steps[i]!.id]?.kind === 'initial'),
        });
        guardOf.set(cc.idx, idx);
      }
    }
  }
  // Links to a macro-step enter its expansion at E; links from it leave from S (nested too).
  const entryOf = (i: number): number => (macros.has(i) ? entryOf(macros.get(i)!.entry) : i);
  const exitOf = (i: number): number => (macros.has(i) ? exitOf(macros.get(i)!.exit) : i);

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
        from: t.from.flatMap((s) => (stepIndex.has(s) ? [exitOf(stepIndex.get(s)!)] : [])),
        to: t.to.flatMap((s) => (stepIndex.has(s) ? [entryOf(stepIndex.get(s)!)] : [])),
        receptivity: bool(`t:${t.id}`, t.receptivity, t.id),
        ...(guardOf.has(cg.idx) ? { guard: guardOf.get(cg.idx)! } : {}),
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
    macros,
    enclosures,
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
