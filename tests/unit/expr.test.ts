import { describe, expect, it } from 'vitest';
import type { BoolNode } from '@/core/expr/ast';
import {
  analyzeAssignment,
  analyzeCondition,
  analyzeForcing,
  analyzeOutput,
  buildEnv,
  type ExpressionKind,
} from '@/core/expr/check';
import { declareUnknownNames, unusedVariables, variableUsage } from '@/core/model/variables';
import { toggleEdge } from '@/core/expr/edges';
import {
  formatTextbook,
  renameIdentifier,
  runsToPlainText,
  textbookSignalColumns,
} from '@/core/expr/format';
import { signalsOf, signalValue } from '@/core/expr/signals';
import { parseAssignment, parseBool, parseForcing } from '@/core/expr/parser';
import { createGrafcet, createProject, createStep } from '@/core/model/factory';
import type { Project } from '@/core/model/types';

/** Compact S-expression of an AST, for readable precedence assertions. */
function sx(n: BoolNode): string {
  switch (n.type) {
    case 'const':
      return n.value ? '1' : '0';
    case 'var':
      return n.name;
    case 'step':
      return `X${n.number}`;
    case 'not':
      return `(not ${sx(n.operand)})`;
    case 'and':
    case 'or':
      return `(${n.type} ${sx(n.left)} ${sx(n.right)})`;
    case 'edge':
      return `(${n.rising ? 're' : 'fe'} ${sx(n.operand)})`;
    case 'timer':
      return `(timer ${n.t1} ${sx(n.operand)}${n.t2 !== undefined ? ` ${n.t2}` : ''})`;
    case 'cmp': {
      const a = (x: typeof n.left): string =>
        x.type === 'num'
          ? String(x.value)
          : x.type === 'dur'
            ? `${x.ms}ms`
            : x.type === 'avar'
              ? x.name
              : x.type === 'neg'
                ? `(- ${a(x.operand)})`
                : `(${x.op} ${a(x.left)} ${a(x.right)})`;
      return `(${n.op} ${a(n.left)} ${a(n.right)})`;
    }
  }
}

function p(source: string): string {
  const r = parseBool(source);
  if (!r.ok) throw new Error(`parse failed: ${r.error.code} at ${r.error.start}`);
  return sx(r.value);
}

function err(source: string) {
  const r = parseBool(source);
  if (r.ok) throw new Error(`expected an error for ${source}`);
  return r.error;
}

describe('precedence and associativity', () => {
  it('AND binds tighter than OR', () => {
    expect(p('a + b * c')).toBe('(or a (and b c))');
    expect(p('a * b + c')).toBe('(or (and a b) c)');
    expect(p('(a + b) * c')).toBe('(and (or a b) c)');
  });
  it('NOT binds tighter than AND and applies to its operand only', () => {
    expect(p('/a * b')).toBe('(and (not a) b)');
    expect(p('/(a * b)')).toBe('(not (and a b))');
    expect(p('//a')).toBe('(not (not a))');
  });
  it('binary operators are left-associative', () => {
    expect(p('a + b + c')).toBe('(or (or a b) c)');
    expect(p('a * b * c')).toBe('(and (and a b) c)');
  });
  it('edges apply to a primary', () => {
    expect(p('↑a * b')).toBe('(and (re a) b)');
    expect(p('↓(a + b)')).toBe('(fe (or a b))');
  });
  it('comparisons take the longest arithmetic operands', () => {
    expect(p('C + 1 * 2 > 3')).toBe('(> (+ C (* 1 2)) 3)');
    expect(p('a * (C >= 10)')).toBe('(and a (>= C 10))');
    expect(p('(a + b) * c')).toBe('(and (or a b) c)');
    expect(p('-T < 5 - 2 - 1')).toBe('(< (- T) (- (- 5 2) 1))');
  });
});

