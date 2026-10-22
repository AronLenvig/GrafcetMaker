/**
 * Shared pieces of the code generators: identifier allocation, IEC 61131-3 literals and the
 * translation of GRAFCET expressions to Structured Text.
 */
import type { ArithNode, BoolNode } from '../expr/ast';
import type { Id, Variable, VariableType } from '../model/types';

/** Something the generated code cannot express exactly; shown to the user before downloading. */
export interface CodegenWarning {
  code:
    | 'expression'
    | 'undeclared'
    | 'keyword'
    | 'unknownStep'
    | 'macroStoredAction'
    | 'sourceTransition'
    | 'sinkTransition'
    | 'enclosed'
    | 'forcing'
    | 'conditionalAction'
    | 'stepSignal';
  elementId?: Id;
  params: Record<string, string>;
}

export interface CodegenOptions {
  /** Application version written in the header. */
  version: string;
  /** Generation time written in the header (fixed in tests). */
  date: Date;
}

export interface CodegenResult {
  code: string;
  warnings: CodegenWarning[];
}

/** Words that cannot name a variable in Structured Text (common subset of IEC 61131-3 and vendors). */
export const ST_KEYWORDS = new Set(
  `ABS ACTION AND ANY ARRAY AT BOOL BY BYTE CASE CONFIGURATION CONSTANT DATE DINT DO DT DWORD ELSE
  ELSIF END_ACTION END_CASE END_CONFIGURATION END_FOR END_FUNCTION END_FUNCTION_BLOCK END_IF
  END_PROGRAM END_REPEAT END_RESOURCE END_STEP END_STRUCT END_TRANSITION END_TYPE END_VAR END_WHILE
  EXIT FALSE FOR FROM FUNCTION FUNCTION_BLOCK F_EDGE F_TRIG IF INITIAL_STEP INT INTERVAL LINT LREAL
  LWORD MOD NOT OF ON OR PRIORITY PROGRAM READ_ONLY READ_WRITE REAL REPEAT RESOURCE RETAIN RETURN
  R_EDGE R_TRIG SINT STEP STRING STRUCT TASK THEN TIME TO TOF TON TP TRANSITION TRUE TYPE UDINT UINT
  ULINT UNTIL USINT VAR VAR_ACCESS VAR_EXTERNAL VAR_GLOBAL VAR_INPUT VAR_IN_OUT VAR_OUTPUT VAR_TEMP
  WHILE WITH WORD XOR`
    .split(/\s+/)
    .filter(Boolean),
);

/** Allocates generated identifiers that clash with nothing already used (case-insensitive). */
export class NameTable {
  private used = new Set<string>();
  constructor(reserved: Iterable<string>) {
    for (const r of reserved) this.used.add(r.toUpperCase());
    for (const k of ST_KEYWORDS) this.used.add(k);
  }
  take(base: string): string {
    const clean = base.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(?=\d)/, '_') || '_';
    let name = clean;
    for (let i = 2; this.used.has(name.toUpperCase()); i++) name = `${clean}_${i}`;
    this.used.add(name.toUpperCase());
    return name;
  }
}

/** IEC 61131-3 duration literal, e.g. T#1m30s, T#250ms. */
export function timeLiteral(ms: number): string {
  if (ms <= 0) return 'T#0ms';
  const parts: string[] = [];
  let rest = Math.round(ms);
  for (const [unit, size] of [
    ['h', 3_600_000],
    ['m', 60_000],
    ['s', 1000],
  ] as const) {
    const n = Math.floor(rest / size);
    if (n) parts.push(`${n}${unit}`);
    rest -= n * size;
  }
  if (rest) parts.push(`${rest}ms`);
  return `T#${parts.join('')}`;
}

export function initialLiteral(v: Variable): string {
  switch (v.type) {
    case 'BOOL':
      return v.initialValue === true ? 'TRUE' : 'FALSE';
    case 'TIME':
      return timeLiteral(Number(v.initialValue ?? 0));
    case 'REAL': {
      const s = String(Number(v.initialValue ?? 0));
      return /[.eE]/.test(s) ? s : `${s}.0`;
    }
    default:
      return String(Math.trunc(Number(v.initialValue ?? 0)));
  }
}

/** Escapes text for an ST comment. */
export function comment(text: string): string {
  return text
    .replace(/\(\*/g, '( *')
    .replace(/\*\)/g, '* )')
    .replace(/[\r\n]+/g, ' ');
}

