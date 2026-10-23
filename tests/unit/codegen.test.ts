/**
 * Code generation: one snapshot per construct for Structured Text and PLCopen XML, plus checks
 * that the XML is well formed and that key semantics (rule 5, guards, forcing) are present.
 */
import { describe, expect, it } from 'vitest';
import { generatePlcOpen } from '@/core/codegen/plcopen';
import { generateSt } from '@/core/codegen/st';
import { generateStCase } from '@/core/codegen/stCase';
import { timeLiteral } from '@/core/codegen/common';
import { SCHEMA_VERSION } from '@/core/model/constants';
import type {
  ActionKind,
  Grafcet,
  GrafcetKind,
  Project,
  Variable,
  VariableType,
} from '@/core/model/types';

type Dir = Variable['direction'];
type Tr = [from: number[], receptivity: string, to: number[]];
type Act = [step: number, kind: ActionKind, text: string, condition?: string];
interface GSpec {
  name: string;
  kind?: GrafcetKind;
  initial?: number[];
  macro?: Record<number, string>;
  enclosing?: Record<number, string>;
  steps: number[];
  transitions: Tr[];
  actions?: Act[];
}

function build(
  vars: [name: string, type: VariableType, dir: Dir, extra?: Partial<Variable>][],
  ...specs: GSpec[]
): Project {
  const p: Project = {
    schemaVersion: SCHEMA_VERSION,
    id: 'p',
    name: 'Test cell',
    meta: { author: 'QA', company: 'ACME', revision: 'B', createdAt: '', updatedAt: '' },
    variables: {},
    grafcets: {},
    grafcetOrder: [],
  };
  for (const [name, type, direction, extra] of vars)
    p.variables[name] = { id: name, name, type, direction, ...extra };
  for (const spec of specs) {
    const g: Grafcet = {
      id: spec.name,
      name: spec.name,
      kind: spec.kind ?? 'partial',
      steps: {},
      transitions: {},
      actions: {},
      comments: {},
    };
    const ids = new Map<number, string>();
    const ys = new Map<number, number>();
    spec.steps.forEach((n, i) => {
      const id = `${spec.name}_${n}`;
      ids.set(n, id);
      ys.set(n, i * 120);
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
        ...(spec.macro?.[n]
          ? { refGrafcetId: spec.macro[n] }
          : spec.enclosing?.[n]
            ? { refGrafcetId: spec.enclosing[n] }
            : {}),
      };
    });
    spec.transitions.forEach(([from, receptivity, to], i) => {
      const y = from.length ? Math.max(...from.map((n) => ys.get(n)!)) + 60 : ys.get(to[0]!)! - 60;
      g.transitions[`${spec.name}_t${i}`] = {
        id: `${spec.name}_t${i}`,
        from: from.map((n) => ids.get(n)!),
        to: to.map((n) => ids.get(n)!),
        receptivity,
        position: { x: i * 10, y },
      };
    });
    (spec.actions ?? []).forEach(([step, kind, text, condition], i) => {
      const id = `${spec.name}_a${i}`;
      g.actions[id] = {
        id,
        stepId: ids.get(step)!,
        order: i,
        kind,
        text,
        ...(condition ? { condition } : {}),
      };
    });
    p.grafcets[g.id] = g;
    p.grafcetOrder.push(g.id);
  }
  return p;
}

const OPTS = { version: '1.0.0', date: new Date('2026-01-02T03:04:00Z') };
const st = (p: Project, loop = false) => generateSt(p, { ...OPTS, stabilityLoop: loop });
const xml = (p: Project) => generatePlcOpen(p, OPTS);

/** Tags open and close in order (CDATA, comments and the declaration ignored). */
function wellFormed(doc: string): boolean {
  const text = doc
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '');
  const stack: string[] = [];
  for (const m of text.matchAll(/<(\/?)([\w:]+)(?:\s[^<>]*?)?(\/?)>/g)) {
    if (m[3]) continue;
    if (!m[1]) stack.push(m[2]!);
    else if (stack.pop() !== m[2]) return false;
  }
  return stack.length === 0 && !/[<>]/.test(text.replace(/<[^<>]+>/g, ''));
}

const SEQUENCE = build(
  [
    ['start', 'BOOL', 'input', { address: '%I0.0', comment: 'Start button' }],
    ['full', 'BOOL', 'input'],
    ['empty', 'BOOL', 'input'],
    ['Pump', 'BOOL', 'output', { address: '%Q0.0' }],
    ['Valve', 'BOOL', 'output'],
  ],
  {
    name: 'G1',
    initial: [0],
    steps: [0, 1, 2],
    transitions: [
      [[0], 'start', [1]],
      [[1], 'full', [2]],
      [[2], 'empty', [0]],
    ],
    actions: [
      [1, 'continuous', 'Pump'],
      [2, 'continuous', 'Valve'],
    ],
  },
);

