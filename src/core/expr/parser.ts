/**
 * Hand-written Pratt parser (no eval). Grammar:
 *
 *   or      := and (('+' | 'OR' | '||') and)*
 *   and     := unary (('·' | '*' | 'AND' | '&&') unary)*
 *   unary   := ('¬' | '/' | 'NOT' | '!') unary | ('↑' | 'RE' | '↓' | 'FE')? primary
 *   primary := '(' or ')' | DURATION '/' primary ('/' DURATION)? | arith CMP arith
 *            | IDENT | 'X'INT | TRUE | FALSE | 1 | 0
 *   arith   := term (('+' | '-') term)*      term := factor (('*' | '/' | MOD) factor)*
 *   factor  := '-' factor | NUMBER | DURATION | IDENT | '(' arith ')'
 *
 * `+`, `*` and `/` are boolean operators unless they are part of a comparison: a primary is first
 * read as arithmetic and kept only if a comparison operator follows (longest arithmetic operand).
 */
import type {
  ArithNode,
  Assignment,
  BoolNode,
  ExprError,
  ExprErrorCode,
  ForcingOrder,
  ParseResult,
} from './ast';
import { LexError, tokenize, type Token, type TokenKind } from './lexer';

export const STEP_REF_RE = /^X(\d+)$/i;

class Fail extends Error {
  constructor(readonly error: ExprError) {
    super(error.code);
  }
}

const OPERAND_START: TokenKind[] = [
  'ident',
  'number',
  'duration',
  'true',
  'false',
  'lparen',
  'not',
  'slash',
  'rise',
  'fall',
];

class Parser {
  pos = 0;
  nextId = 0;
  private readonly hasCmp: boolean;

  constructor(private readonly tokens: Token[]) {
    this.hasCmp = tokens.some((t) => t.kind === 'cmp');
  }

  peek(k = 0): Token {
    return this.tokens[Math.min(this.pos + k, this.tokens.length - 1)]!;
  }

  next(): Token {
    const t = this.peek();
    if (t.kind !== 'eof') this.pos++;
    return t;
  }

  fail(code: ExprErrorCode, tok: Token, hint?: string, params: Record<string, string> = {}): never {
    throw new Fail({
      code,
      start: tok.start,
      end: Math.max(tok.end, tok.start + 1),
      params: { token: tok.text, ...params },
      hint,
    });
  }

  // ---- boolean ----

  parseOr(): BoolNode {
    let left = this.parseAnd();
    while (this.peek().kind === 'plus' || this.peek().kind === 'or') {
      this.next();
      const right = this.parseAnd();
      left = { type: 'or', left, right, start: left.start, end: right.end };
    }
    return left;
  }

  parseAnd(): BoolNode {
    let left = this.parseUnary();
    for (;;) {
      const k = this.peek().kind;
      if (k !== 'star' && k !== 'dot' && k !== 'and') break;
      this.next();
      const right = this.parseUnary();
      left = { type: 'and', left, right, start: left.start, end: right.end };
    }
    return left;
  }

  parseUnary(): BoolNode {
    const t = this.peek();
    if (t.kind === 'not' || t.kind === 'slash') {
      this.next();
      const operand = this.parseUnary();
      return { type: 'not', operand, start: t.start, end: operand.end };
    }
    if (t.kind === 'rise' || t.kind === 'fall') {
      this.next();
      const operand = this.parsePrimary();
      return {
        type: 'edge',
        id: this.nextId++,
        rising: t.kind === 'rise',
        operand,
        start: t.start,
        end: operand.end,
      };
    }
    return this.parsePrimary();
  }

  private tryComparison(): BoolNode | null {
    const t = this.peek();
    if (!this.hasCmp) return null;
    if (!['number', 'duration', 'ident', 'minus', 'lparen'].includes(t.kind)) return null;
    if (t.kind === 'duration' && this.peek(1).kind === 'slash') return null;
    const save = this.pos;
    try {
      const left = this.parseArith();
      const op = this.peek();
      if (op.kind === 'cmp') {
        this.next();
        const right = this.parseArith();
        return { type: 'cmp', op: op.cmp!, left, right, start: left.start, end: right.end };
      }
    } catch (e) {
      if (!(e instanceof Fail)) throw e;
    }
    this.pos = save;
    return null;
  }

