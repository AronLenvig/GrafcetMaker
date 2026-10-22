/**
 * Small, exact boolean reasoning over receptivities, by enumeration of truth assignments.
 * Atoms: boolean variables, step activities, edges, timers and comparisons. Consistency rules
 * between atoms: ↑e ⇒ e, ↓e ⇒ ¬e, t/e (without t2) ⇒ e, and comparisons of one variable with
 * constants must admit a common value. Above MAX_ATOMS the answer is "unknown".
 */
import type { ArithNode, BoolNode } from '../expr/ast';

export const MAX_ATOMS = 14;

type Cmp = { variable: string; op: '=' | '<>' | '<' | '<=' | '>' | '>='; value: number };

/** Whether a (lower-cased) variable only takes integer values (INT, TIME in ms). */
export type IntegerLookup = (variable: string) => boolean;

interface AtomInfo {
  key: string;
  /** Implied value of another atom when this one is true. */
  implies?: { key: string; value: boolean };
  cmp?: Cmp;
}

function arithKey(n: ArithNode): string {
  switch (n.type) {
    case 'num':
      return String(n.value);
    case 'dur':
      return `${n.ms}ms`;
    case 'avar':
      return n.name.toLowerCase();
    case 'neg':
      return `-(${arithKey(n.operand)})`;
    case 'arith':
      return `(${arithKey(n.left)}${n.op}${arithKey(n.right)})`;
  }
}

/** Canonical text of a sub-expression, used to identify identical atoms. */
export function exprKey(n: BoolNode): string {
  switch (n.type) {
    case 'const':
      return n.value ? '1' : '0';
    case 'var':
      return `v:${n.name.toLowerCase()}`;
    case 'step':
      return `x:${n.number}`;
    case 'not':
      return `!(${exprKey(n.operand)})`;
    case 'and':
    case 'or':
      return `(${exprKey(n.left)}${n.type === 'and' ? '&' : '|'}${exprKey(n.right)})`;
    case 'edge':
      return `${n.rising ? 'RE' : 'FE'}(${exprKey(n.operand)})`;
    case 'timer':
      return `T${n.t1}/${exprKey(n.operand)}${n.t2 !== undefined ? `/${n.t2}` : ''}`;
    case 'cmp':
      return `${arithKey(n.left)}${n.op}${arithKey(n.right)}`;
  }
}

const FLIP: Record<Cmp['op'], Cmp['op']> = {
  '=': '=',
  '<>': '<>',
  '<': '>',
  '<=': '>=',
  '>': '<',
  '>=': '<=',
};

function constant(n: ArithNode): number | null {
  if (n.type === 'num') return n.value;
  if (n.type === 'dur') return n.ms;
  if (n.type === 'neg') {
    const v = constant(n.operand);
    return v === null ? null : -v;
  }
  return null;
}

function cmpInfo(n: Extract<BoolNode, { type: 'cmp' }>): Cmp | undefined {
  const lc = constant(n.left);
  const rc = constant(n.right);
  if (n.left.type === 'avar' && rc !== null) {
    return { variable: n.left.name.toLowerCase(), op: n.op, value: rc };
  }
  if (n.right.type === 'avar' && lc !== null) {
    return { variable: n.right.name.toLowerCase(), op: FLIP[n.op], value: lc };
  }
  return undefined;
}

function collect(n: BoolNode, atoms: Map<string, AtomInfo>): void {
  switch (n.type) {
    case 'const':
      return;
    case 'not':
      collect(n.operand, atoms);
      return;
    case 'and':
    case 'or':
      collect(n.left, atoms);
      collect(n.right, atoms);
      return;
    case 'var':
    case 'step':
      atoms.set(exprKey(n), { key: exprKey(n) });
      return;
    case 'edge':
    case 'timer': {
      const key = exprKey(n);
      const operandIsAtom = n.operand.type === 'var' || n.operand.type === 'step';
      const implies =
        operandIsAtom && (n.type === 'edge' || n.t2 === undefined)
          ? { key: exprKey(n.operand), value: n.type === 'edge' ? n.rising : true }
          : undefined;
      atoms.set(key, { key, implies });
      if (implies) atoms.set(implies.key, atoms.get(implies.key) ?? { key: implies.key });
      return;
    }
    case 'cmp': {
      const key = exprKey(n);
      atoms.set(key, { key, cmp: cmpInfo(n) });
      return;
    }
  }
}