const OR = build(
  [
    ['a', 'BOOL', 'input'],
    ['b', 'BOOL', 'input'],
    ['c', 'BOOL', 'input'],
  ],
  {
    name: 'G1',
    initial: [0],
    steps: [0, 1, 2, 3],
    transitions: [
      [[0], 'a', [1]],
      [[0], '/a * b', [2]],
      [[1], 'c', [3]],
      [[2], 'c', [3]],
      [[3], '1', [0]],
    ],
  },
);

const AND = build(
  [
    ['go', 'BOOL', 'input'],
    ['d1', 'BOOL', 'input'],
    ['d2', 'BOOL', 'input'],
    ['Drill', 'BOOL', 'output'],
    ['Clamp', 'BOOL', 'output'],
  ],
  {
    name: 'G1',
    initial: [0],
    steps: [0, 1, 2, 3],
    transitions: [
      [[0], 'go', [1, 2]],
      [[1, 2], 'd1 * d2', [3]],
      [[3], '1', [0]],
    ],
    actions: [
      [1, 'continuous', 'Drill'],
      [2, 'continuous', 'Clamp'],
    ],
  },
);

const TIMERS = build(
  [
    ['b', 'BOOL', 'input'],
    ['Lamp', 'BOOL', 'output'],
    ['Horn', 'BOOL', 'output'],
  ],
  {
    name: 'G1',
    initial: [0],
    steps: [0, 1, 2],
    transitions: [
      [[0], '↑b', [1]],
      [[1], '5s/X1 + ↓b', [2]],
      [[2], '2s/b/90s', [0]],
    ],
    actions: [
      [1, 'continuous', 'Lamp', '500ms/X1'],
      [2, 'continuous', 'Horn', '/(3s/X2)'],
    ],
  },
);

const STORED = build(
  [
    ['reset', 'BOOL', 'input'],
    ['level', 'REAL', 'input'],
    ['C', 'INT', 'internal', { initialValue: 2 }],
    ['Speed', 'REAL', 'output', { initialValue: 1.5 }],
    ['Delay', 'TIME', 'internal', { initialValue: 90500 }],
    ['Motor', 'BOOL', 'output'],
    ['Done', 'BOOL', 'internal'],
  ],
  {
    name: 'G1',
    initial: [0],
    steps: [0, 1],
    transitions: [
      [[0], '(level > 80.5) + (C = 3)', [1]],
      [[1], '((C + 1) MOD 2 = 0) * Done', [0]],
    ],
    actions: [
      [1, 'storedOnActivation', 'C := C + 1'],
      [1, 'storedOnActivation', 'Motor := 1'],
      [1, 'storedOnDeactivation', 'Motor := 0'],
      [1, 'storedOnEvent', 'C := 0', '↑reset'],
      [1, 'storedOnActivation', 'Speed := Speed * 2', 'level < 10'],
      [0, 'storedOnActivation', 'Done := (C >= 3) * /reset'],
    ],
  },
);

const FORCING = build(
  [
    ['stop', 'BOOL', 'input'],
    ['run', 'BOOL', 'input'],
  ],
  {
    name: 'Safety',
    initial: [0],
    steps: [0, 1, 2, 3],
    transitions: [
      [[0], 'stop', [1]],
      [[1], '/stop', [2]],
      [[2], '1', [3]],
      [[3], 'run', [0]],
    ],
    actions: [
      [1, 'forcing', 'Cycle{11}'],
      [2, 'forcing', 'Cycle{*}'],
      [3, 'forcing', 'Cycle{INIT}'],
    ],
  },
  {
    name: 'Cycle',
    initial: [10],
    steps: [10, 11],
    transitions: [
      [[10], 'run', [11]],
      [[11], '/run * X1', [10]],
    ],
  },
);

const MACRO = build(
  [
    ['start', 'BOOL', 'input'],
    ['a', 'BOOL', 'input'],
    ['Busy', 'BOOL', 'output'],
  ],
  {
    name: 'G1',
    initial: [0],
    steps: [0, 10],
    macro: { 10: 'M10' },
    transitions: [
      [[0], 'start', [10]],
      [[10], '1', [0]],
    ],
    actions: [[10, 'continuous', 'Busy']],
  },
  {
    name: 'M10',
    kind: 'macroExpansion',
    steps: [11, 12],
    transitions: [[[11], 'a', [12]]],
  },
);

