/**
 * Project validation: pure functions from a project to a sorted list of issues. Runs in a worker,
 * debounced, after every change. Graph rules (reachability, exclusivity, transient loops,
 * concurrency) are documented in docs/semantics.md.
 */
import type { BoolNode } from '../expr/ast';
import { cachedBool, cachedForcing } from '../expr/cache';
import { analyze, buildEnv, type Diagnostic, type ExprEnv } from '../expr/check';
import { emptyForcingsNeverUndone } from '../model/forcing';
import { indexGrafcet } from '../model/graph';
import type { Grafcet, Id, Project, Step } from '../model/types';
import { grafcetExpressions } from '../model/variables';
import { exclusive, hasEdgeOrTimer, satisfiable, type IntegerLookup } from './logic';
import { SEVERITY_ORDER, type Issue, type RuleId } from './types';

const PARSE_CODES = new Set([
  'empty',
  'unexpectedChar',
  'invalidNumber',
  'unexpectedToken',
  'unexpectedEnd',
  'missingParen',
  'numberAsCondition',
  'timerOperand',
  'assignmentExpected',
  'identifierExpected',
  'forcingSyntax',
]);

function ruleOf(d: Diagnostic): RuleId {
  if (PARSE_CODES.has(d.code)) return 'parseError';
  switch (d.code) {
    case 'unknownIdentifier':
      return 'unknownVariable';
    case 'writesInput':
      return 'writesInput';
    case 'unknownStep':
    case 'ambiguousStep':
      return 'stepReference';
    case 'unknownGrafcet':
    case 'unknownForcedStep':
    case 'forcesItself':
      return 'forcingTarget';
    default:
      return 'typeError';
  }
}

const stepLabel = (s: Step) => String(s.number);

/** Situation(s) each grafcet is forced into by some forcing order (by grafcet id). */
function forcingTargets(p: Project): Map<Id, { numbers: Set<number>; init: boolean }> {
  const byName = new Map(Object.values(p.grafcets).map((g) => [g.name.toLowerCase(), g.id]));
  const out = new Map<Id, { numbers: Set<number>; init: boolean }>();
  for (const g of Object.values(p.grafcets)) {
    for (const a of Object.values(g.actions)) {
      if (a.kind !== 'forcing') continue;
      const f = cachedForcing(a.text);
      if (!f.ok) continue;
      const target = byName.get(f.value.grafcet.toLowerCase());
      if (!target) continue;
      const entry = out.get(target) ?? { numbers: new Set<number>(), init: false };
      for (const s of f.value.steps) entry.numbers.add(s.number);
      if (f.value.mode === 'init') entry.init = true;
      out.set(target, entry);
    }
  }
  return out;
}

function expressionRules(g: Grafcet, env: ExprEnv, used: Set<string>, out: Issue[]): void {
  for (const e of grafcetExpressions(g)) {
    if (e.field === 'receptivity' && !e.source.trim()) {
      out.push({
        ruleId: 'emptyReceptivity',
        severity: 'error',
        messageKey: 'problems.messages.emptyReceptivity',
        params: {},
        grafcetId: g.id,
        elementIds: [e.ownerId],
        field: 'receptivity',
        quickFix: { kind: 'setReceptivity', grafcetId: g.id, transitionId: e.ownerId, value: '1' },
      });
      continue;
    }
    const analysis = analyze(e.kind, e.source, env);
    for (const name of analysis.references) used.add(name);
    for (const d of analysis.diagnostics) {
      out.push({
        ruleId: ruleOf(d),
        severity: 'error',
        messageKey: `expr.errors.${d.code}`,
        params: { ...d.params, source: e.source },
        grafcetId: g.id,
        elementIds: [e.ownerId],
        field: e.field,
        ...(d.create ? { quickFix: { kind: 'createVariable' as const, ...d.create } } : {}),
      });
    }
  }
  // An action without a step is always active, so it is never deactivated.
  for (const a of Object.values(g.actions)) {
    if (a.stepId !== null || a.kind !== 'storedOnDeactivation') continue;
    out.push({
      ruleId: 'unattachedAction',
      severity: 'warning',
      messageKey: 'problems.messages.unattachedAction',
      params: { text: a.text },
      grafcetId: g.id,
      elementIds: [a.id],
    });
  }
  // A conditional action without its condition behaves like a plain continuous action.
  for (const a of Object.values(g.actions)) {
    if (a.kind !== 'continuous' || a.condition === undefined || a.condition.trim()) continue;
    out.push({
      ruleId: 'missingCondition',
      severity: 'warning',
      messageKey: 'problems.messages.missingCondition',
      params: { text: a.text },
      grafcetId: g.id,
      elementIds: [a.id],
      field: 'condition',
    });
  }
  // An action stored on an event without an event never executes.
  for (const a of Object.values(g.actions)) {
    if (a.kind !== 'storedOnEvent' || a.condition?.trim()) continue;
    out.push({
      ruleId: 'missingEvent',
      severity: 'warning',
      messageKey: 'problems.messages.missingEvent',
      params: { text: a.text },
      grafcetId: g.id,
      elementIds: [a.id],
      field: 'condition',
    });
  }
}