describe('all operator spellings', () => {
  it.each([
    ['a + b', 'a OR b', 'a || b', 'a or b'],
    ['a · b', 'a * b', 'a AND b', 'a && b'],
  ])('%s', (...forms) => {
    const expected = p(forms[0]!);
    for (const f of forms) expect(p(f)).toBe(expected);
  });
  it('NOT forms', () => {
    for (const f of ['¬a', '/a', 'NOT a', '!a', 'not a']) expect(p(f)).toBe('(not a)');
  });
  it('edge forms', () => {
    for (const f of ['↑a', 'RE a', 're a']) expect(p(f)).toBe('(re a)');
    for (const f of ['↓a', 'FE a']) expect(p(f)).toBe('(fe a)');
  });
  it('comparison operators and aliases', () => {
    const ops: [string, string][] = [
      ['=', '='],
      ['<>', '<>'],
      ['<', '<'],
      ['<=', '<='],
      ['>', '>'],
      ['>=', '>='],
      ['≠', '<>'],
      ['≤', '<='],
      ['≥', '>='],
      ['!=', '<>'],
      ['==', '='],
    ];
    for (const [src, op] of ops) expect(p(`C ${src} 2`)).toBe(`(${op} C 2)`);
  });
  it('timers, durations, steps and constants', () => {
    expect(p('3s/X2')).toBe('(timer 3000 X2)');
    expect(p('500ms/a/2min')).toBe('(timer 500 a 120000)');
    expect(p('1h/(a * b)')).toBe('(timer 3600000 (and a b))');
    expect(p('1.5s/a')).toBe('(timer 1500 a)');
    expect(p('X12 * x3')).toBe('(and X12 X3)');
    expect(p('TRUE + false * 1 + 0')).toBe('(or (or 1 (and 0 1)) 0)');
    expect(p('t >= 5s')).toBe('(>= t 5000ms)');
  });
  it('textbook symbols round-trip through the formatter', () => {
    const src = '/(a + ↑b) · c + 3s/X2 + (C ≥ 4)';
    const text = runsToPlainText(
      formatTextbook((parseBool(src) as { ok: true; value: BoolNode }).value),
    );
    expect(p(text.replaceAll('¬', '/'))).toBe(p(src));
  });
});

describe('errors carry a position and a hint', () => {
  it.each([
    ['', 'empty', 0, 'useOne'],
    ['a +', 'unexpectedEnd', 3, 'operandExpected'],
    ['a b', 'unexpectedToken', 2, 'missingOperator'],
    ['(a + b', 'missingParen', 6, 'closeParen'],
    ['a + b)', 'unexpectedToken', 5, 'unmatchedParen'],
    ['a $ b', 'unexpectedChar', 2, undefined],
    ['3x/a', 'invalidNumber', 0, 'durationUnits'],
    ['2', 'numberAsCondition', 0, 'compareNumber'],
    ['a /b', 'unexpectedToken', 2, 'slashIsNot'],
    ['3s', 'timerOperand', 2, 'timerSyntax'],
    ['a := 1', 'unexpectedToken', 2, 'assignInCondition'],
    ['> 3', 'unexpectedToken', 0, 'cmpNeedsNumbers'],
  ])('%j → %s at %i', (source, code, start, hint) => {
    const e = err(source);
    expect(e.code).toBe(code);
    expect(e.start).toBe(start);
    expect(e.hint).toBe(hint);
  });
});

describe('assignments, outputs and forcing orders', () => {
  it('parses both readings of an assignment value', () => {
    const r = parseAssignment('C := C + 1');
    expect(r.ok && r.value.target).toBe('C');
    expect(r.ok && r.value.arith?.type).toBe('arith');
    const bad = parseAssignment('M = 1');
    expect(!bad.ok && bad.error.hint).toBe('useAssign');
  });
  it('reads a variable alone as setting it to TRUE', () => {
    const r = parseAssignment('M1');
    expect(r.ok && r.value).toMatchObject({
      target: 'M1',
      shorthand: true,
      bool: { type: 'const', value: true },
      arith: null,
    });
    expect(parseAssignment('M1 M2').ok).toBe(false);
  });
  it('parses forcing orders', () => {
    const f = (s: string) => {
      const r = parseForcing(s);
      if (!r.ok) throw new Error(r.error.code);
      return r.value;
    };
    expect(f('G2{8}')).toMatchObject({ grafcet: 'G2', mode: 'steps', steps: [{ number: 8 }] });
    expect(f('G2{8, 9}').steps.map((s) => s.number)).toEqual([8, 9]);
    expect(f('G2{X8}').steps.map((s) => s.number)).toEqual([8]);
    expect(f('G2{*}').mode).toBe('freeze');
    expect(f('G2{}')).toMatchObject({ mode: 'steps', steps: [] });
    expect(f('G2{INIT}').mode).toBe('init');
    expect(parseForcing('G2{8').ok).toBe(false);
    expect(parseForcing('G2 8').ok).toBe(false);
  });
});

function project(): Project {
  const p = createProject('T');
  const g1 = p.grafcets[p.grafcetOrder[0]!]!;
  const s1 = createStep(1, { x: 0, y: 0 });
  g1.steps[s1.id] = s1;
  const g2 = createGrafcet('G2');
  for (const n of [1, 20]) {
    const s = createStep(n, { x: 0, y: 0 });
    g2.steps[s.id] = s;
  }
  const g3 = createGrafcet('G3');
  for (const n of [30, 31]) {
    const s = createStep(n, { x: 0, y: 0 });
    g3.steps[s.id] = s;
  }
  const g4 = createGrafcet('G4');
  const s30 = createStep(30, { x: 0, y: 0 });
  g4.steps[s30.id] = s30;
  for (const g of [g2, g3, g4]) {
    p.grafcets[g.id] = g;
    p.grafcetOrder.push(g.id);
  }
  p.variables.v1 = { id: 'v1', name: 'Start', type: 'BOOL', direction: 'input' };
  p.variables.v2 = { id: 'v2', name: 'Count', type: 'INT', direction: 'internal' };
  p.variables.v3 = { id: 'v3', name: 'Motor', type: 'BOOL', direction: 'output' };
  p.variables.v4 = { id: 'v4', name: 'Level', type: 'REAL', direction: 'input' };
  return p;
}

