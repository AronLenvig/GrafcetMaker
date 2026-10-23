/**
 * Golden suite for the simulator: small hand-verified charts and the expected situation and
 * outputs after each event. Labels are `<grafcet>.<step number>`.
 */
import { describe, expect, it } from 'vitest';
import { createGrafcet, newId } from '@/core/model/factory';
import { SCHEMA_VERSION } from '@/core/model/schema';
import type { ActionKind, Grafcet, GrafcetKind, Project, VariableType } from '@/core/model/types';
import { Simulator } from '@/core/simulation/engine';
import { compile } from '@/core/simulation/program';

type VarSpec = 'in' | 'out' | 'int' | 'n' | 'nin' | 'time';
type Tr = [from: number[], receptivity: string, to: number[]];
type Act = [step: number, kind: ActionKind, text: string, condition?: string];
interface GSpec {
  name: string;
  kind?: GrafcetKind;
  /** Step number → name of its expansion (macro-step) or enclosed grafcet (enclosing step). */
  macro?: Record<number, string>;
  enclosing?: Record<number, string>;
  initial?: number[];
  steps: number[];
  transitions: Tr[];
  actions?: Act[];
}

function build(vars: Record<string, VarSpec>, ...specs: GSpec[]): Project {
  const p: Project = {
    schemaVersion: SCHEMA_VERSION,
    id: 'p',
    name: 'golden',
    meta: { author: '', company: '', revision: '', createdAt: '', updatedAt: '' },
    variables: {},
    grafcets: {},
    grafcetOrder: [],
  };
  const types: Record<VarSpec, [VariableType, 'input' | 'output' | 'internal']> = {
    in: ['BOOL', 'input'],
    out: ['BOOL', 'output'],
    int: ['BOOL', 'internal'],
    n: ['INT', 'internal'],
    nin: ['INT', 'input'],
    time: ['TIME', 'internal'],
  };
  for (const [name, spec] of Object.entries(vars)) {
    const [type, direction] = types[spec];
    p.variables[name] = { id: name, name, type, direction };
  }
  for (const spec of specs) {
    const g: Grafcet = createGrafcet(spec.name, spec.kind ?? 'partial');
    const byNumber = new Map<number, string>();
    spec.steps.forEach((n, i) => {
      const id = `${spec.name}_${n}`;
      byNumber.set(n, id);
      g.steps[id] = {
        id,
        number: n,
        kind: spec.macro?.[n]
          ? 'macro'
          : spec.enclosing?.[n]
            ? 'enclosing'
            : spec.initial?.includes(n)
              ? 'initial'
              : 'normal',
        position: { x: 0, y: i * 120 },
      };
    });
    spec.transitions.forEach(([from, receptivity, to], i) => {
      const id = `${spec.name}_t${i}`;
      g.transitions[id] = {
        id,
        from: from.map((n) => byNumber.get(n)!),
        to: to.map((n) => byNumber.get(n)!),
        receptivity,
        position: { x: i * 10, y: 0 },
      };
    });
    (spec.actions ?? []).forEach(([step, kind, text, condition], i) => {
      const id = newId();
      g.actions[id] = {
        id,
        stepId: byNumber.get(step)!,
        order: i,
        kind,
        text,
        ...(condition ? { condition } : {}),
      };
    });
    p.grafcets[g.id] = g;
    p.grafcetOrder.push(g.id);
  }
  const byName = new Map(Object.values(p.grafcets).map((g) => [g.name, g.id]));
  for (const spec of specs) {
    const g = Object.values(p.grafcets).find((x) => x.name === spec.name)!;
    for (const [n, child] of Object.entries({ ...spec.macro, ...spec.enclosing })) {
      g.steps[`${spec.name}_${n}`]!.refGrafcetId = byName.get(child)!;
    }
  }
  return p;
}

function run(p: Project): Simulator {
  const program = compile(p);
  expect(program.problems).toEqual([]);
  const sim = new Simulator(program);
  sim.start();
  return sim;
}

/** Active steps as sorted labels. */
function X(sim: Simulator): string[] {
  const p = sim.program;
  return p.steps
    .filter((s) => sim.active[s.idx] === 1)
    .map((s) => `${p.grafcets[s.grafcet]!.name}.${s.number}`)
    .sort();
}