function topmost(steps: Step[]): Step | undefined {
  return [...steps].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)[0];
}

function structureRules(
  g: Grafcet,
  forced: { numbers: Set<number>; init: boolean } | undefined,
  out: Issue[],
): void {
  const steps = Object.values(g.steps);
  if (!steps.length) return;
  const index = indexGrafcet(g);
  const initial = steps.filter((s) => s.kind === 'initial');

  if (g.kind !== 'macroExpansion' && !initial.length && !forced) {
    const s = topmost(steps)!;
    out.push({
      ruleId: 'noInitialStep',
      severity: 'error',
      messageKey: 'problems.messages.noInitialStep',
      params: { grafcet: g.name, step: stepLabel(s) },
      grafcetId: g.id,
      elementIds: [s.id],
      quickFix: { kind: 'makeInitial', grafcetId: g.id, stepId: s.id },
    });
  }

  const byNumber = new Map<number, Step[]>();
  for (const s of steps) byNumber.set(s.number, [...(byNumber.get(s.number) ?? []), s]);
  for (const [n, list] of byNumber) {
    if (list.length < 2) continue;
    out.push({
      ruleId: 'duplicateStepNumber',
      severity: 'error',
      messageKey: 'problems.messages.duplicateStepNumber',
      params: { number: String(n), count: String(list.length) },
      grafcetId: g.id,
      elementIds: list.map((s) => s.id),
      quickFix: { kind: 'renumber', grafcetId: g.id },
    });
  }

  if (g.kind === 'macroExpansion') {
    const entries = steps.filter((s) => !index.incoming.has(s.id));
    const exits = steps.filter((s) => !index.outgoing.has(s.id));
    if (entries.length !== 1 || exits.length !== 1) {
      out.push({
        ruleId: 'macroEntryExit',
        severity: 'warning',
        messageKey: 'problems.messages.macroEntryExit',
        params: { grafcet: g.name, entries: String(entries.length), exits: String(exits.length) },
        grafcetId: g.id,
        elementIds: [...entries, ...exits].map((s) => s.id).slice(0, 8),
      });
    }
  }

  // Reachability: from initial steps (macro expansions: entry steps; plus forced situations).
  // A transition can only clear if all its upstream steps can be active.
  const roots = new Set<Id>(initial.map((s) => s.id));
  if (g.kind === 'macroExpansion')
    for (const s of steps) if (!index.incoming.has(s.id)) roots.add(s.id);
  if (forced) for (const s of steps) if (forced.numbers.has(s.number)) roots.add(s.id);
  if (roots.size) {
    const reach = new Set(roots);
    const fire = (t: { from: Id[]; to: Id[] }, work: Id[]) => {
      if (!t.from.every((x) => reach.has(x))) return;
      for (const x of t.to) {
        if (reach.has(x)) continue;
        reach.add(x);
        work.push(x);
      }
    };
    const work: Id[] = [...roots];
    for (const t of Object.values(g.transitions)) if (!t.from.length) fire(t, work);
    while (work.length) {
      const sid = work.pop()!;
      for (const t of index.outgoing.get(sid) ?? []) fire(t, work);
    }
    for (const s of steps) {
      if (reach.has(s.id)) continue;
      out.push({
        ruleId: 'unreachableStep',
        severity: 'warning',
        messageKey: 'problems.messages.unreachableStep',
        params: { step: stepLabel(s) },
        grafcetId: g.id,
        elementIds: [s.id],
      });
    }
  }

  if (g.kind !== 'macroExpansion') {
    for (const s of steps) {
      if (index.outgoing.has(s.id) || !index.incoming.has(s.id)) continue;
      out.push({
        ruleId: 'deadEndStep',
        severity: 'warning',
        messageKey: 'problems.messages.deadEndStep',
        params: { step: stepLabel(s) },
        grafcetId: g.id,
        elementIds: [s.id],
      });
    }
  }
}

