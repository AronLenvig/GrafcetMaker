import { describe, expect, it } from 'vitest';
import type { BoolNode } from '@/core/expr/ast';
import { parseBool } from '@/core/expr/parser';
import { createGrafcet, createProject, createStep } from '@/core/model/factory';
import { convertStep } from '@/core/model/hierarchy';
import { appendAfterStep, connect } from '@/core/model/ops';
import { addAlternativeBranch, addLoop, addParallelBranch } from '@/core/model/structure';
import type { Grafcet, Project } from '@/core/model/types';
import { exclusive, satisfiable } from '@/core/validation/logic';
import { coActiveSteps, validateProject } from '@/core/validation/validate';

const f = (s: string): BoolNode => {
  const r = parseBool(s);
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};
const first = (p: Project): Grafcet => p.grafcets[p.grafcetOrder[0]!]!;
const rules = (p: Project) => validateProject(p).map((i) => i.ruleId);

function declare(p: Project, names: string[], type: 'BOOL' | 'INT' | 'REAL' = 'BOOL') {
  for (const name of names) p.variables[name] = { id: name, name, type, direction: 'input' };
}

describe('exclusivity reasoning', () => {
  it.each([
    ['a', '/a', true],
    ['a * b', '/a + /b', true],
    ['a', 'b', false],
    ['↑a', '↓a', true],
    ['↑a', '/a', true],
    ['↑a', 'a', false],
    ['3s/X2', '/X2', true],
    ['C > 3', 'C < 2', true],
    ['C >= 3', 'C <= 3', false],
    ['C = 1', 'C <> 1', true],
    ['X2 * a', 'X2 * /a', true],
    ['1', 'a', false],
    ['0', '1', true],
  ])('%s vs %s → exclusive=%s', (a, b, expected) => {
    expect(exclusive(f(a), f(b))).toBe(expected);
  });

  it('uses integer semantics only for integer variables', () => {
    const isInt = (n: string) => n === 'n';
    expect(exclusive(f('n > 3'), f('n < 4'), isInt)).toBe(true);
    expect(exclusive(f('r > 3'), f('r < 4'), isInt)).toBe(false);
  });

  it('gives up (unknown) beyond the atom limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => `v${i}`).join(' * ');
    expect(satisfiable([f(many)])).toBe('unknown');
  });
});

describe('structure rules', () => {
  it('reports a missing initial step with a quick fix, and duplicate numbers', () => {
    const p = createProject('T');
    const g = first(p);
    const s0 = Object.values(g.steps)[0]!;
    s0.kind = 'normal';
    const { stepId } = appendAfterStep(g, s0.id)!;
    g.steps[stepId]!.number = 0;
    const issues = validateProject(p);
    const noInit = issues.find((i) => i.ruleId === 'noInitialStep')!;
    expect(noInit.quickFix).toEqual({ kind: 'makeInitial', grafcetId: g.id, stepId: s0.id });
    expect(issues.find((i) => i.ruleId === 'duplicateStepNumber')!.elementIds).toHaveLength(2);
  });

  it('finds unreachable steps, treating AND convergences as needing all inputs', () => {
    const p = createProject('R');
    const g = first(p);
    declare(p, ['a', 'b']);
    const s0 = Object.values(g.steps)[0]!.id;
    const t1 = appendAfterStep(g, s0)!;
    g.transitions[t1.transitionId]!.receptivity = 'a';
    // An orphan step joined with step 1 into an AND convergence: its successor is unreachable.
    const orphan = appendAfterStep(g, t1.stepId)!;
    g.transitions[orphan.transitionId]!.receptivity = 'b';
    const lonely = Object.values(g.steps).length;
    const loneId = `lone${lonely}`;
    g.steps[loneId] = { id: loneId, number: 99, kind: 'normal', position: { x: 500, y: 0 } };
    connect(g, loneId, orphan.transitionId);
    const unreachable = validateProject(p)
      .filter((i) => i.ruleId === 'unreachableStep')
      .flatMap((i) => i.elementIds);
    expect(unreachable.sort()).toEqual([loneId, orphan.stepId].sort());
  });

  it('flags dead ends but not lone steps', () => {
    const p = createProject('D');
    expect(rules(p)).not.toContain('deadEndStep');
    const g = first(p);
    const r = appendAfterStep(g, Object.values(g.steps)[0]!.id)!;
    g.transitions[r.transitionId]!.receptivity = '1';
    expect(rules(p)).toContain('deadEndStep');
  });
});

