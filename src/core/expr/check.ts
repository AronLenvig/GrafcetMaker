/**
 * Name resolution and type checking of expressions against a project. Produces diagnostics with
 * source positions and fix hints; never throws.
 */
import type { Grafcet, Id, Project, Variable, VariableType } from '../model/types';
import type { ArithNode, BoolNode, ExprError, ForcingOrder } from './ast';
import { cachedAssignment, cachedBool, cachedForcing, cachedOutput } from './cache';
import { STEP_REF_RE } from './parser';

export type DiagnosticCode =
  | ExprError['code']
  | 'unknownIdentifier'
  | 'notBoolean'
  | 'notNumeric'
  | 'boolInArithmetic'
  | 'stepInArithmetic'
  | 'unknownStep'
  | 'ambiguousStep'
  | 'writesInput'
  | 'unknownGrafcet'
  | 'unknownForcedStep'
  | 'forcesItself';

export interface Diagnostic {
  code: DiagnosticCode;
  start: number;
  end: number;
  params: Record<string, string>;
  hint?: string;
  /** For unknownIdentifier: the variable that "Create variable" should add. */
  create?: { name: string; type: VariableType; direction: Variable['direction'] };
}

export type StepResolution = { grafcetId: Id; stepId: Id } | 'missing' | 'ambiguous';

/** What expressions of one grafcet can refer to. */
export interface ExprEnv {
  variables: Map<string, Variable>;
  grafcetId: Id | null;
  resolveStep: (number: number) => StepResolution;
  grafcetByName: Map<string, Grafcet>;
}

export interface Analysis {
  diagnostics: Diagnostic[];
  /** Lower-cased names of the variables referenced (read or written). */
  references: Set<string>;
  /** Lower-cased name of the variable written (continuous / stored actions). */
  writes?: string;
}

/** Variables by lower-cased name (identifiers are case-insensitive). */
export type ProjectNames = Pick<Project, 'variables' | 'grafcets'>;

export function variableIndex(project: Pick<Project, 'variables'>): Map<string, Variable> {
  const m = new Map<string, Variable>();
  for (const v of Object.values(project.variables)) m.set(v.name.toLowerCase(), v);
  return m;
}

/**
 * Builds the environment for expressions of `grafcetId`. `Xn` resolves to step n of the same
 * grafcet; if it has none, to the unique step numbered n in another grafcet.
 */
export function buildEnv(
  project: ProjectNames,
  grafcetId: Id | null,
  variables = variableIndex(project),
): ExprEnv {
  return envFactory(project, variables)(grafcetId);
}

/**
 * Environments for the expressions of several grafcets of one project: the project-wide indexes
 * (steps by number, grafcets by name, variables) are built once and shared by every grafcet.
 */
export function envFactory(
  project: ProjectNames,
  variables = variableIndex(project),
): (grafcetId: Id | null) => ExprEnv {
  const byNumber = new Map<number, { grafcetId: Id; stepId: Id }[]>();
  for (const g of Object.values(project.grafcets)) {
    for (const s of Object.values(g.steps)) {
      const list = byNumber.get(s.number);
      const entry = { grafcetId: g.id, stepId: s.id };
      if (list) list.push(entry);
      else byNumber.set(s.number, [entry]);
    }
  }
  const grafcetByName = new Map<string, Grafcet>();
  for (const g of Object.values(project.grafcets)) grafcetByName.set(g.name.toLowerCase(), g);
  return (grafcetId) => ({
    variables,
    grafcetId,
    grafcetByName,
    resolveStep: (n) => {
      const all = byNumber.get(n) ?? [];
      const local = all.filter((e) => e.grafcetId === grafcetId);
      if (local.length >= 1) return local[0]!;
      if (all.length === 1) return all[0]!;
      return all.length === 0 ? 'missing' : 'ambiguous';
    },
  });
}

/** Edit distance counting an adjacent transposition as one edit (optimal string alignment). */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[] = Array.from({ length: rows * cols }, (_, k) =>
    k < cols ? k : k % cols === 0 ? k / cols : 0,
  );
  const at = (i: number, j: number) => d[i * cols + j]!;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, at(i - 2, j - 2) + 1);
      d[i * cols + j] = v;
    }
  }
  return at(a.length, b.length);
}

/** Closest declared name, for "did you mean". */
export function suggestName(name: string, candidates: Iterable<string>): string | undefined {
  const lower = name.toLowerCase();
  let best: { name: string; d: number } | undefined;
  for (const c of candidates) {
    const d = editDistance(lower, c.toLowerCase());
    if (d <= Math.max(1, Math.floor(lower.length / 3)) && (!best || d < best.d))
      best = { name: c, d };
  }
  return best?.name;
}

function fromParseError(e: ExprError): Diagnostic {
  return { code: e.code, start: e.start, end: e.end, params: e.params, hint: e.hint };
}

class Checker {
  readonly diagnostics: Diagnostic[] = [];
  readonly references = new Set<string>();