function parsed(source: string): BoolNode | null {
  const r = cachedBool(source);
  return r.ok ? r.value : null;
}

function exclusivityRule(g: Grafcet, isInteger: IntegerLookup, out: Issue[]): void {
  const index = indexGrafcet(g);
  for (const s of Object.values(g.steps)) {
    const outs = index.outgoing.get(s.id) ?? [];
    for (let i = 0; i < outs.length; i++) {
      for (let j = i + 1; j < outs.length; j++) {
        const a = outs[i]!;
        const b = outs[j]!;
        const fa = parsed(a.receptivity);
        const fb = parsed(b.receptivity);
        if (!fa || !fb || exclusive(fa, fb, isInteger)) continue;
        out.push({
          ruleId: 'nonExclusiveOr',
          severity: 'warning',
          messageKey: 'problems.messages.nonExclusiveOr',
          params: { step: stepLabel(s), a: a.receptivity, b: b.receptivity },
          grafcetId: g.id,
          elementIds: [b.id, a.id, s.id],
          quickFix: {
            kind: 'setReceptivity',
            grafcetId: g.id,
            transitionId: b.id,
            value: `(${b.receptivity}) * /(${a.receptivity})`,
          },
        });
      }
    }
  }
}

/**
 * Transient loop: a cycle of transitions (each feeding the next) whose receptivities contain no
 * edge or timer and can all be true at once. With such inputs the search for stability never ends.
 */