const v = (sim: Simulator, name: string) => sim.values.get(name.toLowerCase());
/** Sets inputs; returns the input cycle's log (follow-up internal cycles are in `sim` state). */
const set = (sim: Simulator, inputs: Record<string, boolean | number>) => sim.setInputs(inputs)[0];

describe('rule 1 — initial situation', () => {
  it('activates initial steps and emits their continuous actions', () => {
    const sim = run(
      build(
        { a: 'in', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          transitions: [[[0], 'a', [1]]],
          actions: [[0, 'continuous', 'M']],
        },
      ),
    );
    expect(X(sim)).toEqual(['G1.0']);
    expect(v(sim, 'M')).toBe(true);
  });

  it('searches for stability at start (a receptivity 1 clears immediately)', () => {
    const sim = run(
      build({}, { name: 'G1', initial: [0], steps: [0, 1], transitions: [[[0], '1', [1]]] }),
    );
    expect(X(sim)).toEqual(['G1.1']);
  });

  it('sees no edge at initialization', () => {
    const p = build(
      { a: 'in' },
      { name: 'G1', initial: [0], steps: [0, 1], transitions: [[[0], '↑a', [1]]] },
    );
    p.variables.a!.initialValue = true;
    expect(X(run(p))).toEqual(['G1.0']);
  });
});

describe('rules 2–3 — enabling and clearing', () => {
  it('clears an enabled transition whose receptivity is true', () => {
    const sim = run(
      build(
        { a: 'in', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          transitions: [[[0], 'a', [1]]],
          actions: [[0, 'continuous', 'M']],
        },
      ),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.1']);
    expect(v(sim, 'M')).toBe(false);
  });

  it('does not clear a transition that is not enabled; evolves through it later in one cycle', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], 'a', [1]],
            [[1], 'b', [2]],
          ],
        },
      ),
    );
    set(sim, { b: true });
    expect(X(sim)).toEqual(['G1.0']);
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('AND divergence activates every downstream step; AND convergence needs every upstream step', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in', c: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2, 3, 4, 5],
          transitions: [
            [[0], 'a', [1, 2]],
            [[1], 'b', [3]],
            [[2], 'c', [4]],
            [[3, 4], '1', [5]],
          ],
        },
      ),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.1', 'G1.2']);
    set(sim, { b: true });
    expect(X(sim)).toEqual(['G1.2', 'G1.3']);
    set(sim, { c: true });
    expect(X(sim)).toEqual(['G1.5']);
  });
});

describe('rule 4 — simultaneous clearing', () => {
  it('clears independent transitions in the same iteration', () => {
    const sim = run(
      build(
        { a: 'in', c: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2, 3, 4],
          transitions: [
            [[0], 'a', [1, 2]],
            [[1], 'c', [3]],
            [[2], 'c', [4]],
          ],
        },
      ),
    );
    set(sim, { a: true });
    const log = set(sim, { c: true })!;
    expect(X(sim)).toEqual(['G1.3', 'G1.4']);
    expect(log.iterations[0]!.cleared).toHaveLength(2);
  });

  it('a non-exclusive OR divergence activates both branches', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], 'a', [1]],
            [[0], 'b', [2]],
          ],
        },
      ),
    );
    set(sim, { a: true, b: true });
    expect(X(sim)).toEqual(['G1.1', 'G1.2']);
  });
});

describe('rule 5 — activated and deactivated at once', () => {
  it('a step re-activated by its own loop stays active, keeps its timer and does not re-run activation actions', () => {
    const sim = run(
      build(
        { a: 'in', C: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          transitions: [
            [[0], '↑a', [0]],
            [[0], '3s/X0', [1]],
          ],
          actions: [[0, 'storedOnActivation', 'C := C + 1']],
        },
      ),
    );
    expect(v(sim, 'C')).toBe(1);
    sim.advanceTo(2000);
    const log = set(sim, { a: true })!;
    expect(log.iterations[0]!.cleared).toHaveLength(1);
    expect(X(sim)).toEqual(['G1.0']);
    expect(v(sim, 'C')).toBe(1);
    expect(sim.nextDeadline()).toBe(3000);
    sim.advanceTo(2999);
    expect(X(sim)).toEqual(['G1.0']);
    sim.advanceTo(3000);
    expect(X(sim)).toEqual(['G1.1']);
  });

  it('a level self-loop is stable, not an endless evolution', () => {
    const sim = run(
      build({ a: 'in' }, { name: 'G1', initial: [0], steps: [0], transitions: [[[0], 'a', [0]]] }),
    );
    set(sim, { a: true });
    expect(sim.error).toBeNull();
    expect(X(sim)).toEqual(['G1.0']);
  });
});