  /**
   * `readDirection`: what an undeclared name read in arithmetic is guessed to be: an input in a
   * condition (`level > 80` reads a sensor), internal in an assignment's value.
   */
  constructor(
    private readonly env: ExprEnv,
    private readonly readDirection: Variable['direction'] = 'internal',
  ) {}

  unknown(
    name: string,
    start: number,
    end: number,
    type: VariableType,
    direction: Variable['direction'],
  ): void {
    const suggestion = suggestName(
      name,
      [...this.env.variables.values()].map((v) => v.name),
    );
    this.diagnostics.push({
      code: 'unknownIdentifier',
      start,
      end,
      params: { name, ...(suggestion ? { suggestion } : {}) },
      hint: suggestion ? 'didYouMean' : 'createVariable',
      create: { name, type, direction },
    });
  }

  lookup(name: string): Variable | undefined {
    const v = this.env.variables.get(name.toLowerCase());
    if (v) this.references.add(v.name.toLowerCase());
    return v;
  }

  bool(n: BoolNode): void {
    switch (n.type) {
      case 'const':
        return;
      case 'var': {
        const v = this.lookup(n.name);
        if (!v) this.unknown(n.name, n.start, n.end, 'BOOL', 'input');
        else if (v.type !== 'BOOL') {
          this.diagnostics.push({
            code: 'notBoolean',
            start: n.start,
            end: n.end,
            params: { name: v.name, type: v.type },
            hint: 'compareNumber',
          });
        }
        return;
      }
      case 'step': {
        const r = this.env.resolveStep(n.number);
        if (r === 'missing')
          this.diagnostics.push({
            code: 'unknownStep',
            start: n.start,
            end: n.end,
            params: { number: String(n.number) },
          });
        if (r === 'ambiguous') {
          this.diagnostics.push({
            code: 'ambiguousStep',
            start: n.start,
            end: n.end,
            params: { number: String(n.number) },
            hint: 'renumberSteps',
          });
        }
        return;
      }
      case 'not':
      case 'edge':
      case 'timer':
        this.bool(n.operand);
        return;
      case 'and':
      case 'or':
        this.bool(n.left);
        this.bool(n.right);
        return;
      case 'cmp': {
        const ordering = n.op !== '=' && n.op !== '<>';
        this.arith(n.left, !ordering);
        this.arith(n.right, !ordering);
        return;
      }
    }
  }

  /** Type of an arithmetic expression ('BOOL' only for a lone boolean operand in = / <>). */
  arith(n: ArithNode, allowBool = false): VariableType | null {
    switch (n.type) {
      case 'num':
        return n.isInt ? 'INT' : 'REAL';
      case 'dur':
        return 'TIME';
      case 'avar': {
        if (STEP_REF_RE.test(n.name) && !this.env.variables.has(n.name.toLowerCase())) {
          this.diagnostics.push({
            code: 'stepInArithmetic',
            start: n.start,
            end: n.end,
            params: { name: n.name },
            hint: 'stepIsBoolean',
          });
          return null;
        }
        const v = this.lookup(n.name);
        if (!v) {
          this.unknown(n.name, n.start, n.end, 'INT', this.readDirection);
          return null;
        }
        if (v.type === 'BOOL' && !allowBool) {
          this.diagnostics.push({
            code: 'boolInArithmetic',
            start: n.start,
            end: n.end,
            params: { name: v.name },
            hint: 'parenthesizeComparison',
          });
        }
        return v.type;
      }
      case 'neg':
        return this.arith(n.operand);
      case 'arith': {
        const a = this.arith(n.left);
        const b = this.arith(n.right);
        if (a === 'REAL' || b === 'REAL') return 'REAL';
        if (a === 'TIME' || b === 'TIME') return 'TIME';
        return a ?? b;
      }
    }
  }

  forcing(f: ForcingOrder): void {
    const g = this.env.grafcetByName.get(f.grafcet.toLowerCase());
    if (!g) {
      const suggestion = suggestName(
        f.grafcet,
        [...this.env.grafcetByName.values()].map((x) => x.name),
      );
      this.diagnostics.push({
        code: 'unknownGrafcet',
        start: f.grafcetSpan.start,
        end: f.grafcetSpan.end,
        params: { name: f.grafcet, ...(suggestion ? { suggestion } : {}) },
        hint: suggestion ? 'didYouMean' : undefined,
      });
      return;
    }
    if (g.id === this.env.grafcetId) {
      this.diagnostics.push({
        code: 'forcesItself',
        start: f.grafcetSpan.start,
        end: f.grafcetSpan.end,
        params: { name: g.name },
      });
    }
    const numbers = new Set(Object.values(g.steps).map((s) => s.number));
    for (const s of f.steps) {
      if (!numbers.has(s.number)) {
        this.diagnostics.push({
          code: 'unknownForcedStep',
          start: s.start,
          end: s.end,
          params: { number: String(s.number), grafcet: g.name },
        });
      }
    }
  }
}