describe('graph logic rules', () => {
  it('warns on non-exclusive OR divergences; the priority fix makes them exclusive', () => {
    const p = createProject('O');
    declare(p, ['a', 'b']);
    const g = first(p);
    const s0 = Object.values(g.steps)[0]!.id;
    const main = appendAfterStep(g, s0)!;
    g.transitions[main.transitionId]!.receptivity = 'a';
    const alt = addAlternativeBranch(g, s0)!;
    g.transitions[alt.transitionId]!.receptivity = 'b';
    const issue = validateProject(p).find((i) => i.ruleId === 'nonExclusiveOr')!;
    expect(issue).toBeDefined();
    expect(issue.quickFix?.kind).toBe('setReceptivity');
    if (issue.quickFix?.kind !== 'setReceptivity') return;
    g.transitions[issue.quickFix.transitionId]!.receptivity = issue.quickFix.value;
    expect(rules(p)).not.toContain('nonExclusiveOr');
    g.transitions[alt.transitionId]!.receptivity = '/a';
    expect(rules(p)).not.toContain('nonExclusiveOr');
  });

  it('warns on loops that can be crossed without end, not when an edge or timer breaks them', () => {
    const p = createProject('L');
    declare(p, ['a', 'b']);
    const g = first(p);
    const s0 = Object.values(g.steps)[0]!.id;
    const r = appendAfterStep(g, s0)!;
    g.transitions[r.transitionId]!.receptivity = 'a';
    const loop = addLoop(g, r.stepId, s0)!;
    g.transitions[loop]!.receptivity = 'b';
    expect(rules(p)).toContain('transientLoop');
    g.transitions[loop]!.receptivity = '/a';
    expect(rules(p)).not.toContain('transientLoop');
    g.transitions[loop]!.receptivity = '↑b';
    expect(rules(p)).not.toContain('transientLoop');
    g.transitions[loop]!.receptivity = '2s/X1';
    expect(rules(p)).not.toContain('transientLoop');
  });

  it('detects outputs driven from concurrently active steps only', () => {
    const p = createProject('C');
    p.variables.m = { id: 'm', name: 'M', type: 'BOOL', direction: 'output' };
    const g = first(p);
    const s0 = Object.values(g.steps)[0]!.id;
    const r = appendAfterStep(g, s0)!;
    g.transitions[r.transitionId]!.receptivity = '1';
    const after = appendAfterStep(g, r.stepId)!;
    const par = addParallelBranch(g, r.stepId)!;
    expect(coActiveSteps(g)!.has([r.stepId, par].sort().join('|'))).toBe(true);
    expect(coActiveSteps(g)!.has([r.stepId, after.stepId].sort().join('|'))).toBe(false);
    g.actions.a1 = { id: 'a1', stepId: r.stepId, order: 0, kind: 'continuous', text: 'M' };
    g.actions.a2 = { id: 'a2', stepId: after.stepId, order: 0, kind: 'continuous', text: 'M' };
    expect(rules(p)).not.toContain('parallelOutput');
    g.actions.a3 = { id: 'a3', stepId: par, order: 0, kind: 'continuous', text: 'm' };
    expect(rules(p)).toContain('parallelOutput');
  });

  it('reports expression problems with quick fixes and unused variables', () => {
    const p = createProject('E');
    declare(p, ['used', 'unused']);
    const g = first(p);
    const r = appendAfterStep(g, Object.values(g.steps)[0]!.id)!;
    expect(validateProject(p).find((i) => i.ruleId === 'emptyReceptivity')!.quickFix).toMatchObject(
      { value: '1' },
    );
    g.transitions[r.transitionId]!.receptivity = 'used * nope';
    const issues = validateProject(p);
    expect(issues.find((i) => i.ruleId === 'unknownVariable')!.quickFix).toMatchObject({
      kind: 'createVariable',
      name: 'nope',
    });
    expect(issues.find((i) => i.ruleId === 'unusedVariable')!.params.name).toBe('unused');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[issues.length - 1]!.severity).toBe('info');
  });
});