describe('search for stability (transient evolution)', () => {
  it('transient steps emit no continuous action; their stored actions run', () => {
    const sim = run(
      build(
        { a: 'in', M: 'out', C: 'n', D: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], 'a', [1]],
            [[1], '1', [2]],
          ],
          actions: [
            [1, 'continuous', 'M'],
            [1, 'storedOnActivation', 'C := C + 1'],
            [1, 'storedOnDeactivation', 'D := D + 10'],
          ],
        },
      ),
    );
    const log = set(sim, { a: true })!;
    expect(X(sim)).toEqual(['G1.2']);
    expect(v(sim, 'M')).toBe(false);
    expect(v(sim, 'C')).toBe(1);
    expect(v(sim, 'D')).toBe(10);
    expect(log.iterations).toHaveLength(2);
    expect(log.changes.find((c) => c.name === 'm')).toBeUndefined();
  });

  it('stops with a transient-loop error after 1000 iterations instead of hanging', () => {
    const sim = new Simulator(
      compile(
        build(
          {},
          {
            name: 'G1',
            initial: [0],
            steps: [0, 1],
            transitions: [
              [[0], '1', [1]],
              [[1], '1', [0]],
            ],
          },
        ),
      ),
    );
    const [log] = sim.start();
    expect(log!.error?.kind).toBe('transientLoop');
    expect(log!.iterations).toHaveLength(1000);
    expect(sim.setInputs({})).toEqual([]);
  });

  it('a level-triggered counter in an event action is reported as a transient loop', () => {
    const sim = run(
      build(
        { b: 'in', C: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0],
          transitions: [],
          actions: [[0, 'storedOnEvent', 'C := C + 1', 'b']],
        },
      ),
    );
    set(sim, { b: true });
    expect(sim.error?.kind).toBe('transientLoop');
  });
});