/** Receptivity, assignment condition or event. */
export function analyzeCondition(source: string, env: ExprEnv): Analysis {
  const r = cachedBool(source);
  if (!r.ok) return { diagnostics: [fromParseError(r.error)], references: new Set() };
  const c = new Checker(env, 'input');
  c.bool(r.value);
  return { diagnostics: c.diagnostics, references: c.references };
}

/** Continuous action: the boolean output (or internal variable) it sets. */
export function analyzeOutput(source: string, env: ExprEnv): Analysis {
  const r = cachedOutput(source);
  if (!r.ok) return { diagnostics: [fromParseError(r.error)], references: new Set() };
  const c = new Checker(env);
  const { name, start, end } = r.value;
  const v = c.lookup(name);
  if (!v) c.unknown(name, start, end, 'BOOL', 'output');
  else if (v.type !== 'BOOL') {
    c.diagnostics.push({
      code: 'notBoolean',
      start,
      end,
      params: { name: v.name, type: v.type },
      hint: 'continuousNeedsBool',
    });
  } else if (v.direction === 'input') {
    c.diagnostics.push({ code: 'writesInput', start, end, params: { name: v.name } });
  }
  return { diagnostics: c.diagnostics, references: c.references, writes: name.toLowerCase() };
}

function hasNumericLiteral(n: ArithNode): boolean {
  if (n.type === 'num') return n.value !== 0 && n.value !== 1;
  if (n.type === 'dur') return true;
  if (n.type === 'neg') return true;
  if (n.type === 'arith')
    return n.op !== '+' && n.op !== '*'
      ? true
      : hasNumericLiteral(n.left) ||
          hasNumericLiteral(n.right) ||
          n.left.type === 'num' ||
          n.right.type === 'num';
  return false;
}

/** Type for an undeclared assignment target, guessed from the value (`C := C + 1` → INT). */
function guessAssignedType(bool: BoolNode | null, arith: ArithNode | null): VariableType {
  if (!arith) return 'BOOL';
  if (arith.type === 'dur') return 'TIME';
  if (!bool) return arith.type === 'num' && !arith.isInt ? 'REAL' : 'INT';
  if (hasNumericLiteral(arith)) return arith.type === 'num' && !arith.isInt ? 'REAL' : 'INT';
  return 'BOOL';
}

/** Stored action: `target := value`. */
export function analyzeAssignment(source: string, env: ExprEnv): Analysis {
  const r = cachedAssignment(source);
  if (!r.ok) return { diagnostics: [fromParseError(r.error)], references: new Set() };
  const a = r.value;
  const c = new Checker(env);
  const v = c.lookup(a.target);
  const type: VariableType = v?.type ?? guessAssignedType(a.bool, a.arith);
  if (!v) c.unknown(a.target, a.targetSpan.start, a.targetSpan.end, type, 'internal');
  else if (v.direction === 'input') {
    c.diagnostics.push({
      code: 'writesInput',
      start: a.targetSpan.start,
      end: a.targetSpan.end,
      params: { name: v.name },
    });
  }
  if (type === 'BOOL') {
    if (a.bool) c.bool(a.bool);
    else if (a.boolError) c.diagnostics.push(fromParseError(a.boolError));
  } else if (a.arith) {
    const t = c.arith(a.arith);
    if (t === 'BOOL') {
      c.diagnostics.push({
        code: 'notNumeric',
        start: a.valueSpan.start,
        end: a.valueSpan.end,
        params: { name: a.target, type },
      });
    }
  } else if (a.arithError) {
    c.diagnostics.push(fromParseError(a.arithError));
  }
  return { diagnostics: c.diagnostics, references: c.references, writes: a.target.toLowerCase() };
}

export function analyzeForcing(source: string, env: ExprEnv): Analysis {
  const r = cachedForcing(source);
  if (!r.ok) return { diagnostics: [fromParseError(r.error)], references: new Set() };
  const c = new Checker(env);
  c.forcing(r.value);
  return { diagnostics: c.diagnostics, references: c.references };
}

export type ExpressionKind = 'condition' | 'output' | 'assignment' | 'forcing';

export function analyze(kind: ExpressionKind, source: string, env: ExprEnv): Analysis {
  switch (kind) {
    case 'condition':
      return analyzeCondition(source, env);
    case 'output':
      return analyzeOutput(source, env);
    case 'assignment':
      return analyzeAssignment(source, env);
    case 'forcing':
      return analyzeForcing(source, env);
  }
}

/** Expression kind of an action's text, from the action kind. */
export function actionTextKind(
  kind: 'continuous' | 'storedOnActivation' | 'storedOnDeactivation' | 'storedOnEvent' | 'forcing',
): ExpressionKind {
  if (kind === 'continuous') return 'output';
  if (kind === 'forcing') return 'forcing';
  return 'assignment';
}
