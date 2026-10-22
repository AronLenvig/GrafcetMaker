/**
 * Deterministic GRAFCET (IEC 60848) simulator with virtual time. See docs/semantics.md
 * ("Simulation") for every interpretation choice. Pure TypeScript: runs in a worker or in tests.
 *
 * A cycle runs when an input changes or a timer expires. Grafcets are processed by forcing level:
 * each level searches for stability (rules 2–5 repeated with the same inputs), then its active
 * forcing orders are applied to lower levels, which are frozen for the rest of the cycle.
 * Continuous actions are computed from the stable situation only.
 */
import type { ArithNode, BoolNode } from '../expr/ast';
import type { Id } from '../model/types';
import type { CAction, CExpr, CForcing, Program } from './program';

export const MAX_ITERATIONS = 1000;

export type Value = boolean | number;

interface TimerState {
  /** Operand value at the last evaluation. */
  c: boolean;
  /** Virtual time the operand last changed. */
  changedAt: number;
  out: boolean;
}

interface Stateful {
  key: string;
  expr: CExpr;
  node: Extract<BoolNode, { type: 'edge' | 'timer' }>;
}

export interface IterationLog {
  cleared: Id[];
  activated: Id[];
  deactivated: Id[];
}

export interface CycleLog {
  cycle: number;
  time: number;
  trigger: 'start' | 'input' | 'timer';
  inputs: { name: string; value: Value }[];
  iterations: IterationLog[];
  forced: { grafcet: Id; active: Id[] }[];
  /** Output and internal variable changes caused by the cycle. */
  changes: { name: string; value: Value }[];
  error?: SimError;
}

export interface SimError {
  kind: 'transientLoop';
  cycle: number;
  time: number;
  /** Transitions still clearing when the iteration cap was reached. */
  transitions: Id[];
}

export interface SimSnapshot {
  time: number;
  cycle: number;
  active: Id[];
  /** Activation time of each active step. */
  activatedAt: Record<Id, number>;
  /** Transitions whose upstream steps are all active (source transitions always). */
  enabled: Id[];
  values: Record<string, Value>;
  /** Continuous actions being executed in the stable situation. */
  executing: Id[];
  error: SimError | null;
  nextDeadline: number | null;
}

function collectStateful(expr: CExpr, n: BoolNode, out: Stateful[]): void {
  switch (n.type) {
    case 'edge':
    case 'timer':
      collectStateful(expr, n.operand, out);
      out.push({ key: `${expr.uid}#${n.id}`, expr, node: n });
      return;
    case 'not':
      collectStateful(expr, n.operand, out);
      return;
    case 'and':
    case 'or':
      collectStateful(expr, n.left, out);
      collectStateful(expr, n.right, out);
      return;
    default:
      return;
  }
}

const isStepTimer = (n: Extract<BoolNode, { type: 'edge' | 'timer' }>) =>
  n.type === 'timer' && n.t2 === undefined && n.operand.type === 'step';

export class Simulator {
  time = 0;
  cycle = 0;
  readonly active: Uint8Array;
  readonly activatedAt: Float64Array;
  readonly values = new Map<string, Value>();
  error: SimError | null = null;
  /** A stored action changed a variable during the current iteration. */
  private assigned = false;
  private executing: Id[] = [];

  private readonly edgePrev = new Map<string, boolean>();
  private readonly timers = new Map<string, TimerState>();
  private readonly evolutionNodes: Stateful[][];
  private readonly outputNodes: Stateful[] = [];
  private readonly stepTimers: Stateful[] = [];
  private readonly genericTimers = new Map<string, Stateful>();
  private readonly levels: number[];
  /** Per-evaluation-round memo of stateful nodes, and their state to commit. */
  private cache = new Map<string, boolean>();
  private pendingPrev = new Map<string, boolean>();
  private pendingTimers = new Map<string, TimerState>();