describe('feedback of continuous actions', () => {
  const spec = (receptivity: string): GSpec => ({
    name: 'G1',
    initial: [0],
    steps: [0, 1, 2],
    transitions: [
      [[0], 'start', [1]],
      [[1], receptivity, [2]],
    ],
    actions: [[1, 'continuous', 'Running']],
  });
  const vars = { start: 'in', Auto: 'in', E_Stop: 'in', Running: 'out' } as const;

  it('a receptivity reading an output set by the stable situation clears in a follow-up cycle', () => {
    const sim = run(build(vars, spec('Running * Auto * !E_Stop')));
    set(sim, { Auto: true });
    const logs = sim.setInputs({ start: true });
    expect(X(sim)).toEqual(['G1.2']);
    expect(v(sim, 'Running')).toBe(false);
    // The stable situation {1} and its output are recorded before the internal cycle.
    expect(logs.map((l) => l.trigger)).toEqual(['input', 'internal']);
    expect(logs[0]!.active).toEqual(['G1_1']);
    expect(logs[0]!.changes).toEqual([{ name: 'running', value: true }]);
    expect(logs[1]!.active).toEqual(['G1_2']);
  });

  it('an edge on such an output is seen in the follow-up cycle', () => {
    const sim = run(build(vars, spec('↑Running')));
    set(sim, { start: true });
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('a timer on such an output starts when the output is emitted', () => {
    const sim = run(build(vars, spec('2s/Running')));
    sim.advanceTo(1000);
    set(sim, { start: true });
    expect(X(sim)).toEqual(['G1.1']);
    sim.advanceTo(2999);
    expect(X(sim)).toEqual(['G1.1']);
    sim.advanceTo(3000);
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('outputs and receptivities that keep switching each other stop with a transient-loop error', () => {
    const sim = run(
      build(
        { M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          transitions: [
            [[0], 'M', [1]],
            [[1], '/M', [0]],
          ],
          actions: [[1, 'continuous', 'M']],
        },
      ),
    );
    expect(sim.error).toBeNull();
    const sim2 = run(
      build(
        { M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          transitions: [
            [[0], 'M', [1]],
            [[1], 'M', [0]],
          ],
          actions: [[0, 'continuous', 'M']],
        },
      ),
    );
    expect(sim2.error?.kind).toBe('transientLoop');
  });
});

describe('edges', () => {
  it('↑a is true only in the first iteration of the cycle', () => {
    const sim = run(
      build(
        { a: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], '↑a', [1]],
            [[1], '↑a', [2]],
          ],
        },
      ),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.1']);
  });

  it('↓a fires on the falling edge', () => {
    const sim = run(
      build(
        { a: 'in' },
        { name: 'G1', initial: [0], steps: [0, 1], transitions: [[[0], '↓a', [1]]] },
      ),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.0']);
    set(sim, { a: false });
    expect(X(sim)).toEqual(['G1.1']);
  });

  it('an edge is not seen again in later cycles', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], '↑a', [1]],
            [[1], '↑a', [2]],
          ],
        },
      ),
    );
    set(sim, { a: true });
    set(sim, { b: true });
    sim.advanceTo(5000);
    expect(X(sim)).toEqual(['G1.1']);
    set(sim, { a: false });
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('↑Xn is the internal event of a step activation, seen in the next iteration', () => {
    const sim = run(
      build(
        { a: 'in' },
        { name: 'G1', initial: [0], steps: [0, 1], transitions: [[[0], 'a', [1]]] },
        { name: 'G2', initial: [10], steps: [10, 11], transitions: [[[10], '↑X1', [11]]] },
      ),
    );
    const log = set(sim, { a: true })!;
    expect(X(sim)).toEqual(['G1.1', 'G2.11']);
    expect(log.iterations).toHaveLength(2);
  });
});

describe('timers', () => {
  it('t/Xn counts from the step activation and schedules the next cycle', () => {
    const sim = run(
      build(
        { start: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], 'start', [1]],
            [[1], '3s/X1', [2]],
          ],
        },
      ),
    );
    sim.advanceTo(500);
    set(sim, { start: true });
    expect(sim.nextDeadline()).toBe(3500);
    sim.advanceTo(3499);
    expect(X(sim)).toEqual(['G1.1']);
    const logs = sim.advanceTo(10_000);
    expect(logs.map((l) => l.time)).toEqual([3500]);
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('t1/c/t2 rises t1 after c and falls t2 after c falls', () => {
    const sim = run(
      build(
        { a: 'in', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0],
          transitions: [],
          actions: [[0, 'continuous', 'M', '2s/a/3s']],
        },
      ),
    );
    set(sim, { a: true });
    expect(v(sim, 'M')).toBe(false);
    sim.advanceTo(1999);
    expect(v(sim, 'M')).toBe(false);
    sim.advanceTo(2000);
    expect(v(sim, 'M')).toBe(true);
    sim.advanceTo(5000);
    set(sim, { a: false });
    expect(v(sim, 'M')).toBe(true);
    expect(sim.nextDeadline()).toBe(8000);
    sim.advanceTo(7999);
    expect(v(sim, 'M')).toBe(true);
    sim.advanceTo(8000);
    expect(v(sim, 'M')).toBe(false);
  });

  it('t/c restarts when c falls before the delay', () => {
    const sim = run(
      build(
        { a: 'in', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0],
          transitions: [],
          actions: [[0, 'continuous', 'M', '2s/a']],
        },
      ),
    );
    set(sim, { a: true });
    sim.advanceTo(1000);
    set(sim, { a: false });
    sim.advanceTo(1500);
    set(sim, { a: true });
    sim.advanceTo(3000);
    expect(v(sim, 'M')).toBe(false);
    sim.advanceTo(3500);
    expect(v(sim, 'M')).toBe(true);
  });
});

