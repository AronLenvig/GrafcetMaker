/**
 * Message protocol between the simulation UI and the simulator (running in a worker, or inline
 * as a fallback). `handle` is pure apart from the simulator it owns.
 */
import type { Id, Project } from '../model/types';
import { Simulator, type CycleLog, type SimSnapshot, type Value } from './engine';
import { compile, type CompileProblem } from './program';

export type SimRequest =
  | { type: 'load'; project: Project }
  | { type: 'reset' }
  /** Change inputs at virtual time `at` (timers up to `at` expire first). */
  | { type: 'input'; at: number; changes: Record<string, Value> }
  /** Advance the clock, running a cycle at each timer expiry on the way. */
  | { type: 'advance'; to: number }
  /** Jump to the next timer expiry and run that cycle (single-step / fast mode). */
  | { type: 'next' };

/** A cycle and the stable situation it ended in (for the chronogram and the log). */
export type CycleRecord = CycleLog & { active: Id[] };

export interface SimResponse {
  snapshot: SimSnapshot;
  cycles: CycleRecord[];
  problems: CompileProblem[];
  /** True when the request found no timer to wait for (`next`). */
  idle?: boolean;
}

export class SimSession {
  private sim: Simulator | null = null;
  private problems: CompileProblem[] = [];

  private record(log: CycleLog | null): CycleRecord[] {
    if (!log || !this.sim) return [];
    return [{ ...log, active: this.sim.snapshot().active }];
  }

  private records(logs: CycleLog[]): CycleRecord[] {
    return logs.flatMap((l) => this.record(l));
  }

  handle(req: SimRequest): SimResponse | null {
    let cycles: CycleRecord[] = [];
    let idle = false;
    switch (req.type) {
      case 'load': {
        const program = compile(req.project);
        this.problems = program.problems;
        this.sim = new Simulator(program);
        cycles = this.record(this.sim.start());
        break;
      }
      case 'reset':
        if (!this.sim) return null;
        cycles = this.record(this.sim.start());
        break;
      case 'input': {
        if (!this.sim) return null;
        cycles = this.records(this.sim.advanceTo(req.at));
        cycles.push(...this.record(this.sim.setInputs(req.changes)));
        break;
      }
      case 'advance':
        if (!this.sim) return null;
        cycles = this.records(this.sim.advanceTo(req.to));
        break;
      case 'next': {
        if (!this.sim) return null;
        const d = this.sim.nextDeadline();
        if (d === null) idle = true;
        else cycles = this.records(this.sim.advanceTo(d));
        break;
      }
    }
    return { snapshot: this.sim!.snapshot(), cycles, problems: this.problems, idle };
  }
}