  parsePrimary(): BoolNode {
    const cmp = this.tryComparison();
    if (cmp) return cmp;
    const t = this.peek();
    switch (t.kind) {
      case 'duration':
        return this.parseTimer();
      case 'lparen': {
        this.next();
        const inner = this.parseOr();
        if (this.peek().kind !== 'rparen')
          this.fail('missingParen', this.peek(), 'closeParen', { col: String(t.start + 1) });
        const r = this.next();
        return { ...inner, start: t.start, end: r.end };
      }
      case 'ident': {
        this.next();
        const m = STEP_REF_RE.exec(t.text);
        if (m) return { type: 'step', number: Number(m[1]), start: t.start, end: t.end };
        return { type: 'var', name: t.text, start: t.start, end: t.end };
      }
      case 'true':
      case 'false':
        this.next();
        return { type: 'const', value: t.kind === 'true', start: t.start, end: t.end };
      case 'number':
        if (t.isInt && (t.value === 0 || t.value === 1)) {
          this.next();
          return { type: 'const', value: t.value === 1, start: t.start, end: t.end };
        }
        return this.fail('numberAsCondition', t, 'compareNumber');
      case 'eof':
        return this.fail('unexpectedEnd', t, 'operandExpected');
      case 'cmp':
        return this.fail('unexpectedToken', t, 'cmpNeedsNumbers');
      default:
        return this.fail('unexpectedToken', t, 'operandExpected');
    }
  }

  parseTimer(): BoolNode {
    const d = this.next();
    if (this.peek().kind !== 'slash') this.fail('timerOperand', this.peek(), 'timerSyntax');
    this.next();
    const operand = this.parsePrimary();
    let t2: number | undefined;
    let end = operand.end;
    if (this.peek().kind === 'slash' && this.peek(1).kind === 'duration') {
      this.next();
      const d2 = this.next();
      t2 = d2.value!;
      end = d2.end;
    }
    return {
      type: 'timer',
      id: this.nextId++,
      t1: d.value!,
      ...(t2 !== undefined ? { t2 } : {}),
      operand,
      start: d.start,
      end,
    };
  }

  // ---- arithmetic ----