describe('actions', () => {
  it('continuous action with an assignment condition', () => {
    const sim = run(
      build(
        { c: 'in', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0],
          transitions: [],
          actions: [[0, 'continuous', 'M', 'c']],
        },
      ),
    );
    expect(v(sim, 'M')).toBe(false);
    set(sim, { c: true });
    expect(v(sim, 'M')).toBe(true);
  });

  it('counts with stored actions and compares in receptivities', () => {
    const sim = run(
      build(
        { a: 'in', C: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], '↑a', [1]],
            [[1], '/a * (C < 3)', [0]],
            [[1], '/a * (C >= 3)', [2]],
          ],
          actions: [[1, 'storedOnActivation', 'C := C + 1']],
        },
      ),
    );
    for (let i = 1; i <= 3; i++) {
      set(sim, { a: true });
      expect(v(sim, 'C')).toBe(i);
      set(sim, { a: false });
    }
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('stored action guard, integer division and TIME values', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in', C: 'n', N: 'n', T: 'time' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], 'a', [1]],
            [[1], 'T >= 2s', [2]],
          ],
          actions: [
            [1, 'storedOnActivation', 'C := 5', 'b'],
            [1, 'storedOnActivation', 'N := 7 / 2'],
            [1, 'storedOnActivation', 'T := 2s'],
          ],
        },
      ),
    );
    set(sim, { a: true });
    expect(v(sim, 'C')).toBe(0);
    expect(v(sim, 'N')).toBe(3);
    expect(v(sim, 'T')).toBe(2000);
    expect(X(sim)).toEqual(['G1.2']);
  });

  it('stored action on event runs once per event while the step is active', () => {
    const sim = run(
      build(
        { b: 'in', x: 'in', C: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0],
          transitions: [],
          actions: [[0, 'storedOnEvent', 'C := C + 1', '↑b']],
        },
      ),
    );
    set(sim, { b: true });
    expect(v(sim, 'C')).toBe(1);
    set(sim, { x: true });
    set(sim, { b: false });
    expect(v(sim, 'C')).toBe(1);
    set(sim, { b: true });
    expect(v(sim, 'C')).toBe(2);
  });

  it('an output driven by several active steps stays on while any of them is active', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in', c: 'in', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2, 3, 4],
          transitions: [
            [[0], 'a', [1, 2]],
            [[1], 'b', [3]],
            [[2], 'c', [4]],
          ],
          actions: [
            [1, 'continuous', 'M'],
            [2, 'continuous', 'M'],
          ],
        },
      ),
    );
    set(sim, { a: true });
    set(sim, { b: true });
    expect(v(sim, 'M')).toBe(true);
    set(sim, { c: true });
    expect(v(sim, 'M')).toBe(false);
  });

  it('stored values persist after the step; continuous ones do not', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in', S: 'int', M: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          transitions: [
            [[0], 'a', [1]],
            [[1], 'b', [2]],
          ],
          actions: [
            [1, 'storedOnActivation', 'S := 1'],
            [1, 'continuous', 'M'],
          ],
        },
      ),
    );
    set(sim, { a: true });
    expect([v(sim, 'S'), v(sim, 'M')]).toEqual([true, true]);
    set(sim, { b: true });
    expect([v(sim, 'S'), v(sim, 'M')]).toEqual([true, false]);
  });
});

