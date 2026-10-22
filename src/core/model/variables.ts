import { actionTextKind, analyze, buildEnv, type ExprEnv, type ProjectNames } from '../expr/check';
import { renameIdentifier } from '../expr/format';
import { RESERVED_WORDS, tokenize } from '../expr/lexer';
import { STEP_REF_RE } from '../expr/parser';
import { IDENT_RE } from './constants';
import type { Grafcet, Id, Project, Variable, VariableType } from './types';

export type VariableNameError = 'empty' | 'invalid' | 'reserved' | 'stepLike' | 'duplicate';

export function validateVariableName(
  p: Project,
  name: string,
  exceptId?: Id,
): VariableNameError | null {
  if (!name) return 'empty';
  if (!IDENT_RE.test(name) || name.length > 64) return 'invalid';
  if (RESERVED_WORDS.has(name.toLowerCase())) return 'reserved';
  if (STEP_REF_RE.test(name)) return 'stepLike';
  const lower = name.toLowerCase();
  if (Object.values(p.variables).some((v) => v.id !== exceptId && v.name.toLowerCase() === lower))
    return 'duplicate';
  return null;
}

export function uniqueVariableName(p: Project, base = 'var'): string {
  for (let i = 1; ; i++) if (!validateVariableName(p, `${base}${i}`)) return `${base}${i}`;
}

/** Every expression string in a grafcet with its kind, for analysis and refactoring. */
export function* grafcetExpressions(g: Grafcet): Generator<{
  ownerId: Id;
  field: 'receptivity' | 'text' | 'condition';
  kind: 'condition' | 'output' | 'assignment' | 'forcing';
  source: string;
}> {
  for (const t of Object.values(g.transitions)) {
    yield { ownerId: t.id, field: 'receptivity', kind: 'condition', source: t.receptivity };
  }
  for (const a of Object.values(g.actions)) {
    yield { ownerId: a.id, field: 'text', kind: actionTextKind(a.kind), source: a.text };
    if (a.condition !== undefined)
      yield { ownerId: a.id, field: 'condition', kind: 'condition', source: a.condition };
  }
}

/** How many expressions reference each variable (by lower-cased name). */
export function variableUsage(p: ProjectNames): Map<string, number> {
  const usage = new Map<string, number>();
  for (const g of Object.values(p.grafcets)) {
    const env: ExprEnv = buildEnv(p, g.id);
    for (const e of grafcetExpressions(g)) {
      for (const name of analyze(e.kind, e.source, env).references)
        usage.set(name, (usage.get(name) ?? 0) + 1);
    }
  }
  return usage;
}

/** Variables referenced by the expressions of some elements (steps bring their actions). */
export function referencedVariables(p: ProjectNames, g: Grafcet, ids: Id[]): Variable[] {
  const set = new Set(ids);
  const env = buildEnv(p, g.id);
  const names = new Set<string>();
  for (const e of grafcetExpressions(g)) {
    const a = g.actions[e.ownerId];
    if (!set.has(e.ownerId) && !(a && set.has(a.stepId))) continue;
    for (const n of analyze(e.kind, e.source, env).references) names.add(n);
  }
  return Object.values(p.variables).filter((v) => names.has(v.name.toLowerCase()));
}

/** Renames a variable and every reference to it, in all grafcets (mutates a draft). */
export function renameVariableEverywhere(p: Project, id: Id, newName: string): void {
  const v = p.variables[id];
  if (!v) return;
  const old = v.name;
  v.name = newName;
  if (old.toLowerCase() === newName.toLowerCase()) return;
  for (const g of Object.values(p.grafcets)) {
    for (const t of Object.values(g.transitions)) {
      const r = renameIdentifier(t.receptivity, old, newName);
      if (r !== t.receptivity) t.receptivity = r;
    }
    for (const a of Object.values(g.actions)) {
      const text = renameIdentifier(a.text, old, newName);
      if (text !== a.text) a.text = text;
      if (a.condition !== undefined) {
        const c = renameIdentifier(a.condition, old, newName);
        if (c !== a.condition) a.condition = c;
      }
    }
  }
}

/** Parses an initial value typed in the variable table. Returns undefined to clear it, or an error. */
export function parseInitialValue(
  type: VariableType,
  text: string,
): { value: boolean | number | undefined } | { error: true } {
  const s = text.trim();
  if (s === '') return { value: undefined };
  if (type === 'BOOL') {
    const l = s.toLowerCase();
    if (l === '1' || l === 'true') return { value: true };
    if (l === '0' || l === 'false') return { value: false };
    return { error: true };
  }
  if (type === 'TIME') {
    try {
      const t = tokenize(s);
      if (t.length === 2 && t[0]!.kind === 'duration') return { value: t[0]!.value! };
      if (t.length === 2 && t[0]!.kind === 'number' && t[0]!.isInt) return { value: t[0]!.value! };
    } catch {
      return { error: true };
    }
    return { error: true };
  }
  const n = Number(s);
  if (!Number.isFinite(n) || (type === 'INT' && !Number.isInteger(n))) return { error: true };
  return { value: n };
}

export function formatInitialValue(v: Variable): string {
  if (v.initialValue === undefined) return '';
  if (v.type === 'BOOL') return v.initialValue ? 'TRUE' : 'FALSE';
  if (v.type === 'TIME' && typeof v.initialValue === 'number') {
    const ms = v.initialValue;
    return ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`;
  }
  return String(v.initialValue);
}