describe('name resolution and types', () => {
  const p = project();
  const env = buildEnv(p, p.grafcetOrder[0]!);
  const codes = (src: string) => analyzeCondition(src, env).diagnostics.map((d) => d.code);

  it('accepts valid references case-insensitively', () => {
    expect(codes('start * (COUNT > 2) + X1 + X20 + (Level >= 1.5)')).toEqual([]);
    expect([...analyzeCondition('START', env).references]).toEqual(['start']);
  });
  it('reports unknown identifiers with a suggestion and what to create', () => {
    const d = analyzeCondition('Strat', env).diagnostics[0]!;
    expect(d).toMatchObject({
      code: 'unknownIdentifier',
      start: 0,
      end: 5,
      params: { suggestion: 'Start' },
      hint: 'didYouMean',
    });
    expect(d.create).toEqual({ name: 'Strat', type: 'BOOL', direction: 'input' });
  });
  it('flags type errors', () => {
    expect(codes('Count')).toEqual(['notBoolean']);
    expect(codes('Start + 1 > 2')).toEqual(['boolInArithmetic']);
    expect(codes('Start = 1')).toEqual([]);
    expect(codes('X1 + 1 > 2')).toEqual(['stepInArithmetic']);
  });
  it('resolves Xn locally, then uniquely in other grafcets', () => {
    expect(codes('X1')).toEqual([]); // local step 1 wins over G2's step 1
    expect(codes('X20')).toEqual([]); // only in G2
    expect(codes('X31')).toEqual([]);
    expect(codes('X30')).toEqual(['ambiguousStep']); // in G3 and G4
    expect(codes('X99')).toEqual(['unknownStep']);
  });
  it('checks action texts', () => {
    expect(analyzeOutput('motor', env).diagnostics).toEqual([]);
    expect(analyzeOutput('Start', env).diagnostics[0]!.code).toBe('writesInput');
    expect(analyzeOutput('Count', env).diagnostics[0]!.code).toBe('notBoolean');
    expect(analyzeAssignment('Count := Count + 1', env).diagnostics).toEqual([]);
    expect(analyzeAssignment('Motor := Start * /X1', env).diagnostics).toEqual([]);
    expect(analyzeAssignment('Level := 1', env).diagnostics[0]!.code).toBe('writesInput');
    // A name alone sets a BOOL; other types need a value.
    expect(analyzeAssignment('Motor', env).diagnostics).toEqual([]);
    expect(analyzeAssignment('Count', env).diagnostics[0]).toMatchObject({
      code: 'assignmentExpected',
      hint: 'shorthandBool',
    });
    expect(analyzeAssignment('Lamp', env).diagnostics[0]!.create).toMatchObject({ type: 'BOOL' });
    expect(analyzeAssignment('N := N + 1', env).diagnostics[0]!.create).toMatchObject({
      type: 'INT',
    });
    expect(analyzeAssignment('M := a * b', env).diagnostics[0]!.create).toMatchObject({
      type: 'BOOL',
    });
    expect(analyzeForcing('G2{20}', env).diagnostics).toEqual([]);
    expect(analyzeForcing('G2{21}', env).diagnostics[0]!.code).toBe('unknownForcedStep');
    expect(analyzeForcing('G9{1}', env).diagnostics[0]!.code).toBe('unknownGrafcet');
    expect(analyzeForcing('G1{1}', env).diagnostics[0]!.code).toBe('forcesItself');
  });
});

describe('formatting and refactoring', () => {
  it('draws NOT as stacked bars', () => {
    const r = parseBool('/(a + /b) * c');
    expect(r.ok && formatTextbook(r.value)).toEqual([
      { text: 'a + ', bars: 1 },
      { text: 'b', bars: 2 },
      { text: '·c', bars: 0 },
    ]);
  });
  it('renames identifiers only', () => {
    expect(renameIdentifier('start * /Start2 + START', 'start', 'Go')).toBe('Go * /Start2 + Go');
    expect(renameIdentifier('C := c + 1', 'C', 'Count')).toBe('Count := Count + 1');
  });
});