  constructor(readonly program: Program) {
    this.active = new Uint8Array(program.steps.length);
    this.activatedAt = new Float64Array(program.steps.length);
    this.evolutionNodes = program.grafcets.map(() => []);
    for (const e of program.expressions) {
      const list: Stateful[] = [];
      collectStateful(e, e.ast, list);
      for (const s of list) {
        if (e.phase === 'output') this.outputNodes.push(s);
        else this.evolutionNodes[e.grafcet]!.push(s);
        if (isStepTimer(s.node)) this.stepTimers.push(s);
        else if (s.node.type === 'timer') this.genericTimers.set(s.key, s);
      }
    }
    this.levels = [...new Set(program.grafcets.map((g) => g.level))].sort((a, b) => a - b);
    this.resetValues();
  }

  private resetValues(): void {
    this.values.clear();
    for (const [name, v] of this.program.variables) {
      const init = v.initialValue;
      if (v.type === 'BOOL') this.values.set(name, typeof init === 'boolean' ? init : init === 1);
      else this.values.set(name, typeof init === 'number' ? init : 0);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Evaluation

  private bool(v: Value | undefined): boolean {
    return typeof v === 'number' ? v !== 0 : !!v;
  }

  private num(e: CExpr | { steps: Map<number, number> }, n: ArithNode): number {
    switch (n.type) {
      case 'num':
        return n.value;
      case 'dur':
        return n.ms;
      case 'avar': {
        const v = this.values.get(n.name.toLowerCase());
        return typeof v === 'boolean' ? (v ? 1 : 0) : (v ?? 0);
      }
      case 'neg':
        return -this.num(e, n.operand);
      case 'arith': {
        const a = this.num(e, n.left);
        const b = this.num(e, n.right);
        switch (n.op) {
          case '+':
            return a + b;
          case '-':
            return a - b;
          case '*':
            return a * b;
          case '/':
            return b === 0 ? 0 : a / b;
          case 'mod':
            return b === 0 ? 0 : a % b;
        }
      }
    }
  }

  eval(e: CExpr, n: BoolNode = e.ast): boolean {
    switch (n.type) {
      case 'const':
        return n.value;
      case 'var':
        return this.bool(this.values.get(n.name.toLowerCase()));
      case 'step': {
        const idx = e.steps.get(n.number);
        return idx !== undefined && this.active[idx] === 1;
      }
      case 'not':
        return !this.eval(e, n.operand);
      case 'and':
        return this.eval(e, n.left) && this.eval(e, n.right);
      case 'or':
        return this.eval(e, n.left) || this.eval(e, n.right);
      case 'cmp': {
        const a = this.num(e, n.left);
        const b = this.num(e, n.right);
        switch (n.op) {
          case '=':
            return a === b;
          case '<>':
            return a !== b;
          case '<':
            return a < b;
          case '<=':
            return a <= b;
          case '>':
            return a > b;
          case '>=':
            return a >= b;
        }
        return false;
      }
      case 'edge':
      case 'timer': {
        const key = `${e.uid}#${n.id}`;
        const hit = this.cache.get(key);
        if (hit !== undefined) return hit;
        const value = n.type === 'edge' ? this.evalEdge(e, n, key) : this.evalTimer(e, n, key);
        this.cache.set(key, value);
        return value;
      }
    }
  }

  private evalEdge(e: CExpr, n: Extract<BoolNode, { type: 'edge' }>, key: string): boolean {
    const cur = this.eval(e, n.operand);
    // No edge on the very first observation (simulation start).
    const prev = this.edgePrev.get(key) ?? cur;
    this.pendingPrev.set(key, cur);
    return n.rising ? cur && !prev : !cur && prev;
  }

  private evalTimer(e: CExpr, n: Extract<BoolNode, { type: 'timer' }>, key: string): boolean {
    if (n.t2 === undefined && n.operand.type === 'step') {
      // Step timer: measured from the step's activation time.
      const idx = e.steps.get(n.operand.number);
      return (
        idx !== undefined && this.active[idx] === 1 && this.time - this.activatedAt[idx]! >= n.t1
      );
    }
    const cur = this.eval(e, n.operand);
    const st = this.timers.get(key) ?? { c: cur, changedAt: this.time, out: false };
    const changedAt = cur !== st.c ? this.time : st.changedAt;
    const elapsed = this.time - changedAt;
    const out =
      n.t2 === undefined
        ? cur && elapsed >= n.t1
        : cur
          ? st.out || elapsed >= n.t1
          : st.out && elapsed < n.t2;
    this.pendingTimers.set(key, { c: cur, changedAt, out });
    return out;
  }

  private beginRound(): void {
    this.cache = new Map();
    this.pendingPrev = new Map();
    this.pendingTimers = new Map();
  }

  /** Observes every stateful node of the given set on the current state, then commits. */
  private commitRound(nodes: Iterable<Stateful>): void {
    for (const s of nodes) if (!this.cache.has(s.key)) this.eval(s.expr, s.node);
    for (const [k, v] of this.pendingPrev) this.edgePrev.set(k, v);
    for (const [k, v] of this.pendingTimers) this.timers.set(k, v);
  }

  // ------------------------------------------------------------------------------------------
  // Actions

  private assign(a: CAction): void {
    if (!a.target) return;
    let value: Value;
    if (a.boolValue) value = this.eval(a.boolValue);
    else if (a.arithValue) {
      const v = this.program.variables.get(a.target);
      const raw = this.num(a.arithValue, a.arithValue.ast);
      value = v?.type === 'INT' || v?.type === 'TIME' ? Math.trunc(raw) : raw;
    } else return;
    if (this.values.get(a.target) !== value) this.assigned = true;
    this.values.set(a.target, value);
  }

  private runStored(step: number, kind: 'storedOnActivation' | 'storedOnDeactivation'): void {
    for (const a of this.program.actionsByStep[step]!) {
      if (a.kind !== kind) continue;
      if (a.condition && !this.eval(a.condition)) continue;
      this.assign(a);
    }
  }

  private setActive(step: number, on: boolean): void {
    if (on) {
      this.active[step] = 1;
      this.activatedAt[step] = this.time;
    } else this.active[step] = 0;
  }

  // ------------------------------------------------------------------------------------------
  // Evolution

  /** Search for stability over a group of grafcets (rules 2–5 repeated with the same inputs). */
  private stabilize(grafcets: number[], log: CycleLog): void {
    const p = this.program;
    const transitions = grafcets
      .flatMap((g) => p.grafcets[g]!.transitions)
      .map((i) => p.transitions[i]!);
    const nodes = grafcets.flatMap((g) => this.evolutionNodes[g]!);
    const steps = grafcets.flatMap((g) => p.grafcets[g]!.steps);
    for (let k = 0; ; k++) {
      this.beginRound();
      this.assigned = false;
      // Rule 2: enabled ⇔ all upstream steps active; clearable ⇔ enabled ∧ receptivity.
      const clearable = transitions.filter(
        (t) =>
          t.receptivity && t.from.every((s) => this.active[s] === 1) && this.eval(t.receptivity),
      );
      // Stored actions on event, for the steps active in this situation.
      for (const s of steps) {
        if (this.active[s] !== 1) continue;
        for (const a of p.actionsByStep[s]!) {
          if (a.kind === 'storedOnEvent' && a.condition && this.eval(a.condition)) this.assign(a);
        }
      }
      // Stable: nothing clearable and no event action changed a variable a receptivity may read.
      if (!clearable.length && !this.assigned) {
        this.commitRound(nodes);
        return;
      }
      if (k >= MAX_ITERATIONS) {
        this.commitRound(nodes);
        this.error = {
          kind: 'transientLoop',
          cycle: this.cycle,
          time: this.time,
          transitions: clearable.map((t) => t.id),
        };
        log.error = this.error;
        return;
      }
      // Rules 3–5: all clearable transitions clear at once; a step both activated and
      // deactivated stays active (and keeps its activation time).
      const activate = new Set<number>();
      const deactivate = new Set<number>();
      for (const t of clearable) {
        for (const s of t.from) deactivate.add(s);
        for (const s of t.to) activate.add(s);
      }
      const off = [...deactivate]
        .filter((s) => !activate.has(s) && this.active[s] === 1)
        .sort((a, b) => a - b);
      const on = [...activate].filter((s) => this.active[s] !== 1).sort((a, b) => a - b);
      for (const s of off) this.setActive(s, false);
      for (const s of on) this.setActive(s, true);
      for (const s of off) this.runStored(s, 'storedOnDeactivation');
      for (const s of on) this.runStored(s, 'storedOnActivation');
      this.commitRound(nodes);
      if (clearable.length) {
        log.iterations.push({
          cleared: clearable.map((t) => t.id),
          activated: on.map((s) => p.steps[s]!.id),
          deactivated: off.map((s) => p.steps[s]!.id),
        });
      }
      // Clearing that changes nothing (source transition to an active step, self-loop) is stable.
      if (!on.length && !off.length && !this.assigned) return;
    }
  }

  /** Imposes a forcing order on its target grafcet (stored actions of changed steps execute). */
  private applyForcing(f: CForcing, log: CycleLog): void {
    const g = this.program.grafcets[f.target]!;
    if (f.mode === 'freeze') {
      log.forced.push({
        grafcet: g.id,
        active: g.steps.filter((s) => this.active[s] === 1).map((s) => this.program.steps[s]!.id),
      });
      return;
    }
    const want = new Set(
      f.mode === 'init' ? g.steps.filter((s) => this.program.steps[s]!.initial) : f.steps,
    );
    this.beginRound();
    const off = g.steps.filter((s) => this.active[s] === 1 && !want.has(s));
    const on = g.steps.filter((s) => this.active[s] !== 1 && want.has(s));
    for (const s of off) this.setActive(s, false);
    for (const s of on) this.setActive(s, true);
    for (const s of off) this.runStored(s, 'storedOnDeactivation');
    for (const s of on) this.runStored(s, 'storedOnActivation');
    this.commitRound([]);
    log.forced.push({ grafcet: g.id, active: [...want].map((s) => this.program.steps[s]!.id) });
  }

  private computeOutputs(): void {
    const p = this.program;
    this.beginRound();
    for (const name of p.continuousTargets) this.values.set(name, false);
    this.executing = [];
    for (const a of p.actions) {
      if (a.kind !== 'continuous' || !a.target || this.active[a.step] !== 1) continue;
      if (a.condition && !this.eval(a.condition)) continue;
      this.values.set(a.target, true);
      this.executing.push(a.id);
    }
    this.commitRound(this.outputNodes);
  }

  private runCycle(
    trigger: CycleLog['trigger'],
    inputs: { name: string; value: Value }[],
  ): CycleLog {
    const before = new Map(this.values);
    const log: CycleLog = {
      cycle: ++this.cycle,
      time: this.time,
      trigger,
      inputs,
      iterations: [],
      forced: [],
      changes: [],
    };
    const frozen = new Set<number>();
    for (const level of this.levels) {
      const group = this.program.grafcets
        .filter((g) => g.level === level && !frozen.has(g.idx))
        .map((g) => g.idx);
      if (group.length) this.stabilize(group, log);
      if (this.error) break;
      // Forcing orders of the (now stable) grafcets of this level.
      for (const gi of group) {
        for (const s of this.program.grafcets[gi]!.steps) {
          if (this.active[s] !== 1) continue;
          for (const a of this.program.actionsByStep[s]!) {
            if (!a.forcing) continue;
            frozen.add(a.forcing.target);
            this.applyForcing(a.forcing, log);
          }
        }
      }
    }
    // Grafcets frozen by forcing still observe this cycle's state, so events that happened while
    // they were frozen are not seen later.
    if (frozen.size) {
      this.beginRound();
      this.commitRound([...frozen].flatMap((g) => this.evolutionNodes[g]!));
    }
    this.computeOutputs();
    const inputNames = new Set(inputs.map((i) => i.name));
    for (const [name, v] of this.values) {
      if (before.get(name) !== v && !inputNames.has(name)) log.changes.push({ name, value: v });
    }
    return log;
  }

  // ------------------------------------------------------------------------------------------
  // Public API

  /** Rule 1: initial steps active at start; then a first search for stability at t = 0. */
  start(): CycleLog {
    this.time = 0;
    this.cycle = 0;
    this.error = null;
    this.active.fill(0);
    this.activatedAt.fill(0);
    this.edgePrev.clear();
    this.timers.clear();
    this.resetValues();
    this.beginRound();
    const initial = this.program.steps.filter((s) => s.initial).map((s) => s.idx);
    for (const s of initial) this.setActive(s, true);
    for (const s of initial) this.runStored(s, 'storedOnActivation');
    return this.runCycle('start', []);
  }

  /** Earliest future time at which a timer changes value, or null. */
  nextDeadline(): number | null {
    let best = Infinity;
    for (const s of this.stepTimers) {
      const node = s.node as Extract<BoolNode, { type: 'timer' }>;
      const idx = s.expr.steps.get((node.operand as Extract<BoolNode, { type: 'step' }>).number);
      if (idx === undefined || this.active[idx] !== 1) continue;
      const d = this.activatedAt[idx]! + node.t1;
      if (d > this.time) best = Math.min(best, d);
    }
    for (const [key, st] of this.timers) {
      const node = this.genericTimers.get(key)?.node as
        Extract<BoolNode, { type: 'timer' }> | undefined;
      if (!node) continue;
      let d = Infinity;
      if (st.c && !st.out) d = st.changedAt + node.t1;
      else if (!st.c && st.out && node.t2 !== undefined) d = st.changedAt + node.t2;
      if (d > this.time) best = Math.min(best, d);
    }
    return best === Infinity ? null : best;
  }

  /** Runs a cycle at every timer expiry up to `time`, then sets the clock to `time`. */
  advanceTo(time: number): CycleLog[] {
    const logs: CycleLog[] = [];
    while (!this.error) {
      const d = this.nextDeadline();
      if (d === null || d > time) break;
      this.time = d;
      logs.push(this.runCycle('timer', []));
    }
    if (!this.error) this.time = Math.max(this.time, time);
    return logs;
  }

  /** Changes inputs at the current time and runs the resulting cycle. */
  setInputs(changes: Record<string, Value>): CycleLog | null {
    if (this.error) return null;
    const applied: { name: string; value: Value }[] = [];
    for (const [raw, value] of Object.entries(changes)) {
      const name = raw.toLowerCase();
      const v = this.program.variables.get(name);
      const typed: Value =
        v?.type === 'BOOL' ? this.bool(value) : typeof value === 'number' ? value : value ? 1 : 0;
      if (this.values.get(name) === typed) continue;
      this.values.set(name, typed);
      applied.push({ name, value: typed });
    }
    return this.runCycle('input', applied);
  }

  snapshot(): SimSnapshot {
    const p = this.program;
    const active: Id[] = [];
    const activatedAt: Record<Id, number> = {};
    for (const s of p.steps) {
      if (this.active[s.idx] !== 1) continue;
      active.push(s.id);
      activatedAt[s.id] = this.activatedAt[s.idx]!;
    }
    const enabled = p.transitions
      .filter((t) => t.from.every((s) => this.active[s] === 1))
      .map((t) => t.id);
    return {
      time: this.time,
      cycle: this.cycle,
      active,
      activatedAt,
      enabled,
      values: Object.fromEntries(this.values),
      executing: [...this.executing],
      error: this.error,
      nextDeadline: this.error ? null : this.nextDeadline(),
    };
  }
}