/** How references inside expressions are written by a given generator. */
export interface ExprTarget {
  /** Activity of a step (global step index of the compiled program). */
  step(index: number): string;
  /** A rising / falling edge of the condition whose ST text is `operand`. */
  edge(rising: boolean, operand: string, node: BoolNode, steps: Map<number, number>): string;
  /** `t1/operand[/t2]`. */
  timer(
    t1: number,
    t2: number | undefined,
    operand: string,
    node: BoolNode,
    steps: Map<number, number>,
  ): string;
  /** A variable as declared (null when undeclared). */
  variable(name: string): Variable | null;
  /** An undeclared name was used. */
  undeclared(name: string): void;
  /** A step number that does not resolve. */
  unknownStep(n: number): void;
}

const P_OR = 1;
const P_AND = 2;
const P_NOT = 3;

/** A boolean expression in Structured Text, parenthesized only where needed. */
export function stBool(n: BoolNode, steps: Map<number, number>, t: ExprTarget, outer = 0): string {
  const wrap = (s: string, p: number) => (p < outer ? `(${s})` : s);
  // Comparisons are always parenthesized inside a larger expression (NOT binds tighter in ST).
  const cmp = (s: string) => (outer ? `(${s})` : s);
  switch (n.type) {
    case 'const':
      return n.value ? 'TRUE' : 'FALSE';
    case 'var': {
      const v = t.variable(n.name);
      if (!v) {
        t.undeclared(n.name);
        return n.name;
      }
      return v.type === 'BOOL' ? v.name : cmp(`${v.name} <> 0`);
    }
    case 'step': {
      const idx = steps.get(n.number);
      if (idx === undefined) {
        t.unknownStep(n.number);
        return 'FALSE';
      }
      return t.step(idx);
    }
    case 'not':
      return wrap(`NOT ${stBool(n.operand, steps, t, P_NOT)}`, P_NOT);
    case 'and':
      return wrap(
        `${stBool(n.left, steps, t, P_AND)} AND ${stBool(n.right, steps, t, P_AND + 1)}`,
        P_AND,
      );
    case 'or':
      return wrap(
        `${stBool(n.left, steps, t, P_OR)} OR ${stBool(n.right, steps, t, P_OR + 1)}`,
        P_OR,
      );
    case 'edge':
      return t.edge(n.rising, stBool(n.operand, steps, t), n.operand, steps);
    case 'timer':
      return t.timer(n.t1, n.t2, stBool(n.operand, steps, t), n.operand, steps);
    case 'cmp': {
      // A BOOL compared with 0 / 1 reads as a boolean test.
      const boolSide = (a: ArithNode) =>
        a.type === 'avar' ? t.variable(a.name)?.type === 'BOOL' : false;
      const one = (a: ArithNode) => a.type === 'num' && (a.value === 0 || a.value === 1);
      if ((n.op === '=' || n.op === '<>') && boolSide(n.left) && one(n.right)) {
        const b = t.variable((n.left as { name: string }).name)!.name;
        const v = (n.right as { value: number }).value === 1;
        return cmp(`${b} = ${(n.op === '=') === v ? 'TRUE' : 'FALSE'}`);
      }
      return cmp(`${stArith(n.left, t)} ${n.op} ${stArith(n.right, t)}`);
    }
  }
}

const A_ADD = 1;
const A_MUL = 2;
const A_NEG = 3;

/** A numeric expression in Structured Text. */
export function stArith(n: ArithNode, t: ExprTarget, outer = 0, type?: VariableType): string {
  const wrap = (s: string, p: number) => (p < outer ? `(${s})` : s);
  switch (n.type) {
    case 'num':
      return type === 'REAL' && n.isInt ? `${n.value}.0` : String(n.value);
    case 'dur':
      return timeLiteral(n.ms);
    case 'avar': {
      const v = t.variable(n.name);
      if (!v) {
        t.undeclared(n.name);
        return n.name;
      }
      return v.type === 'BOOL' ? `BOOL_TO_INT(${v.name})` : v.name;
    }
    case 'neg':
      return wrap(`-${stArith(n.operand, t, A_NEG, type)}`, A_NEG);
    case 'arith': {
      const p = n.op === '+' || n.op === '-' ? A_ADD : A_MUL;
      const op = n.op === 'mod' ? 'MOD' : n.op;
      return wrap(`${stArith(n.left, t, p, type)} ${op} ${stArith(n.right, t, p + 1, type)}`, p);
    }
  }
}