const ENCLOSING = build(
  [
    ['auto', 'BOOL', 'input'],
    ['b', 'BOOL', 'input'],
  ],
  {
    name: 'Modes',
    initial: [0],
    steps: [0, 1],
    enclosing: { 1: 'Auto' },
    transitions: [
      [[0], 'auto', [1]],
      [[1], '/auto', [0]],
    ],
  },
  {
    name: 'Auto',
    kind: 'enclosed',
    initial: [20],
    steps: [20, 21],
    transitions: [
      [[20], 'b', [21]],
      [[21], '/b', [20]],
    ],
  },
);

const SOURCE_SINK = build([['a', 'BOOL', 'input']], {
  name: 'G1',
  initial: [0],
  steps: [0, 1],
  transitions: [
    [[], 'a', [1]],
    [[1], '/a', []],
  ],
});

describe('Structured Text', () => {
  it.each([
    ['sequence and loop', SEQUENCE],
    ['OR divergence and convergence', OR],
    ['AND divergence and convergence', AND],
    ['timers and edges', TIMERS],
    ['stored actions, comparisons and types', STORED],
    ['forcing orders', FORCING],
    ['macro-step', MACRO],
    ['enclosing step', ENCLOSING],
    ['source and sink transitions', SOURCE_SINK],
  ])('%s', (_, project) => {
    const r = st(project);
    expect(r.warnings).toEqual([]);
    expect(r.code).toMatchSnapshot();
  });

  it('stability loop variant', () => {
    expect(st(SEQUENCE, true).code).toMatchSnapshot();
  });

  it('implements rule 5 and the initial situation in the step equations', () => {
    const code = st(SEQUENCE).code;
    expect(code).toContain('G1_X0 := (G1_X0 AND NOT G1_T1) OR G1_T3 OR Init;');
    expect(code).toContain('G1_T1 := G1_X0 AND start;');
    expect(code).toMatch(/generated – review before use/);
  });

  it('guards enclosed grafcets and freezes forced ones', () => {
    expect(st(ENCLOSING).code).toContain('Auto_T1 := Auto_X20 AND b AND Modes_X1;');
    expect(st(FORCING).code).toMatch(/Cycle_T1 := Cycle_X10 AND run AND NOT Cycle_Forced;/);
  });

  it('reports what cannot be generated', () => {
    const p = build([['a', 'BOOL', 'input']], {
      name: 'G1',
      initial: [0],
      steps: [0, 1],
      transitions: [
        [[0], 'a * ghost', [1]],
        [[1], 'a *', [0]],
      ],
    });
    const codes = st(p)
      .warnings.map((w) => w.code)
      .sort();
    expect(codes).toEqual(['expression', 'undeclared']);
    expect(st(p).code).toContain('ghost : BOOL;   (* not declared in the project *)');
  });
});