  parseArith(): ArithNode {
    let left = this.parseTerm();
    while (this.peek().kind === 'plus' || this.peek().kind === 'minus') {
      const op = this.next();
      const right = this.parseTerm();
      left = {
        type: 'arith',
        op: op.kind === 'plus' ? '+' : '-',
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }
    return left;
  }

  parseTerm(): ArithNode {
    let left = this.parseFactor();
    for (;;) {
      const k = this.peek().kind;
      if (k !== 'star' && k !== 'slash' && k !== 'mod') break;
      this.next();
      const right = this.parseFactor();
      left = {
        type: 'arith',
        op: k === 'star' ? '*' : k === 'slash' ? '/' : 'mod',
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }
    return left;
  }

  parseFactor(): ArithNode {
    const t = this.peek();
    switch (t.kind) {
      case 'minus': {
        this.next();
        const operand = this.parseFactor();
        return { type: 'neg', operand, start: t.start, end: operand.end };
      }
      case 'number':
        this.next();
        return { type: 'num', value: t.value!, isInt: !!t.isInt, start: t.start, end: t.end };
      case 'duration':
        this.next();
        return { type: 'dur', ms: t.value!, start: t.start, end: t.end };
      case 'ident':
        this.next();
        return { type: 'avar', name: t.text, start: t.start, end: t.end };
      case 'true':
      case 'false':
        this.next();
        return {
          type: 'num',
          value: t.kind === 'true' ? 1 : 0,
          isInt: true,
          start: t.start,
          end: t.end,
        };
      case 'lparen': {
        this.next();
        const inner = this.parseArith();
        if (this.peek().kind !== 'rparen')
          this.fail('missingParen', this.peek(), 'closeParen', { col: String(t.start + 1) });
        const r = this.next();
        return { ...inner, start: t.start, end: r.end };
      }
      case 'eof':
        return this.fail('unexpectedEnd', t, 'operandExpected');
      default:
        return this.fail('unexpectedToken', t, 'operandExpected');
    }
  }

  /** Reports leftovers after a complete expression with the most useful hint. */
  expectEnd(): void {
    const t = this.peek();
    if (t.kind === 'eof') return;
    if (t.kind === 'rparen') this.fail('unexpectedToken', t, 'unmatchedParen');
    if (t.kind === 'slash') this.fail('unexpectedToken', t, 'slashIsNot');
    if (t.kind === 'assign') this.fail('unexpectedToken', t, 'assignInCondition');
    if (OPERAND_START.includes(t.kind)) this.fail('unexpectedToken', t, 'missingOperator');
    this.fail('unexpectedToken', t);
  }
}

function lex(source: string): Token[] | ExprError {
  try {
    return tokenize(source);
  } catch (e) {
    if (e instanceof LexError) {
      return {
        code: e.code,
        start: e.start,
        end: e.end,
        params: e.params,
        hint: e.code === 'invalidNumber' ? 'durationUnits' : undefined,
      };
    }
    throw e;
  }
}

function run<T>(fn: () => T): ParseResult<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.error };
    throw e;
  }
}

/** Parses a boolean expression (receptivity, assignment condition, event). */
export function parseBool(source: string): ParseResult<BoolNode> {
  const tokens = lex(source);
  if (!Array.isArray(tokens)) return { ok: false, error: tokens };
  if (tokens.length === 1)
    return { ok: false, error: { code: 'empty', start: 0, end: 0, params: {}, hint: 'useOne' } };
  const p = new Parser(tokens);
  return run(() => {
    const e = p.parseOr();
    p.expectEnd();
    return e;
  });
}

/** Parses an arithmetic expression on its own (used by tests and the variable table). */
export function parseArith(source: string): ParseResult<ArithNode> {
  const tokens = lex(source);
  if (!Array.isArray(tokens)) return { ok: false, error: tokens };
  const p = new Parser(tokens);
  return run(() => {
    const e = p.parseArith();
    p.expectEnd();
    return e;
  });
}

/** Parses a stored action body: `target := value`. */
export function parseAssignment(source: string): ParseResult<Assignment> {
  const tokens = lex(source);
  if (!Array.isArray(tokens)) return { ok: false, error: tokens };
  const first = tokens[0]!;
  if (first.kind === 'eof')
    return {
      ok: false,
      error: { code: 'empty', start: 0, end: 0, params: {}, hint: 'assignmentSyntax' },
    };
  if (first.kind !== 'ident') {
    return {
      ok: false,
      error: {
        code: 'assignmentExpected',
        start: first.start,
        end: first.end,
        params: { token: first.text },
        hint: 'assignmentSyntax',
      },
    };
  }
  const op = tokens[1]!;
  if (op.kind !== 'assign') {
    const hint = op.kind === 'cmp' && op.cmp === '=' ? 'useAssign' : 'assignmentSyntax';
    return {
      ok: false,
      error: {
        code: 'assignmentExpected',
        start: op.start,
        end: Math.max(op.end, op.start + 1),
        params: { token: op.text },
        hint,
      },
    };
  }
  const rest = tokens.slice(2);
  const valueStart = rest[0]!.start;
  if (rest.length === 1) {
    return {
      ok: false,
      error: {
        code: 'unexpectedEnd',
        start: valueStart,
        end: valueStart + 1,
        params: {},
        hint: 'operandExpected',
      },
    };
  }
  const boolP = new Parser(rest);
  const bool = run(() => {
    const e = boolP.parseOr();
    boolP.expectEnd();
    return e;
  });
  const arithP = new Parser(rest);
  const arith = run(() => {
    const e = arithP.parseArith();
    arithP.expectEnd();
    return e;
  });
  return {
    ok: true,
    value: {
      target: first.text,
      targetSpan: { start: first.start, end: first.end },
      valueSpan: { start: valueStart, end: source.length },
      bool: bool.ok ? bool.value : null,
      arith: arith.ok ? arith.value : null,
      boolError: bool.ok ? null : bool.error,
      arithError: arith.ok ? null : arith.error,
    },
  };
}