function transientLoopRule(g: Grafcet, isInteger: IntegerLookup, out: Issue[]): void {
  const candidates = Object.values(g.transitions).filter((t) => {
    const f = parsed(t.receptivity);
    return f && !hasEdgeOrTimer(f) && t.from.length > 0;
  });
  const byUpstream = new Map<Id, Id[]>();
  for (const u of candidates)
    for (const s of u.from) byUpstream.set(s, [...(byUpstream.get(s) ?? []), u.id]);
  const next = new Map<Id, Id[]>();
  for (const t of candidates)
    next.set(t.id, [...new Set(t.to.flatMap((s) => byUpstream.get(s) ?? []))]);
  // Tarjan's strongly connected components.
  let counter = 0;
  const idx = new Map<Id, number>();
  const low = new Map<Id, number>();
  const stack: Id[] = [];
  const onStack = new Set<Id>();
  const sccs: Id[][] = [];
  const strong = (v: Id) => {
    idx.set(v, counter);
    low.set(v, counter++);
    stack.push(v);
    onStack.add(v);
    for (const w of next.get(v) ?? []) {
      if (!idx.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: Id[] = [];
      let w: Id;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      sccs.push(comp);
    }
  };
  for (const t of candidates) if (!idx.has(t.id)) strong(t.id);

  for (const comp of sccs) {
    const inComp = new Set(comp);
    const selfLoop = comp.length === 1 && (next.get(comp[0]!) ?? []).includes(comp[0]!);
    if (comp.length < 2 && !selfLoop) continue;
    // One concrete cycle through the component (walk until a transition repeats).
    const path: Id[] = [];
    const seen = new Map<Id, number>();
    let cur = comp[0]!;
    while (!seen.has(cur)) {
      seen.set(cur, path.length);
      path.push(cur);
      cur = (next.get(cur) ?? []).find((n) => inComp.has(n))!;
    }
    const cycle = path.slice(seen.get(cur));
    const formulas = cycle.map((id) => parsed(g.transitions[id]!.receptivity)!);
    if (satisfiable(formulas, isInteger) !== true) continue;
    out.push({
      ruleId: 'transientLoop',
      severity: 'warning',
      messageKey: 'problems.messages.transientLoop',
      params: { receptivities: cycle.map((id) => g.transitions[id]!.receptivity).join(' ; ') },
      grafcetId: g.id,
      elementIds: cycle,
    });
  }
}

const MAX_SITUATIONS = 2000;

/**
 * Pairs of steps that can be active at the same time, by exploring the situations reachable from
 * the initial situation (one transition at a time, receptivities assumed satisfiable).
 * Pairs are collected among `only` (all steps by default). Returns null when the state space
 * exceeds MAX_SITUATIONS.
 */
export function coActiveSteps(g: Grafcet, only?: ReadonlySet<Id>): Set<string> | null {
  const steps = Object.keys(g.steps);
  const bit = new Map(steps.map((id, i) => [id, i]));
  const initial = steps.filter((id) => g.steps[id]!.kind === 'initial');
  if (!initial.length) return new Set();
  const encode = (set: Set<Id>) =>
    [...set]
      .map((id) => bit.get(id)!)
      .sort((a, b) => a - b)
      .join(',');
  const pairs = new Set<string>();
  const seen = new Set<string>();
  const queue: Set<Id>[] = [new Set(initial)];
  seen.add(encode(queue[0]!));
  const index = indexGrafcet(g);
  const sources = Object.values(g.transitions).filter((t) => !t.from.length);
  let head = 0;
  while (head < queue.length) {
    const sit = queue[head++]!;
    const active = [...sit];
    const watched = only ? active.filter((id) => only.has(id)) : active;
    for (let i = 0; i < watched.length; i++) {
      for (let j = i + 1; j < watched.length; j++)
        pairs.add([watched[i]!, watched[j]!].sort().join('|'));
    }
    const candidates = new Set(sources);
    for (const sid of active) for (const t of index.outgoing.get(sid) ?? []) candidates.add(t);
    for (const t of candidates) {
      if (!t.from.every((s) => sit.has(s))) continue;
      const nextSit = new Set(sit);
      for (const s of t.from) nextSit.delete(s);
      for (const s of t.to) nextSit.add(s);
      const key = encode(nextSit);
      if (seen.has(key)) continue;
      if (seen.size >= MAX_SITUATIONS) return null;
      seen.add(key);
      queue.push(nextSit);
    }
  }
  return pairs;
}

function parallelOutputRule(g: Grafcet, out: Issue[]): void {
  const byOutput = new Map<string, { stepId: Id; actionId: Id; name: string }[]>();
  const always = new Map<string, Id[]>();
  for (const a of Object.values(g.actions)) {
    if (a.kind !== 'continuous' || !a.text.trim()) continue;
    if (a.stepId === null) {
      // Without a step the action is always active: active together with every other driver.
      const key = a.text.trim().toLowerCase();
      always.set(key, [...(always.get(key) ?? []), a.id]);
      continue;
    }
    const key = a.text.trim().toLowerCase();
    byOutput.set(key, [
      ...(byOutput.get(key) ?? []),
      { stepId: a.stepId, actionId: a.id, name: a.text.trim() },
    ]);
  }
  for (const [key, ids] of always) {
    const steps = byOutput.get(key) ?? [];
    if (ids.length + steps.length < 2) continue;
    const name = g.actions[ids[0]!]!.text.trim();
    out.push({
      ruleId: 'parallelOutput',
      severity: 'warning',
      messageKey: 'problems.messages.parallelOutputAlways',
      params: {
        output: name,
        steps: steps.map((x) => stepLabel(g.steps[x.stepId]!)).join(', ') || '–',
      },
      grafcetId: g.id,
      elementIds: [...ids, ...steps.map((x) => x.actionId)],
    });
  }
  const shared = [...byOutput.values()].filter(
    (list) => new Set(list.map((x) => x.stepId)).size > 1,
  );
  if (!shared.length) return;
  const pairs = coActiveSteps(g, new Set(shared.flatMap((list) => list.map((x) => x.stepId))));
  if (!pairs) return;
  for (const list of shared) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (a.stepId === b.stepId || !pairs.has([a.stepId, b.stepId].sort().join('|'))) continue;
        out.push({
          ruleId: 'parallelOutput',
          severity: 'warning',
          messageKey: 'problems.messages.parallelOutput',
          params: {
            output: a.name,
            a: stepLabel(g.steps[a.stepId]!),
            b: stepLabel(g.steps[b.stepId]!),
          },
          grafcetId: g.id,
          elementIds: [b.actionId, a.actionId],
        });
      }
    }
  }
}