describe('names written before they are declared', () => {
  const declared = (kind: ExpressionKind, source: string, setup?: (p: Project) => void) => {
    const proj = createProject('T');
    setup?.(proj);
    const gid = proj.grafcetOrder[0]!;
    const before = Object.keys(proj.variables).length;
    const out = declareUnknownNames(proj, gid, kind, source).map(
      (v) => `${v.name} ${v.type} ${v.direction}`,
    );
    expect(Object.keys(proj.variables).length).toBe(before + out.length);
    return out;
  };

  it('are declared as their use suggests', () => {
    expect(declared('condition', '↑start * (level > 80) + X0')).toEqual([
      'start BOOL input',
      'level INT input',
    ]);
    expect(declared('output', 'Motor')).toEqual(['Motor BOOL output']);
    // Computed with a number: INT, declared once.
    expect(declared('assignment', 'Total := Total + rate * 2')).toEqual([
      'Total INT internal',
      'rate INT internal',
    ]);
    expect(declared('assignment', 'Req := a * /b')).toEqual([
      'Req BOOL internal',
      'a BOOL input',
      'b BOOL input',
    ]);
  });

  it('are left alone while the text does not parse, and declared names are kept', () => {
    expect(declared('condition', 'a * (b')).toEqual([]);
    expect(
      declared('condition', 'go * stop', (proj) => {
        proj.variables.v = { id: 'v', name: 'Go', type: 'BOOL', direction: 'internal' };
      }),
    ).toEqual(['stop BOOL input']);
  });
});

describe('signals shown while simulating', () => {
  it('are found in reading order, located in typed and textbook text, and evaluated', () => {
    const source = '↑start * /(a + X2) * (level >= 80)';
    const r = parseBool(source);
    if (!r.ok) throw new Error('parse');
    const signals = signalsOf(r.value);
    expect(signals.map((s) => source.slice(s.start, s.end))).toEqual([
      'start',
      'a',
      'X2',
      '(level >= 80)', // The parser's span includes the parentheses.
    ]);
    const shown = [
      ...formatTextbook(r.value)
        .map((x) => x.text)
        .join(''),
    ];
    expect(textbookSignalColumns(r.value).map((c) => shown.slice(c.start, c.end).join(''))).toEqual(
      ['start', 'a', 'X2', 'level ≥ 80'],
    );
    const values: Record<string, boolean | number> = { start: true, level: 85 };
    const on = signals.map((s) =>
      signalValue(
        s,
        (n) => values[n],
        (n) => n === 3,
      ),
    );
    expect(on).toEqual([true, false, false, true]);
  });
});

describe('unused variables', () => {
  it('are those no expression reads or writes and no scenario drives', () => {
    const proj = createProject('T');
    const g = proj.grafcets[proj.grafcetOrder[0]!]!;
    const s = createStep(1, { x: 0, y: 0 });
    g.steps[s.id] = s;
    g.actions.a = {
      id: 'a',
      stepId: s.id,
      order: 0,
      kind: 'storedOnActivation',
      text: 'C := C + 1',
    };
    for (const name of ['C', 'Lamp', 'push', 'spare'])
      proj.variables[name] = { id: name, name, type: 'BOOL', direction: 'input' };
    proj.scenarios = { sc: { id: 'sc', name: 'S', events: [{ t: 0, name: 'PUSH', value: true }] } };
    expect(unusedVariables(proj, variableUsage(proj)).map((v) => v.name)).toEqual([
      'Lamp',
      'spare',
    ]);
  });
});

describe('toggleEdge', () => {
  const at = (s: string) => ({ value: s.replace('|', ''), caret: s.indexOf('|') });
  const run = (s: string, edge: '↑' | '↓') => {
    const { value, caret } = at(s);
    const r = toggleEdge(value, caret, edge);
    return r.text.slice(0, r.caret) + '|' + r.text.slice(r.caret);
  };
  it('adds an edge to the operand at the caret', () => {
    expect(run('a * st|art', '↑')).toBe('a * ↑st|art');
    expect(run('a * start|', '↓')).toBe('a * ↓start|');
    expect(run('|X2', '↑')).toBe('↑|X2');
  });
  it('swaps and removes edges, RE / FE included', () => {
    expect(run('↑sta|rt', '↓')).toBe('↓sta|rt');
    expect(run('↑sta|rt', '↑')).toBe('sta|rt');
    expect(run('RE sta|rt', '↑')).toBe('sta|rt');
    expect(run('FE b|', '↑')).toBe('↑b|');
  });
  it('inserts the symbol where there is no operand', () => {
    expect(run('a * |', '↑')).toBe('a * ↑|');
    expect(run('3s|/X2', '↑')).toBe('3s|/X2'.replace('|', '↑|'));
  });
  it('does not mistake a name ending in RE for an edge', () => {
    expect(run('PRE b|', '↑')).toBe('PRE ↑b|');
  });
});
