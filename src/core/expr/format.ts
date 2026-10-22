/**
 * Textbook rendering of expressions: AND as ·, OR as +, NOT as an overbar (nested NOTs stack
 * bars), edges as ↑ / ↓. Output is a list of runs so renderers can draw the bars themselves.
 */
import type { ArithNode, BoolNode } from './ast';
import { tokenize } from './lexer';

export interface Run {
  text: string;
  /** Number of overbars drawn above this run. */
  bars: number;
}

const CMP_SYMBOL: Record<string, string> = {
  '=': '=',
  '<>': '≠',
  '<': '<',
  '<=': '≤',
  '>': '>',
  '>=': '≥',
};
/** Comparison operators restricted to Latin-1 (PDF standard fonts). */
const CMP_ASCII: Record<string, string> = {
  '=': '=',
  '<>': '<>',
  '<': '<',
  '<=': '<=',
  '>': '>',
  '>=': '>=',
};
const ARITH_PREC = { '+': 1, '-': 1, '*': 2, '/': 2, mod: 2 } as const;

export function formatDuration(ms: number): string {
  if (ms !== 0 && ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  if (ms !== 0 && ms % 60_000 === 0) return `${ms / 60_000}min`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}

function arithText(n: ArithNode, parentPrec = 0): string {
  switch (n.type) {
    case 'num':
      return String(n.value);
    case 'dur':
      return formatDuration(n.ms);
    case 'avar':
      return n.name;
    case 'neg':
      return `-${arithText(n.operand, 3)}`;
    case 'arith': {
      const p = ARITH_PREC[n.op];
      const sym = n.op === '*' ? '×' : n.op === 'mod' ? ' MOD ' : n.op === '/' ? '/' : ` ${n.op} `;
      // Right operand of - and / needs parentheses at equal precedence.
      const s = `${arithText(n.left, p)}${sym}${arithText(n.right, p + (n.op === '-' || n.op === '/' || n.op === 'mod' ? 1 : 0))}`;
      return p < parentPrec ? `(${s})` : s;
    }
  }
}

/** Operands that need no parentheses after ↑, ↓ or t/ (a comparison adds its own). */
function isPrimary(n: BoolNode): boolean {
  return (
    n.type === 'const' ||
    n.type === 'var' ||
    n.type === 'step' ||
    n.type === 'not' ||
    n.type === 'cmp'
  );
}

function runs(n: BoolNode, bars: number, parentPrec: number, out: Run[], cmp = CMP_SYMBOL): void {
  const push = (text: string) => out.push({ text, bars });
  switch (n.type) {
    case 'const':
      push(n.value ? '1' : '0');
      return;
    case 'var':
      push(n.name);
      return;
    case 'step':
      push(`X${n.number}`);
      return;
    case 'not':
      // The bar itself groups its operand: no parentheses needed underneath.
      runs(n.operand, bars + 1, 0, out, cmp);
      return;
    case 'or':
    case 'and': {
      const p = n.type === 'or' ? 1 : 2;
      const paren = p < parentPrec;
      if (paren) push('(');
      runs(n.left, bars, p, out, cmp);
      push(n.type === 'or' ? ' + ' : '·');
      runs(n.right, bars, p, out, cmp);
      if (paren) push(')');
      return;
    }
    case 'edge':
      push(n.rising ? '↑' : '↓');
      if (!isPrimary(n.operand)) push('(');
      runs(n.operand, bars, 3, out, cmp);
      if (!isPrimary(n.operand)) push(')');
      return;
    case 'timer':
      push(`${formatDuration(n.t1)}/`);
      if (!isPrimary(n.operand)) push('(');
      runs(n.operand, bars, 3, out, cmp);
      if (!isPrimary(n.operand)) push(')');
      if (n.t2 !== undefined) push(`/${formatDuration(n.t2)}`);
      return;
    case 'cmp': {
      // Parenthesized unless it is the whole expression: comparisons read greedily.
      const paren = parentPrec > 0;
      push(
        `${paren ? '(' : ''}${arithText(n.left)} ${cmp[n.op]} ${arithText(n.right)}${paren ? ')' : ''}`,
      );
      return;
    }
  }
}

/** Textbook runs for a boolean expression; adjacent runs with the same bar count are merged. */
export function formatTextbook(n: BoolNode, opts: { asciiComparisons?: boolean } = {}): Run[] {
  const raw: Run[] = [];
  runs(n, 0, 0, raw, opts.asciiComparisons ? CMP_ASCII : CMP_SYMBOL);
  const merged: Run[] = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && last.bars === r.bars) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged;
}

/** Plain-text form of textbook runs (bars shown as ¬(…)), for tooltips and screen readers. */
export function runsToPlainText(runs: Run[]): string {
  let out = '';
  let level = 0;
  for (const r of runs) {
    if (r.bars > level) out += '¬('.repeat(r.bars - level);
    if (r.bars < level) out += ')'.repeat(level - r.bars);
    level = r.bars;
    out += r.text;
  }
  return out + ')'.repeat(level);
}

/**
 * Renames a variable in expression source, touching only identifier tokens (case-insensitive),
 * so formatting, comments-free spacing and other names are preserved.
 */
export function renameIdentifier(source: string, oldName: string, newName: string): string {
  let tokens;
  try {
    tokens = tokenize(source);
  } catch {
    return source;
  }
  const lower = oldName.toLowerCase();
  let out = source;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    if (t.kind === 'ident' && t.text.toLowerCase() === lower)
      out = out.slice(0, t.start) + newName + out.slice(t.end);
  }
  return out;
}