describe('source and sink transitions', () => {
  it('a source transition activates its step; staying true is stable', () => {
    const sim = run(
      build(
        { a: 'in' },
        { name: 'G1', initial: [0], steps: [0, 1], transitions: [[[], 'a', [1]]] },
      ),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.0', 'G1.1']);
    expect(sim.error).toBeNull();
  });

  it('a sink transition deactivates its step', () => {
    const sim = run(
      build({ a: 'in' }, { name: 'G1', initial: [0], steps: [0], transitions: [[[0], 'a', []]] }),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual([]);
  });
});

describe('several grafcets and forcing', () => {
  it('partial grafcets evolve together and refer to each other', () => {
    const sim = run(
      build(
        { b: 'in' },
        { name: 'G1', initial: [0], steps: [0, 1], transitions: [[[0], 'X11', [1]]] },
        { name: 'G2', initial: [10], steps: [10, 11], transitions: [[[10], 'b', [11]]] },
      ),
    );
    set(sim, { b: true });
    expect(X(sim)).toEqual(['G1.1', 'G2.11']);
  });

  const forcer = (order: string, extra: Tr[] = []): GSpec => ({
    name: 'G1',
    initial: [0],
    steps: [0, 1, 2],
    transitions: [[[0], 'a', [1]], ...extra],
    actions: [[1, 'forcing', order]],
  });
  const forced: GSpec = {
    name: 'G2',
    initial: [10],
    steps: [10, 11, 12],
    transitions: [
      [[10], 'b', [11]],
      [[11], 'c', [12]],
    ],
  };

  it('G2{11} imposes the situation and G2 does not evolve while forced', () => {
    const sim = run(build({ a: 'in', b: 'in', c: 'in' }, forcer('G2{11}'), forced));
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.1', 'G2.11']);
    set(sim, { c: true });
    expect(X(sim)).toEqual(['G1.1', 'G2.11']);
  });

  it('G2{*} freezes; when the forcing step ends, G2 evolves in the same cycle', () => {
    const sim = run(
      build({ a: 'in', b: 'in', c: 'in', d: 'in' }, forcer('G2{*}', [[[1], 'd', [2]]]), forced),
    );
    set(sim, { a: true });
    set(sim, { b: true });
    expect(X(sim)).toEqual(['G1.1', 'G2.10']);
    set(sim, { d: true });
    expect(X(sim)).toEqual(['G1.2', 'G2.11']);
  });

  it('G2{} empties the forced grafcet; G2{INIT} restores its initial situation', () => {
    const empty = run(build({ a: 'in', b: 'in', c: 'in' }, forcer('G2{}'), forced));
    set(empty, { a: true });
    expect(X(empty)).toEqual(['G1.1']);

    const init = run(build({ a: 'in', b: 'in', c: 'in' }, forcer('G2{INIT}'), forced));
    set(init, { b: true });
    expect(X(init)).toEqual(['G1.0', 'G2.11']);
    set(init, { a: true });
    expect(X(init)).toEqual(['G1.1', 'G2.10']);
  });

  it('forcing applies only once the forcing grafcet is stable (a transient forcing step does nothing)', () => {
    const sim = run(
      build({ a: 'in', b: 'in', c: 'in' }, forcer('G2{11}', [[[1], '1', [2]]]), forced),
    );
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G1.2', 'G2.10']);
  });

  it('events that occur while a grafcet is frozen are not seen after it is released', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          transitions: [
            [[0], 'a', [1]],
            [[1], '/a', [0]],
          ],
          actions: [[1, 'forcing', 'G2{*}']],
        },
        { name: 'G2', initial: [10], steps: [10, 11], transitions: [[[10], '↑b', [11]]] },
      ),
    );
    set(sim, { a: true });
    set(sim, { b: true });
    set(sim, { a: false });
    expect(X(sim)).toEqual(['G1.0', 'G2.10']);
  });
});

describe('determinism', () => {
  it('the same events produce the same history', () => {
    const p = build(
      { a: 'in', b: 'in', C: 'n', M: 'out' },
      {
        name: 'G1',
        initial: [0],
        steps: [0, 1, 2],
        transitions: [
          [[0], '↑a', [1]],
          [[1], '2s/X1', [2]],
          [[2], 'b', [0]],
        ],
        actions: [
          [1, 'storedOnActivation', 'C := C + 1'],
          [2, 'continuous', 'M'],
        ],
      },
    );
    const history = () => {
      const sim = run(p);
      const out: unknown[] = [];
      for (let k = 0; k < 5; k++) {
        out.push(
          ...sim.setInputs({ a: true }),
          ...sim.setInputs({ a: false }),
          ...sim.advanceTo(sim.time + 2500),
        );
        out.push(...sim.setInputs({ b: true }), ...sim.setInputs({ b: false }));
      }
      out.push(sim.snapshot());
      return JSON.stringify(out);
    };
    expect(history()).toBe(history());
    const sim = run(p);
    sim.setInputs({ a: true });
    sim.advanceTo(2000);
    expect(X(sim)).toEqual(['G1.2']);
    expect(v(sim, 'M')).toBe(true);
  });
});