function evaluate(n: BoolNode, v: Map<string, boolean>): boolean {
  switch (n.type) {
    case 'const':
      return n.value;
    case 'not':
      return !evaluate(n.operand, v);
    case 'and':
      return evaluate(n.left, v) && evaluate(n.right, v);
    case 'or':
      return evaluate(n.left, v) || evaluate(n.right, v);
    default:
      return v.get(exprKey(n)) ?? false;
  }
}

function holds(c: Cmp, x: number): boolean {
  switch (c.op) {
    case '=':
      return x === c.value;
    case '<>':
      return x !== c.value;
    case '<':
      return x < c.value;
    case '<=':
      return x <= c.value;
    case '>':
      return x > c.value;
    case '>=':
      return x >= c.value;
  }
}

/** Is there a value satisfying every (constraint, expected truth) pair on one variable? */
function feasible(constraints: { c: Cmp; truth: boolean }[], integer: boolean): boolean {
  const step = integer ? 1 : 1e-6;
  const candidates = new Set<number>([0]);
  for (const { c } of constraints) for (const d of [-step, 0, step]) candidates.add(c.value + d);
  const values = [...candidates].sort((a, b) => a - b);
  for (let i = 0; i + 1 < values.length; i++) candidates.add((values[i]! + values[i + 1]!) / 2);
  candidates.add(values[0]! - 1);
  candidates.add(values[values.length - 1]! + 1);
  for (const x of candidates) {
    if (integer && !Number.isInteger(x)) continue;
    if (constraints.every(({ c, truth }) => holds(c, x) === truth)) return true;
  }
  return false;
}

function consistent(atoms: AtomInfo[], v: Map<string, boolean>, isInteger: IntegerLookup): boolean {
  const byVariable = new Map<string, { c: Cmp; truth: boolean }[]>();
  for (const a of atoms) {
    const truth = v.get(a.key)!;
    if (truth && a.implies && v.get(a.implies.key) !== a.implies.value) return false;
    if (a.cmp) {
      const list = byVariable.get(a.cmp.variable) ?? [];
      list.push({ c: a.cmp, truth });
      byVariable.set(a.cmp.variable, list);
    }
  }
  for (const [name, list] of byVariable) {
    if (list.length > 1 && !feasible(list, isInteger(name))) return false;
  }
  return true;
}

/** Can all formulas be true at once? 'unknown' when there are too many atoms to enumerate. */
export function satisfiable(
  formulas: BoolNode[],
  isInteger: IntegerLookup = () => false,
): boolean | 'unknown' {
  const map = new Map<string, AtomInfo>();
  for (const f of formulas) collect(f, map);
  const atoms = [...map.values()];
  if (atoms.length > MAX_ATOMS) return 'unknown';
  const v = new Map<string, boolean>();
  const total = 1 << atoms.length;
  for (let mask = 0; mask < total; mask++) {
    atoms.forEach((a, i) => v.set(a.key, (mask & (1 << i)) !== 0));
    if (!consistent(atoms, v, isInteger)) continue;
    if (formulas.every((f) => evaluate(f, v))) return true;
  }
  return false;
}

/** True when the two conditions can never be true together (proven). */
export function exclusive(a: BoolNode, b: BoolNode, isInteger?: IntegerLookup): boolean {
  return satisfiable([a, b], isInteger) === false;
}

export function hasEdgeOrTimer(n: BoolNode): boolean {
  switch (n.type) {
    case 'edge':
    case 'timer':
      return true;
    case 'not':
      return hasEdgeOrTimer(n.operand);
    case 'and':
    case 'or':
      return hasEdgeOrTimer(n.left) || hasEdgeOrTimer(n.right);
    default:
      return false;
  }
}