/**
 * Hierarchy: every macro-step needs its own expansion and every enclosing step its own enclosed
 * grafcet; sub-grafcets should be used; forcing must not form a cycle; macro-steps carry no stored
 * actions (put them in the expansion).
 */
function hierarchyRules(p: Project, out: Issue[]): void {
  const users = new Map<Id, { grafcet: Grafcet; step: Step }[]>();
  for (const gid of p.grafcetOrder) {
    const g = p.grafcets[gid];
    if (!g) continue;
    for (const s of Object.values(g.steps)) {
      if (s.kind !== 'macro' && s.kind !== 'enclosing') continue;
      const child = s.refGrafcetId ? p.grafcets[s.refGrafcetId] : undefined;
      const want = s.kind === 'macro' ? 'macroExpansion' : 'enclosed';
      if (!child || child.kind !== want) {
        out.push({
          ruleId: 'subgrafcetMissing',
          severity: 'error',
          messageKey: `problems.messages.${s.kind === 'macro' ? 'macroWithoutExpansion' : 'enclosingWithoutGrafcet'}`,
          params: { step: stepLabel(s) },
          grafcetId: g.id,
          elementIds: [s.id],
        });
        continue;
      }
      users.set(child.id, [...(users.get(child.id) ?? []), { grafcet: g, step: s }]);
      if (s.kind === 'macro') {
        const stored = Object.values(g.actions).filter(
          (a) => a.stepId === s.id && a.kind !== 'continuous',
        );
        if (stored.length) {
          out.push({
            ruleId: 'macroActions',
            severity: 'warning',
            messageKey: 'problems.messages.macroActions',
            params: { step: stepLabel(s), grafcet: child.name },
            grafcetId: g.id,
            elementIds: stored.map((a) => a.id),
          });
        }
      }
    }
  }
  for (const gid of p.grafcetOrder) {
    const g = p.grafcets[gid];
    if (!g || g.kind === 'partial') continue;
    const list = users.get(gid) ?? [];
    if (list.length > 1) {
      out.push({
        ruleId: 'subgrafcetShared',
        severity: 'error',
        messageKey: 'problems.messages.subgrafcetShared',
        params: {
          grafcet: g.name,
          steps: list.map((u) => `${u.grafcet.name}.${stepLabel(u.step)}`).join(', '),
        },
        grafcetId: list[0]!.grafcet.id,
        elementIds: list.map((u) => u.step.id),
      });
    } else if (!list.length) {
      out.push({
        ruleId: 'subgrafcetUnused',
        severity: 'warning',
        messageKey: `problems.messages.${g.kind === 'macroExpansion' ? 'expansionUnused' : 'enclosedUnused'}`,
        params: { grafcet: g.name },
        grafcetId: g.id,
        elementIds: [],
      });
    }
  }

  // Forcing hierarchy must be acyclic.
  const byName = new Map(Object.values(p.grafcets).map((g) => [g.name.toLowerCase(), g.id]));
  const forces = new Map<Id, { target: Id; actionId: Id }[]>();
  for (const g of Object.values(p.grafcets)) {
    for (const a of Object.values(g.actions)) {
      if (a.kind !== 'forcing') continue;
      const r = cachedForcing(a.text);
      const target = r.ok ? byName.get(r.value.grafcet.toLowerCase()) : undefined;
      if (target && target !== g.id)
        forces.set(g.id, [...(forces.get(g.id) ?? []), { target, actionId: a.id }]);
    }
  }
  const state = new Map<Id, 1 | 2>();
  const stack: { gid: Id; actionId: Id | null }[] = [];
  const reported = new Set<Id>();
  const visit = (gid: Id, via: Id | null) => {
    stack.push({ gid, actionId: via });
    state.set(gid, 1);
    for (const e of forces.get(gid) ?? []) {
      if (state.get(e.target) === 1) {
        const from = stack.findIndex((x) => x.gid === e.target);
        const cycle = [...stack.slice(from + 1).map((x) => x.actionId!), e.actionId];
        const names = stack.slice(from).map((x) => p.grafcets[x.gid]!.name);
        if (!cycle.some((id) => reported.has(id))) {
          cycle.forEach((id) => reported.add(id));
          const owner = Object.values(p.grafcets).find((g) => g.actions[e.actionId])!;
          out.push({
            ruleId: 'forcingCycle',
            severity: 'error',
            messageKey: 'problems.messages.forcingCycle',
            params: { grafcets: [...names, p.grafcets[e.target]!.name].join(' → ') },
            grafcetId: owner.id,
            elementIds: [e.actionId],
          });
        }
      } else if (!state.has(e.target)) visit(e.target, e.actionId);
    }
    state.set(gid, 2);
    stack.pop();
  };
  for (const gid of p.grafcetOrder) if (!state.has(gid)) visit(gid, null);

  // G{} is the empty situation (IEC 60848); with nothing to restart G, G{INIT} was probably meant.
  for (const e of emptyForcingsNeverUndone(p)) {
    const owner = p.grafcets[e.grafcetId]!;
    const target = p.grafcets[e.target]!.name;
    out.push({
      ruleId: 'forcingEmpty',
      severity: 'warning',
      messageKey: 'problems.messages.forcingEmpty',
      params: { order: owner.actions[e.actionId]!.text.trim(), grafcet: target },
      grafcetId: owner.id,
      elementIds: [e.actionId],
      field: 'text',
      quickFix: {
        kind: 'setActionText',
        grafcetId: owner.id,
        actionId: e.actionId,
        value: `${target}{INIT}`,
      },
    });
  }
}