describe('hierarchy rules', () => {
  it('reports forcing cycles, missing, shared and unused sub-grafcets', () => {
    const p = createProject('H');
    const g1 = first(p);
    const s0 = Object.values(g1.steps)[0]!.id;
    const a = appendAfterStep(g1, s0)!;
    const b = appendAfterStep(g1, a.stepId)!;
    const g2Id = convertStep(p, g1.id, a.stepId, 'enclosing')!;
    g1.steps[b.stepId]!.kind = 'enclosing';
    g1.steps[b.stepId]!.refGrafcetId = g2Id; // shared
    const g3 = createGrafcetFor(p, 'G3');
    g1.actions.f1 = { id: 'f1', stepId: s0, order: 0, kind: 'forcing', text: 'G3{*}' };
    g3.actions.f2 = {
      id: 'f2',
      stepId: Object.keys(g3.steps)[0]!,
      order: 0,
      kind: 'forcing',
      text: 'G1{*}',
    };
    const macroId = convertStep(p, g1.id, appendAfterStep(g1, b.stepId)!.stepId, 'macro')!;
    const lost = createGrafcetFor(p, 'Lost');
    lost.kind = 'macroExpansion';
    const ids = rules(p);
    expect(ids).toContain('forcingCycle');
    expect(ids).toContain('subgrafcetShared');
    expect(
      validateProject(p)
        .filter((i) => i.ruleId === 'subgrafcetUnused')
        .map((i) => i.params.grafcet),
    ).toEqual(['Lost']);
    delete p.grafcets[macroId];
    p.grafcetOrder = p.grafcetOrder.filter((id) => id !== macroId);
    expect(rules(p)).toContain('subgrafcetMissing');
  });

  it('warns about G{} when nothing activates the grafcet again, with a fix to G{INIT}', () => {
    const p = createProject('F');
    const g1 = first(p);
    const s0 = Object.values(g1.steps)[0]!.id;
    const g2 = createGrafcetFor(p, 'G2');
    g1.actions.f = { id: 'f', stepId: s0, order: 0, kind: 'forcing', text: 'G2{}' };
    const issue = validateProject(p).find((i) => i.ruleId === 'forcingEmpty')!;
    expect(issue.severity).toBe('warning');
    expect(issue.elementIds).toEqual(['f']);
    expect(issue.quickFix).toEqual({
      kind: 'setActionText',
      grafcetId: g1.id,
      actionId: 'f',
      value: 'G2{INIT}',
    });
    // Emergency stop: G2{} while stopped, G2{INIT} on reset.
    const s1 = appendAfterStep(g1, s0)!.stepId;
    g1.actions.r = { id: 'r', stepId: s1, order: 0, kind: 'forcing', text: 'G2{INIT}' };
    expect(rules(p)).not.toContain('forcingEmpty');
    delete g1.actions.r;
    // A source transition can activate a step of G2 again.
    const s = Object.keys(g2.steps)[0]!;
    g2.transitions.src = {
      id: 'src',
      from: [],
      to: [s],
      receptivity: '1',
      position: { x: 0, y: 0 },
    };
    expect(rules(p)).not.toContain('forcingEmpty');
  });
});

function createGrafcetFor(p: Project, name: string): Grafcet {
  const g = createGrafcet(name);
  const s = createStep(Object.keys(p.grafcets).length * 100, { x: 0, y: 0 }, 'initial');
  g.steps[s.id] = s;
  p.grafcets[g.id] = g;
  p.grafcetOrder.push(g.id);
  return g;
}