/** Parses a continuous action: the name of the boolean variable it sets. */
export function parseOutputName(
  source: string,
): ParseResult<{ name: string; start: number; end: number }> {
  const tokens = lex(source);
  if (!Array.isArray(tokens)) return { ok: false, error: tokens };
  const t = tokens[0]!;
  if (t.kind === 'eof')
    return {
      ok: false,
      error: { code: 'empty', start: 0, end: 0, params: {}, hint: 'outputName' },
    };
  if (t.kind !== 'ident' || STEP_REF_RE.test(t.text)) {
    return {
      ok: false,
      error: {
        code: 'identifierExpected',
        start: t.start,
        end: t.end,
        params: { token: t.text },
        hint: 'outputName',
      },
    };
  }
  const extra = tokens[1]!;
  if (extra.kind !== 'eof') {
    const hint = extra.kind === 'assign' ? 'continuousNoAssign' : 'outputName';
    return {
      ok: false,
      error: {
        code: 'unexpectedToken',
        start: extra.start,
        end: extra.end,
        params: { token: extra.text },
        hint,
      },
    };
  }
  return { ok: true, value: { name: t.text, start: t.start, end: t.end } };
}

/** Parses a forcing order: `G2{8}`, `G2{8, 9}`, `G2{*}`, `G2{}`, `G2{INIT}`. */
export function parseForcing(source: string): ParseResult<ForcingOrder> {
  const tokens = lex(source);
  if (!Array.isArray(tokens)) return { ok: false, error: tokens };
  const err = (t: Token): ParseResult<ForcingOrder> => ({
    ok: false,
    error: {
      code: t.kind === 'eof' && t.start === 0 ? 'empty' : 'forcingSyntax',
      start: t.start,
      end: Math.max(t.end, t.start + 1),
      params: { token: t.text },
      hint: 'forcingSyntax',
    },
  });
  let i = 0;
  const g = tokens[i++]!;
  if (g.kind !== 'ident') return err(g);
  if (tokens[i]!.kind !== 'lbrace') return err(tokens[i]!);
  i++;
  const order: ForcingOrder = {
    grafcet: g.text,
    grafcetSpan: { start: g.start, end: g.end },
    mode: 'steps',
    steps: [],
  };
  const t = tokens[i]!;
  if (t.kind === 'star') {
    order.mode = 'freeze';
    i++;
  } else if (t.kind === 'ident' && t.text.toUpperCase() === 'INIT') {
    order.mode = 'init';
    i++;
  } else if (t.kind === 'number' || (t.kind === 'ident' && STEP_REF_RE.test(t.text))) {
    for (;;) {
      const n = tokens[i]!;
      const m = n.kind === 'ident' ? STEP_REF_RE.exec(n.text) : null;
      if (n.kind === 'number' && n.isInt)
        order.steps.push({ number: n.value!, start: n.start, end: n.end });
      else if (m) order.steps.push({ number: Number(m[1]), start: n.start, end: n.end });
      else return err(n);
      i++;
      if (tokens[i]!.kind !== 'comma') break;
      i++;
    }
  }
  if (tokens[i]!.kind !== 'rbrace') return err(tokens[i]!);
  i++;
  if (tokens[i]!.kind !== 'eof') return err(tokens[i]!);
  return { ok: true, value: order };
}