function unusedVariableRule(p: Project, used: Set<string>, out: Issue[]): void {
  for (const v of Object.values(p.variables)) {
    if (used.has(v.name.toLowerCase())) continue;
    out.push({
      ruleId: 'unusedVariable',
      severity: 'info',
      messageKey: 'problems.messages.unusedVariable',
      params: { name: v.name, variableId: v.id },
      grafcetId: null,
      elementIds: [],
      quickFix: { kind: 'deleteVariable', variableId: v.id },
    });
  }
}

export function validateProject(p: Project): Issue[] {
  const out: Issue[] = [];
  const forced = forcingTargets(p);
  const used = new Set<string>();
  for (const gid of p.grafcetOrder) {
    const g = p.grafcets[gid];
    if (!g) continue;
    const env = buildEnv(p, gid);
    expressionRules(g, env, used, out);
    structureRules(g, forced.get(gid), out);
    const isInteger: IntegerLookup = (name) => {
      const t = env.variables.get(name)?.type;
      return t === 'INT' || t === 'TIME';
    };
    exclusivityRule(g, isInteger, out);
    transientLoopRule(g, isInteger, out);
    parallelOutputRule(g, out);
  }
  hierarchyRules(p, out);
  unusedVariableRule(p, used, out);
  const order = new Map(p.grafcetOrder.map((id, i) => [id, i]));
  return out
    .map((issue, i) => ({ issue, i }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] ||
        (order.get(a.issue.grafcetId ?? '') ?? 1e9) - (order.get(b.issue.grafcetId ?? '') ?? 1e9) ||
        a.i - b.i,
    )
    .map((x) => x.issue);
}
