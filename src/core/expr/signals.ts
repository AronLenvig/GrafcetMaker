/**
 * The signals of a condition (variables, step activities, comparisons) and their values, shared by
 * the simulator and the diagram, which shows the true ones while simulating.
 */
import type { ArithNode, BoolNode } from './ast';
import type { CmpOp } from './lexer';

export type Signal = Extract<BoolNode, { type: 'var' | 'step' | 'cmp' }>;

/** A variable's current value by lower-case name (undeclared: undefined, read as 0 / false). */
export type ReadValue = (name: string) => boolean | number | undefined;

const SIGNALS = new WeakMap<BoolNode, Signal[]>();

function collect(n: BoolNode, out: Signal[]): void {
  switch (n.type) {
    case 'var':
    case 'step':
    case 'cmp':
      out.push(n);
      return;
    case 'not':
    case 'edge':
    case 'timer':
      collect(n.operand, out);
      return;
    case 'and':
    case 'or':
      collect(n.left, out);
      collect(n.right, out);
      return;
    case 'const':
      return;
  }
}

/** The signals of a condition in reading order (as typed and as textbook notation shows them). */
export function signalsOf(n: BoolNode): readonly Signal[] {
  let out = SIGNALS.get(n);
  if (!out) {
    out = [];
    collect(n, out);
    SIGNALS.set(n, out);
  }
  return out;
}

/** Value of arithmetic; BOOL reads as 0/1, division by zero gives 0. TIME is in milliseconds. */
export function arithValue(n: ArithNode, read: ReadValue): number {
  switch (n.type) {
    case 'num':
      return n.value;
    case 'dur':
      return n.ms;
    case 'avar': {
      const v = read(n.name.toLowerCase());
      return typeof v === 'boolean' ? (v ? 1 : 0) : (v ?? 0);
    }
    case 'neg':
      return -arithValue(n.operand, read);
    case 'arith': {
      const a = arithValue(n.left, read);
      const b = arithValue(n.right, read);
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

export function compare(op: CmpOp, a: number, b: number): boolean {
  switch (op) {
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
}

export type TimerNode = Extract<BoolNode, { type: 'timer' }>;

/**
 * A condition's value from the state alone, without edge and timer memory: an edge is false (it
 * lasts one evaluation, when its signal changes), a timer is as `timer` says.
 */
export function stateValue(
  n: BoolNode,
  read: ReadValue,
  stepActive: (n: number) => boolean,
  timer: (n: TimerNode) => boolean,
): boolean {
  switch (n.type) {
    case 'const':
      return n.value;
    case 'var':
    case 'step':
    case 'cmp':
      return signalValue(n, read, stepActive);
    case 'not':
      return !stateValue(n.operand, read, stepActive, timer);
    case 'and':
      return (
        stateValue(n.left, read, stepActive, timer) && stateValue(n.right, read, stepActive, timer)
      );
    case 'or':
      return (
        stateValue(n.left, read, stepActive, timer) || stateValue(n.right, read, stepActive, timer)
      );
    case 'edge':
      return false;
    case 'timer':
      return timer(n);
  }
}

/**
 * What a receptivity still waits for: its terms that are false. A receptivity written as an OR
 * waits for any one of its terms (`any`), otherwise for every false term of its AND.
 */
export function waitingTerms(
  n: BoolNode,
  value: (term: BoolNode) => boolean,
): { any: boolean; terms: BoolNode[] } {
  const flat = (x: BoolNode, type: 'and' | 'or'): BoolNode[] =>
    x.type === type ? [...flat(x.left, type), ...flat(x.right, type)] : [x];
  const any = n.type === 'or';
  return { any, terms: flat(n, any ? 'or' : 'and').filter((t) => !value(t)) };
}

/** Whether a signal is true: a variable is on, a step is active, a comparison holds. */
export function signalValue(
  s: Signal,
  read: ReadValue,
  stepActive: (n: number) => boolean,
): boolean {
  switch (s.type) {
    case 'var': {
      const v = read(s.name.toLowerCase());
      return typeof v === 'number' ? v !== 0 : !!v;
    }
    case 'step':
      return stepActive(s.number);
    case 'cmp':
      return compare(s.op, arithValue(s.left, read), arithValue(s.right, read));
  }
}