describe('hierarchy', () => {
  const expansion: GSpec = {
    name: 'M1',
    kind: 'macroExpansion',
    steps: [10, 11],
    transitions: [[[10], 'c', [11]]],
    actions: [[11, 'continuous', 'Q']],
  };

  it('a macro-step is entered at E and left from S; Xn of the macro-step is its expansion activity', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in', c: 'in', Q: 'out' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          macro: { 1: 'M1' },
          transitions: [
            [[0], 'a', [1]],
            [[1], 'b', [2]],
          ],
        },
        expansion,
        { name: 'G2', initial: [20], steps: [20, 21], transitions: [[[20], 'X1', [21]]] },
      ),
    );
    expect(X(sim)).toEqual(['G1.0', 'G2.20']);
    set(sim, { a: true });
    expect(X(sim)).toEqual(['G2.21', 'M1.10']);
    expect(sim.snapshot().active).toContain('G1_1');
    set(sim, { b: true });
    expect(X(sim)).toEqual(['G2.21', 'M1.10']);
    set(sim, { c: true });
    // S (11) becomes active, b is already true: the macro-step is left in the same cycle.
    expect(X(sim)).toEqual(['G1.2', 'G2.21']);
    expect(v(sim, 'Q')).toBe(false);
  });

  it('a macro-step timer counts from the activation of its entry step', () => {
    const sim = run(
      build(
        { a: 'in', c: 'in' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          macro: { 1: 'M1' },
          transitions: [
            [[0], 'a', [1]],
            [[1], '1', [2]],
          ],
        },
        { name: 'M1', kind: 'macroExpansion', steps: [10, 11], transitions: [[[10], 'c', [11]]] },
        { name: 'G2', initial: [20], steps: [20, 21], transitions: [[[20], '2s/X1', [21]]] },
      ),
    );
    set(sim, { a: true });
    expect(sim.nextDeadline()).toBe(2000);
    sim.advanceTo(2000);
    expect(X(sim)).toEqual(['G2.21', 'M1.10']);
  });

  const enclosed: GSpec = {
    name: 'E1',
    kind: 'enclosed',
    initial: [30],
    steps: [30, 31, 32],
    transitions: [
      [[30], 'c', [31]],
      [[], 'd', [32]],
    ],
    actions: [[31, 'storedOnDeactivation', 'N := N + 1']],
  };

  it('an enclosing step activates its enclosed grafcet and deactivates it when left', () => {
    const sim = run(
      build(
        { a: 'in', b: 'in', c: 'in', d: 'in', N: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1, 2],
          enclosing: { 1: 'E1' },
          transitions: [
            [[0], 'a', [1]],
            [[1], 'b', [2]],
          ],
        },
        enclosed,
      ),
    );
    expect(X(sim)).toEqual(['G1.0']);
    set(sim, { d: true });
    expect(X(sim)).toEqual(['G1.0']); // source transition of the enclosed grafcet is guarded
    set(sim, { d: false });
    set(sim, { a: true });
    expect(X(sim)).toEqual(['E1.30', 'G1.1']);
    set(sim, { c: true });
    expect(X(sim)).toEqual(['E1.31', 'G1.1']);
    set(sim, { b: true });
    expect(X(sim)).toEqual(['G1.2']);
    expect(v(sim, 'N')).toBe(1);
  });

  it('re-activating an enclosing step through its own loop keeps the enclosed situation (rule 5)', () => {
    const sim = run(
      build(
        { a: 'in', c: 'in', e: 'in', N: 'n' },
        {
          name: 'G1',
          initial: [0],
          steps: [0, 1],
          enclosing: { 1: 'E1' },
          transitions: [
            [[0], 'a', [1]],
            [[1], '↑e', [1]],
          ],
        },
        enclosed,
      ),
    );
    set(sim, { a: true });
    set(sim, { c: true });
    set(sim, { e: true });
    expect(X(sim)).toEqual(['E1.31', 'G1.1']);
  });
});
