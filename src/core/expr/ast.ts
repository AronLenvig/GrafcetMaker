import type { CmpOp } from './lexer';

interface Span {
  /** Source offsets, for error carets and highlighting. */
  start: number;
  end: number;
}

/** Boolean expression (receptivity, condition). */
export type BoolNode =
  | (Span & { type: 'const'; value: boolean })
  | (Span & { type: 'var'; name: string })
  | (Span & { type: 'step'; number: number })
  | (Span & { type: 'not'; operand: BoolNode })
  | (Span & { type: 'and' | 'or'; left: BoolNode; right: BoolNode })
  /** Stateful nodes carry `id`, unique within one expression (edge memory, timer state). */
  | (Span & { type: 'edge'; id: number; rising: boolean; operand: BoolNode })
  | (Span & { type: 'timer'; id: number; t1: number; t2?: number; operand: BoolNode })
  | (Span & { type: 'cmp'; op: CmpOp; left: ArithNode; right: ArithNode });

/** Numeric expression (comparisons, assignments). TIME values are milliseconds. */
export type ArithNode =
  | (Span & { type: 'num'; value: number; isInt: boolean })
  | (Span & { type: 'dur'; ms: number })
  | (Span & { type: 'avar'; name: string })
  | (Span & { type: 'neg'; operand: ArithNode })
  | (Span & {
      type: 'arith';
      op: '+' | '-' | '*' | '/' | 'mod';
      left: ArithNode;
      right: ArithNode;
    });

/** Stored action body `target := value`. Both readings of the value are kept; the target type picks one. */
export interface Assignment {
  target: string;
  targetSpan: Span;
  valueSpan: Span;
  bool: BoolNode | null;
  arith: ArithNode | null;
  /** Parse error of the reading that failed (reported if the target type needs it). */
  boolError: ExprError | null;
  arithError: ExprError | null;
  /** Written as the variable alone (`M1`), short for `M1 := TRUE`. */
  shorthand?: true;
}

/** Forcing order `G2{8,9}`, `G2{*}` (freeze), `G2{}` (empty), `G2{INIT}` (initial situation). */
export interface ForcingOrder {
  grafcet: string;
  grafcetSpan: Span;
  mode: 'steps' | 'freeze' | 'init';
  steps: { number: number; start: number; end: number }[];
}

export type ExprErrorCode =
  | 'empty'
  | 'unexpectedChar'
  | 'invalidNumber'
  | 'unexpectedToken'
  | 'unexpectedEnd'
  | 'missingParen'
  | 'numberAsCondition'
  | 'timerOperand'
  | 'assignmentExpected'
  | 'identifierExpected'
  | 'forcingSyntax'
  | 'tooDeep';

export interface ExprError {
  code: ExprErrorCode;
  start: number;
  end: number;
  params: Record<string, string>;
  /** Hint code (translated by the UI) suggesting a fix. */
  hint?: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: ExprError };