describe('Structured Text, CASE style', () => {
  const stCase = (p: Project) => generateStCase(p, OPTS);

  it.each([
    ['sequence and loop', SEQUENCE],
    ['OR divergence and convergence', OR],
    ['AND divergence and convergence', AND],
    ['timers and edges', TIMERS],
    ['stored actions, comparisons and types', STORED],
    ['forcing orders', FORCING],
    ['macro-step', MACRO],
    ['enclosing step', ENCLOSING],
    ['source and sink transitions', SOURCE_SINK],
  ])('%s', (_, project) => {
    const r = stCase(project);
    expect(r.warnings.filter((w) => w.code !== 'parallelSequence')).toEqual([]);
    expect(r.code).toMatchSnapshot();
  });

  it('runs each sequence as a CASE on one step variable', () => {
    const code = stCase(SEQUENCE).code;
    expect(code).toContain('step_G1 : INT := 0;');
    expect(code).toContain(
      ['CASE step_G1 OF', '\t0:', '\t\tIF start THEN', '\t\t\tstep_G1 := 1;', '\t\tEND_IF;'].join(
        '\n',
      ),
    );
    expect(code).toContain('\tELSE\n\t\tstep_G1_range_error := TRUE;\nEND_CASE;');
    expect(code).toContain('Pump := step_G1 = 1;');
  });

  it('gives alternative branches priority from left to right and skips IF for 1', () => {
    const code = stCase(OR).code;
    expect(code).toMatch(/IF a THEN\n\t\t\tstep_G1 := 1;\n\t\tELSIF NOT a AND b THEN\n/);
    expect(code).toContain('\t3:\n\t\tstep_G1 := 0;');
  });

  it('writes outputs as step ranges and parenthesizes comparisons only under NOT', () => {
    const p = build(
      [
        ['a', 'BOOL', 'input'],
        ['Run', 'BOOL', 'output'],
        ['Lamp', 'BOOL', 'output'],
      ],
      {
        name: 'Main',
        initial: [0],
        steps: [0, 1, 2, 3, 4, 6],
        transitions: [
          [[0], 'a', [1]],
          [[1], 'a', [2]],
          [[2], 'a', [3]],
          [[3], 'a', [4]],
          [[4], 'a', [6]],
          [[6], '/a * /X2', [0]],
        ],
        actions: [
          [1, 'continuous', 'Run'],
          [2, 'continuous', 'Run'],
          [3, 'continuous', 'Run'],
          [6, 'continuous', 'Run'],
          [4, 'continuous', 'Lamp', '/X1 + a'],
        ],
      },
    );
    const code = stCase(p).code;
    expect(code).toContain('Run := (step_Main >= 1 AND step_Main <= 3) OR step_Main = 6;');
    expect(code).toContain('Lamp := step_Main = 4 AND (NOT (step_Main = 1) OR a);');
    expect(code).toContain('IF NOT a AND NOT (step_Main = 2) THEN');
  });

  it('runs stored actions in the transitions and on events', () => {
    const code = stCase(STORED).code;
    expect(code).toMatch(/\t\t\tstep_G1 := 1;\n\t\t\tC := C \+ 1;\n\t\t\tMotor := TRUE;\n/);
    expect(code).toMatch(/\t\t\tMotor := FALSE;\n\t\t\tstep_G1 := 0;\n/);
    expect(code).toContain('IF step_G1 = 1 AND RE_reset.Q THEN');
    expect(code).toContain('IF Init THEN\n\tDone := C >= 3 AND NOT reset;\nEND_IF;');
  });

  it('replaces the CASE of a forced grafcet while the order is active', () => {
    const code = stCase(FORCING).code;
    expect(code).toContain('IF step_Safety = 3 THEN\t// Cycle{INIT}\n\tstep_Cycle := 10;');
    expect(code).toContain('ELSIF step_Safety = 2 THEN\t// Cycle{*}\n\t;\t// frozen');
    expect(code).toContain('ELSIF step_Safety = 1 THEN\t// Cycle{11}\n\tstep_Cycle := 11;');
    expect(code.indexOf('CASE step_Safety')).toBeLessThan(code.indexOf('CASE step_Cycle'));
  });

  it('keeps one BOOL per step for parallel branches', () => {
    const r = stCase(AND);
    expect(r.warnings.map((w) => w.code)).toEqual(['parallelSequence']);
    expect(r.code).toContain('G1_X1 := (G1_X1 AND NOT G1_T2) OR G1_T1;');
    expect(r.code).not.toMatch(/^CASE /m);
  });
});

describe('PLCopen XML', () => {
  it.each([
    ['sequence and loop', SEQUENCE],
    [
      'OR and AND structures',
      build([['a', 'BOOL', 'input']], ...([] as GSpec[]), {
        name: 'G1',
        initial: [0],
        steps: [0, 1, 2, 3, 4],
        transitions: [
          [[0], 'a', [1, 2]],
          [[1, 2], '1', [3]],
          [[3], 'a', [4]],
          [[3], '/a', [0]],
          [[4], '1', [0]],
        ],
      }),
    ],
    ['action qualifiers', STORED],
    ['timers, edges and step signals', TIMERS],
    ['macro-step inlined', MACRO],
  ])('%s', (_, project) => {
    const r = xml(project);
    expect(wellFormed(r.code)).toBe(true);
    expect(r.code).toMatchSnapshot();
  });

  it('warns about constructs SFC cannot express', () => {
    expect(xml(FORCING).warnings.map((w) => w.code)).toContain('forcing');
    expect(xml(ENCLOSING).warnings.map((w) => w.code)).toContain('enclosed');
    expect(
      xml(SOURCE_SINK)
        .warnings.map((w) => w.code)
        .sort(),
    ).toEqual(['sinkTransition', 'sourceTransition']);
    expect(wellFormed(xml(FORCING).code)).toBe(true);
  });
});

describe('literals', () => {
  it('writes IEC durations', () => {
    expect(timeLiteral(0)).toBe('T#0ms');
    expect(timeLiteral(500)).toBe('T#500ms');
    expect(timeLiteral(90_500)).toBe('T#1m30s500ms');
    expect(timeLiteral(3_600_000)).toBe('T#1h');
  });
});
