/**
 * IEC 61131-3 Structured Text in the style PLC programmers write by hand: one INT step variable
 * per sequence, a CASE on it holding the transitions of each step, then every output as one
 * boolean expression of the step variables (`Motor := step_G1 >= 2 AND step_G1 <= 4;`).
 *
 * A sequence is a set of steps joined by transitions (macro-steps inlined, so an expansion belongs
 * to the sequence of its macro-step). It becomes a CASE when one step at a time can be active: at
 * most one initial step, every transition from one step to one step, unique step numbers, not
 * enclosed. Other sequences (parallel branches, source/sink transitions, several initial steps,
 * enclosed grafcets) keep one BOOL per step with the equations of the step-bit generator (st.ts).
 *
 * Scan: (1) timers and edges, (2) first scan: actions on activation of the initial steps, (3) the
 * sequences, forcing grafcets before the grafcets they force: a CASE clears at most one transition
 * (the first true receptivity, left to right) and runs the stored actions of the steps it leaves
 * and enters; an active forcing order replaces the CASE, (4) actions on events, (5) outputs.
 * With `storedActions: 'whileActive'`, stored actions that assign a constant are held instead:
 * each scan, at the top of their step's CASE branch (or `IF X THEN` for one BOOL per step).
 */
import { compile, type CAction } from '../simulation/program';
import type { BoolNode } from '../expr/ast';
import type { Project, Variable } from '../model/types';
import {
  comment,
  emptyForcingWarnings,
  heldActions,
  NameTable,
  referencedNames,
  macroSteps,
  warningCollector,
  warnKeywords,
  stArith,
  stBool,
  timeLiteral,
  type CodegenOptions,
  type CodegenResult,
  type ExprTarget,
} from './common';
import { CALL_CYCLICALLY, dialectHooks, renderModule, type Decl } from './dialect';

const TAB = '\t';
/** Step variable value of a sequence with no active step (`G{}`, sequences without initial step). */
const NONE = -1;
/** stBool precedence of an operand of AND (an OR inside it gets parentheses). */
const AND_OPERAND = 2;

interface Sequence {
  /** Step indices (macro-steps excluded), by step number. */
  steps: number[];
  /** Transitions of the sequence, in the compiled (left to right) order. */
  transitions: number[];
  /** Grafcet the sequence is named after (the one of its initial step). */
  grafcet: number;
  initial: number[];
  /** CASE sequences: the step variable and its range-error flag. */
  caseVar?: string;
  errorVar?: string;
  /** The CASE needs a value for "no active step". */
  none: boolean;
}

const isTrue = (n: BoolNode) => n.type === 'const' && n.value;

/** `v = 3 OR v = 4`, with runs of three or more as `v >= 2 AND v <= 4`. */
function stepSet(v: string, numbers: number[]): string[] {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    if (j - i >= 2) out.push(`${v} >= ${sorted[i]} AND ${v} <= ${sorted[j]}`);
    else for (let k = i; k <= j; k++) out.push(`${v} = ${sorted[k]}`);
    i = j + 1;
  }
  return out;
}

/** Terms joined by OR; compound terms get parentheses when there are several. */
const anyOf = (terms: string[]) =>
  terms.length > 1 ? terms.map((t) => (/ AND /.test(t) ? `(${t})` : t)).join(' OR ') : terms[0]!;

export function generateStCase(project: Project, opts: CodegenOptions): CodegenResult {
  const p = compile(project);
  const hooks = dialectHooks(opts.dialect ?? 'iec');
  const heldSet = heldActions(p, opts);
  const held = (a: CAction) => heldSet.has(a);
  const { warnings, warn } = warningCollector();
  for (const prob of p.problems)
    warn({ code: 'expression', elementId: prob.elementId, params: {} });
  for (const w of emptyForcingWarnings(project)) warn(w);

  const userVars = [...p.variables.values()];
  warnKeywords(userVars, warn);
  const names = new NameTable([...userVars.map((v) => v.name), ...referencedNames(p)]);
  const fbName = names.take(`FB_${project.name}`);
  const gName = (gi: number) => p.grafcets[gi]!.name;
  const num = (i: number) => p.steps[i]!.number;
  const isMacro = (i: number) => p.macros.has(i);
  const realMembers = (i: number) => macroSteps(p, i);

  // ---- Sequences ---------------------------------------------------------------------------------
  const root = p.steps.map((_, i) => i);
  const find = (i: number): number => {
    while (root[i] !== i) {
      root[i] = root[root[i]!]!;
      i = root[i]!;
    }
    return i;
  };
  for (const t of p.transitions) {
    const ends = [...t.from, ...t.to];
    for (const s of ends.slice(1)) root[find(s)] = find(ends[0]!);
  }
  const members = new Map<number, number[]>();
  for (const s of p.steps)
    if (!isMacro(s.idx)) members.set(find(s.idx), [...(members.get(find(s.idx)) ?? []), s.idx]);
  const seqOf = new Map<number, Sequence>();
  const sequences: Sequence[] = [];
  for (const list of members.values()) {
    const steps = list.sort((a, b) => num(a) - num(b) || a - b);
    const initial = steps.filter((i) => p.steps[i]!.initial);
    const seq: Sequence = {
      steps,
      transitions: [],
      grafcet: p.steps[initial[0] ?? steps[0]!]!.grafcet,
      initial,
      none: initial.length === 0,
    };
    sequences.push(seq);
    for (const s of steps) seqOf.set(s, seq);
  }
  for (const t of p.transitions) {
    const s = t.from[0] ?? t.to[0];
    if (s !== undefined) seqOf.get(s)?.transitions.push(t.idx);
  }

  const enclosingOf = new Map<number, number>();
  for (const [enc, e] of p.enclosures) for (const m of e.members) enclosingOf.set(m, enc);
  const perGrafcet = new Map<number, number>();
  const caseable = (seq: Sequence) =>
    seq.initial.length <= 1 &&
    new Set(seq.steps.map(num)).size === seq.steps.length &&
    !seq.steps.some((s) => enclosingOf.has(s)) &&
    seq.transitions.every((ti) => {
      const t = p.transitions[ti]!;
      return t.from.length === 1 && t.to.length === 1;
    });
  for (const seq of sequences) {
    if (caseable(seq)) perGrafcet.set(seq.grafcet, (perGrafcet.get(seq.grafcet) ?? 0) + 1);
    else warn({ code: 'parallelSequence', params: { grafcet: gName(seq.grafcet) } });
  }
  for (const seq of sequences) {
    if (!caseable(seq)) continue;
    const g = gName(seq.grafcet);
    const base =
      perGrafcet.get(seq.grafcet)! > 1
        ? `step_${g}_${num(seq.initial[0] ?? seq.steps[0]!)}`
        : `step_${g}`;
    seq.caseVar = names.take(base);
    seq.errorVar = names.take(`${base}_range_error`);
  }

  // Forcing orders, and the steps each one leaves active in a sequence.
  const forcing = p.actions.filter((a) => a.forcing);
  const ordersOn = (seq: Sequence) =>
    forcing.filter((a) => seq.steps.some((s) => p.steps[s]!.grafcet === a.forcing!.target));
  const forcedIn = (seq: Sequence, a: CAction): number[] => {
    const f = a.forcing!;
    const list = f.mode === 'init' ? p.grafcets[f.target]!.initial : f.steps;
    return list.filter((s) => seqOf.get(s) === seq);
  };
  for (const seq of sequences)
    for (const a of ordersOn(seq))
      if (seq.caseVar && a.forcing!.mode !== 'freeze' && !forcedIn(seq, a).length) seq.none = true;

  // ---- Names of the BOOL steps -----------------------------------------------------------------
  const X: string[] = [];
  for (const s of p.steps)
    if (!isMacro(s.idx) && !seqOf.get(s.idx)?.caseVar)
      X[s.idx] = names.take(`${gName(s.grafcet)}_X${s.number}`);
  const T: string[] = [];
  for (const seq of sequences) {
    if (seq.caseVar) continue;
    seq.transitions.forEach((ti, k) => {
      const t = p.transitions[ti]!;
      const src = project.grafcets[p.grafcets[t.grafcet]!.id]!.transitions[t.id]!;
      T[ti] = names.take(`${gName(t.grafcet)}_T${src.number ?? k + 1}`);
    });
  }
  const storedKinds = new Set(['storedOnActivation', 'storedOnDeactivation']);
  const M: string[] = [];
  for (const s of p.steps) {
    const flags = X[s.idx] !== undefined;
    const stored = p.actionsByStep[s.idx]!.some((a) => storedKinds.has(a.kind) && !held(a));
    if ((flags && stored) || p.enclosures.has(s.idx))
      M[s.idx] = names.take(`${gName(s.grafcet)}_X${s.number}_M`);
  }

  // ---- Expressions ---------------------------------------------------------------------------------
  const refInfo = (i: number): { text: string; cmp: boolean } => {
    if (isMacro(i)) {
      const parts = realMembers(i).map(refInfo);
      if (parts.length === 1) return parts[0]!;
      return {
        text: parts.length ? `(${parts.map((r) => r.text).join(' OR ')})` : 'FALSE',
        cmp: false,
      };
    }
    const seq = seqOf.get(i);
    return seq?.caseVar
      ? { text: `${seq.caseVar} = ${num(i)}`, cmp: true }
      : { text: X[i]!, cmp: false };
  };
  const ref = (i: number) => refInfo(i).text;
  /** A step reference as an operand of NOT. */
  const notRef = (i: number) => (refInfo(i).cmp ? `NOT (${ref(i)})` : `NOT ${ref(i)}`);

  const fbDecls: Decl[] = [];
  const fbCalls: string[] = [];
  const edges = new Map<string, string>();
  const timers = new Map<string, string>();
  const undeclared = new Map<string, 'BOOL' | 'INT'>();
  const operandName = (node: BoolNode, steps: Map<number, number>): string | null => {
    if (node.type === 'var') return node.name;
    if (node.type === 'step') {
      const idx = steps.get(node.number);
      return idx === undefined ? null : `${gName(p.steps[idx]!.grafcet)}_X${node.number}`;
    }
    return null;
  };
  const target: ExprTarget = {
    step: (i) => ref(i),
    stepIsComparison: (i) => refInfo(i).cmp,
    minimalParentheses: true,
    time: hooks.time,
    boolToInt: hooks.boolToInt,
    edge(rising, operand, node, steps) {
      const key = `${rising}|${operand}`;
      let q = edges.get(key);
      if (!q) {
        const kind = rising ? 'RE' : 'FE';
        const inst = names.take(`${kind}_${operandName(node, steps) ?? edges.size + 1}`);
        fbDecls.push({
          name: inst,
          type: rising ? 'R_TRIG' : 'F_TRIG',
          comment: `${rising ? '↑' : '↓'}${comment(operand)}`,
        });
        const e = hooks.edge(inst, rising, operand);
        fbCalls.push(...e.call);
        q = e.q;
        edges.set(key, q);
      }
      return q;
    },
    timer(t1, t2, operand, node, steps) {
      const key = `${t1}|${t2 ?? ''}|${operand}`;
      let q = timers.get(key);
      if (!q) {
        const suffix = operandName(node, steps) ?? String(timers.size + 1);
        const on = names.take(`TON_${suffix}`);
        fbDecls.push({
          name: on,
          type: 'TON',
          comment: `${timeLiteral(t1)} after ${comment(operand)}`,
        });
        const c = hooks.timer(on, 'TON', operand, t1);
        fbCalls.push(...c.call);
        q = c.q;
        if (t2 !== undefined) {
          const off = names.take(`TOF_${suffix}`);
          fbDecls.push({ name: off, type: 'TOF', comment: `held ${timeLiteral(t2)}` });
          const c2 = hooks.timer(off, 'TOF', q, t2);
          fbCalls.push(...c2.call);
          q = c2.q;
        }
        timers.set(key, q);
      }
      return q;
    },
    variable: (name) => p.variables.get(name.toLowerCase()) ?? null,
    undeclared(name) {
      if (!undeclared.has(name)) undeclared.set(name, 'BOOL');
      warn({ code: 'undeclared', params: { name } });
    },
    unknownStep: (n) => warn({ code: 'unknownStep', params: { number: String(n) } }),
  };
  const arithTarget: ExprTarget = {
    ...target,
    undeclared(name) {
      undeclared.set(name, 'INT');
      warn({ code: 'undeclared', params: { name } });
    },
  };
  const bool = (e: { ast: BoolNode; steps: Map<number, number> }, outer = 0) =>
    stBool(e.ast, e.steps, target, outer);

  const varName = (lower: string): string => {
    const v = p.variables.get(lower);
    if (v) return v.name;
    if (!undeclared.has(lower)) undeclared.set(lower, 'BOOL');
    warn({ code: 'undeclared', params: { name: lower } });
    return lower;
  };
  const assignment = (a: CAction): string | null => {
    if (!a.target) return null;
    const v = p.variables.get(a.target);
    const name = varName(a.target);
    if (a.boolValue) return `${name} := ${bool(a.boolValue)};`;
    if (a.arithValue) return `${name} := ${stArith(a.arithValue, arithTarget, 0, v?.type)};`;
    return null;
  };
  /** A stored action as statements: the assignment, inside IF when it has a condition. */
  const stored = (a: CAction, indent: string): string[] => {
    const body = assignment(a);
    if (!body) return [];
    if (!a.condition) return [`${indent}${body}`];
    return [`${indent}IF ${bool(a.condition)} THEN`, `${indent}${TAB}${body}`, `${indent}END_IF;`];
  };
  for (const a of p.actions)
    if (a.step !== null && isMacro(a.step) && a.kind !== 'continuous' && a.kind !== 'forcing')
      warn({ code: 'macroStoredAction', elementId: a.id, params: {} });
  /** Stored actions of a kind that run once (held ones are assigned while their step is active). */
  const actionsOf = (i: number, kind: CAction['kind']) =>
    p.actionsByStep[i]!.filter((a) => a.kind === kind && !held(a));
  const heldOf = (i: number) => p.actionsByStep[i]!.filter(held);
  const heldLines = (i: number, indent: string) =>
    heldOf(i).flatMap((a) => {
      const body = assignment(a);
      return body ? [`${indent}${body}`] : [];
    });
  const forcingText = (a: CAction) =>
    comment(project.grafcets[p.grafcets[a.grafcet]!.id]!.actions[a.id]!.text);
  const orderActive = (a: CAction) => (a.step === null ? 'TRUE' : ref(a.step));

  // ---- (3a) A sequence as a CASE ------------------------------------------------------------------
  const caseLines = (seq: Sequence): string[] => {
    const v = seq.caseVar!;
    const lines = [`CASE ${v} OF`];
    const transitionBody = (ti: number, indent: string): string[] => {
      const t = p.transitions[ti]!;
      const from = t.from[0]!;
      const to = t.to[0]!;
      const out: string[] = [];
      // A transition leading back to its own step keeps it active: no deactivation (rule 5).
      if (from !== to)
        for (const a of actionsOf(from, 'storedOnDeactivation')) out.push(...stored(a, indent));
      out.push(`${indent}${v} := ${num(to)};`);
      if (from !== to)
        for (const a of actionsOf(to, 'storedOnActivation')) out.push(...stored(a, indent));
      return out;
    };
    for (const s of seq.steps) {
      const outs = p.outgoing[s]!;
      const inner = TAB + TAB;
      const holding = heldLines(s, inner);
      if (!outs.length) {
        lines.push(`${TAB}${num(s)}:${TAB}// no transition leaves this step`);
        lines.push(...(holding.length ? holding : [`${inner};`]));
        continue;
      }
      lines.push(`${TAB}${num(s)}:`, ...holding);
      const branches = outs.map((ti) => {
        const r = p.transitions[ti]!.receptivity;
        return { ti, cond: !r ? 'FALSE' : isTrue(r.ast) ? 'TRUE' : bool(r) };
      });
      if (branches.length === 1 && branches[0]!.cond === 'TRUE') {
        lines.push(...transitionBody(branches[0]!.ti, inner));
        continue;
      }
      branches.forEach((b, k) => {
        if (k > 0 && k === branches.length - 1 && b.cond === 'TRUE') lines.push(`${inner}ELSE`);
        else lines.push(`${inner}${k ? 'ELSIF' : 'IF'} ${b.cond} THEN`);
        lines.push(...transitionBody(b.ti, inner + TAB));
      });
      lines.push(`${inner}END_IF;`);
    }
    if (seq.none) lines.push(`${TAB}${NONE}:${TAB}// no active step`, `${TAB}${TAB};`);
    lines.push(`${TAB}ELSE`, `${TAB}${TAB}${seq.errorVar} := TRUE;`, 'END_CASE;');

    // Forcing orders replace the CASE while active; the last order listed wins.
    const orders = ordersOn(seq).reverse();
    if (!orders.length) return lines;
    const out: string[] = [];
    orders.forEach((a, k) => {
      out.push(`${k ? 'ELSIF' : 'IF'} ${orderActive(a)} THEN${TAB}// ${forcingText(a)}`);
      if (a.forcing!.mode === 'freeze') {
        out.push(`${TAB};${TAB}// frozen`);
        return;
      }
      const steps = forcedIn(seq, a);
      if (steps.length > 1)
        warn({
          code: 'forcingSteps',
          params: { order: forcingText(a), step: String(num(steps[0]!)) },
        });
      out.push(`${TAB}${v} := ${steps.length ? num(steps[0]!) : NONE};`);
    });
    out.push('ELSE', ...lines.map((l) => TAB + l), 'END_IF;');
    return out;
  };

  // ---- (3b) A sequence with one BOOL per step -------------------------------------------------
  const incoming = p.steps.map(() => [] as number[]);
  for (const t of p.transitions) for (const s of t.to) incoming[s]!.push(t.idx);
  const flagLines = (seq: Sequence): string[] => {
    const lines: string[] = [];
    const orders = ordersOn(seq);
    const single = orders.length === 1 ? orders[0]!.step : null;
    const notForced = !orders.length
      ? ''
      : single !== null
        ? notRef(single)
        : `NOT (${orders.map(orderActive).join(' OR ')})`;
    const nums = (xs: number[]) => xs.map(num).join(', ') || '–';
    for (const ti of seq.transitions) {
      const t = p.transitions[ti]!;
      const parts = t.from.map((s) => ref(s));
      if (!t.receptivity) parts.push('FALSE');
      else if (!isTrue(t.receptivity.ast)) parts.push(bool(t.receptivity, AND_OPERAND));
      if (t.guard !== undefined) parts.push(ref(t.guard));
      if (notForced) parts.push(notForced);
      lines.push(
        `${T[ti]} := ${parts.join(' AND ') || 'TRUE'};${TAB}// ${nums(t.from)} → ${nums(t.to)}`,
      );
    }
    for (const s of seq.steps) {
      const outs = p.outgoing[s]!.map((ti) => T[ti]!);
      const ins = incoming[s]!.map((ti) => T[ti]!);
      let e = outs.length
        ? `${X[s]} AND NOT ${outs.length > 1 ? `(${outs.join(' OR ')})` : outs[0]}`
        : X[s]!;
      if (ins.length)
        e = outs.length ? `(${e}) OR ${ins.join(' OR ')}` : `${e} OR ${ins.join(' OR ')}`;
      const enc = enclosingOf.get(s);
      if (enc !== undefined) {
        e = `(${e}) AND ${ref(enc)}`;
        if (p.enclosures.get(enc)!.initial.includes(s))
          e = `${e} OR (${ref(enc)} AND NOT ${M[enc]})`;
      }
      if (e !== X[s]) lines.push(`${X[s]} := ${e};`);
    }
    for (const a of orders) {
      if (a.forcing!.mode === 'freeze') {
        lines.push(`// ${forcingText(a)}: frozen while ${orderActive(a)}`);
        continue;
      }
      const active = new Set(forcedIn(seq, a));
      lines.push(`IF ${orderActive(a)} THEN${TAB}// ${forcingText(a)}`);
      for (const s of seq.steps)
        if (p.steps[s]!.grafcet === a.forcing!.target)
          lines.push(`${TAB}${X[s]} := ${active.has(s) ? 'TRUE' : 'FALSE'};`);
      lines.push('END_IF;');
    }
    for (const s of seq.steps) {
      const holding = heldLines(s, TAB);
      if (holding.length) lines.push(`IF ${X[s]} THEN`, ...holding, 'END_IF;');
      if (M[s] === undefined) continue;
      for (const [kind, when] of [
        ['storedOnDeactivation', `NOT ${X[s]} AND ${M[s]}`],
        ['storedOnActivation', `${X[s]} AND NOT ${M[s]}`],
      ] as const) {
        const list = actionsOf(s, kind);
        if (!list.length) continue;
        lines.push(`IF ${when} THEN`, ...list.flatMap((a) => stored(a, TAB)), 'END_IF;');
      }
    }
    return lines;
  };

  // ---- Body ------------------------------------------------------------------------------------
  const depth = (gi: number): number => {
    const first = p.grafcets[gi]!.steps[0];
    const enc = first === undefined ? undefined : enclosingOf.get(first);
    return enc === undefined ? 0 : depth(p.steps[enc]!.grafcet) + 1;
  };
  const order = [...sequences].sort(
    (a, b) =>
      p.grafcets[a.grafcet]!.level - p.grafcets[b.grafcet]!.level ||
      depth(a.grafcet) - depth(b.grafcet) ||
      a.grafcet - b.grafcet ||
      num(a.steps[0]!) - num(b.steps[0]!),
  );
  const blocks: [string, string[]][] = order.map((seq) => {
    const g = gName(seq.grafcet);
    const title = seq.caseVar
      ? perGrafcet.get(seq.grafcet)! > 1
        ? `${g}, sequence of step ${num(seq.initial[0] ?? seq.steps[0]!)}`
        : g
      : `${g}: one BOOL per step`;
    return [title, seq.caseVar ? caseLines(seq) : flagLines(seq)];
  });

  // (2) First scan: the initial steps of the CASE sequences become active, and actions without a
  // step that run "on activation" run once.
  const firstScan: string[] = [];
  for (const seq of sequences)
    if (seq.caseVar && seq.initial[0] !== undefined)
      for (const a of actionsOf(seq.initial[0], 'storedOnActivation'))
        firstScan.push(...stored(a, TAB));
  for (const a of p.alwaysActions)
    if (a.kind === 'storedOnActivation') firstScan.push(...stored(a, TAB));
  const initName = firstScan.length ? names.take('Init') : '';

  // (4) Actions on events.
  const events: string[] = [];
  for (const a of p.actions) {
    if (a.kind !== 'storedOnEvent' || !a.condition || (a.step !== null && isMacro(a.step)))
      continue;
    const body = assignment(a);
    if (!body) continue;
    const cond =
      a.step === null ? bool(a.condition) : `${ref(a.step)} AND ${bool(a.condition, AND_OPERAND)}`;
    events.push(`IF ${cond} THEN`, `${TAB}${body}`, 'END_IF;');
  }

  // (5) Outputs: every variable driven by continuous actions, from the steps that drive it.
  const outputs = new Map<string, { sets: Map<Sequence, number[]>; terms: string[] }>();
  for (const a of p.actions) {
    if (a.kind !== 'continuous' || !a.target) continue;
    const o = outputs.get(a.target) ?? {
      sets: new Map<Sequence, number[]>(),
      terms: [] as string[],
    };
    outputs.set(a.target, o);
    const cond = a.condition && bool(a.condition, a.step === null ? 0 : AND_OPERAND);
    // The steps that drive it: a macro-step stands for the steps of its expansion.
    const steps = a.step === null ? [] : isMacro(a.step) ? realMembers(a.step) : [a.step];
    const seq = steps.length ? seqOf.get(steps[0]!) : undefined;
    if (a.step === null) o.terms.push(cond || 'TRUE');
    else if (cond) o.terms.push(`${ref(a.step)} AND ${cond}`);
    else if (seq?.caseVar && steps.every((s) => seqOf.get(s) === seq))
      o.sets.set(seq, [...(o.sets.get(seq) ?? []), ...steps.map(num)]);
    else o.terms.push(ref(a.step));
  }
  const outputLines = [...outputs].map(([lower, o]) => {
    const terms = [
      ...[...o.sets].flatMap(([seq, list]) => stepSet(seq.caseVar!, list)),
      ...o.terms,
    ];
    return `${varName(lower)} := ${anyOf(terms)};`;
  });

  const memories = M.flatMap((m, i) => (m ? [`${m} := ${ref(i)};`] : []));

  const body: string[] = [];
  const section = (title: string, lines: string[]) => {
    if (lines.length) body.push('', `// ${title}`, ...lines);
  };
  section('Timers and edges', fbCalls);
  if (initName)
    section('First scan: actions on activation of the initial steps', [
      `IF ${initName} THEN`,
      ...firstScan,
      'END_IF;',
    ]);
  for (const [title, lines] of blocks) section(title, lines);
  section('Actions on events', events);
  section('Outputs', outputLines);
  section('Step activity of this scan, for the next one', memories);
  if (initName) body.push('', `${initName} := FALSE;`);

  // ---- Declarations ----------------------------------------------------------------------------
  const declare = (v: Variable): Decl => {
    const notes = [v.address, v.comment].filter(Boolean).join(' · ');
    return {
      name: v.name,
      type: v.type,
      ...(v.initialValue !== undefined ? { init: v.initialValue } : {}),
      ...(notes ? { comment: comment(notes) } : {}),
    };
  };
  const byDir = (d: Variable['direction']) =>
    userVars
      .filter((v) => v.direction === d)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
      .map(declare);
  const state: Decl[] = [];
  for (const seq of order) {
    if (!seq.caseVar) continue;
    const g = gName(seq.grafcet);
    const start = seq.initial[0] === undefined ? NONE : num(seq.initial[0]);
    state.push(
      {
        name: seq.caseVar,
        type: 'INT',
        init: start,
        comment: `${g}: number of the active step${seq.none ? ` (${NONE}: none)` : ''}`,
      },
      { name: seq.errorVar!, type: 'BOOL', comment: `${seq.caseVar} holds no step of ${g}` },
    );
  }
  if (initName) state.push({ name: initName, type: 'BOOL', init: true, comment: 'first scan' });
  for (const seq of order) {
    if (seq.caseVar) continue;
    for (const s of seq.steps)
      state.push({
        name: X[s]!,
        type: 'BOOL',
        ...(p.steps[s]!.initial ? { init: true } : {}),
        comment: `${gName(p.steps[s]!.grafcet)} step ${num(s)}`,
      });
    for (const ti of seq.transitions) state.push({ name: T[ti]!, type: 'BOOL' });
  }
  M.forEach((m, i) => {
    if (m)
      state.push({ name: m, type: 'BOOL', comment: `step ${num(i)} active in the previous scan` });
  });
  state.push(...fbDecls);

  const flags = sequences.some((s) => !s.caseVar);
  const cases = sequences.some((s) => s.caseVar);
  const holds = p.actions.some(held);
  const when = opts.date.toISOString().slice(0, 16).replace('T', ' ');
  const header = [
    `  ${comment(project.name)}: Structured Text generated by GrafcetMaker ${opts.version}`,
    '  generated – review before use',
    `  ${when} UTC · revision ${comment(project.meta.revision || '–')}${project.meta.author ? ` · ${comment(project.meta.author)}` : ''}`,
    '',
    ...(cases
      ? [
          '  Execution: one INT variable per sequence holds the number of its active step. Its CASE runs',
          '  the transitions of that step only, so a sequence clears at most one transition per scan and,',
          '  of alternative branches, the first true receptivity (left to right) wins. Stored actions run',
          '  in the transition that activates or deactivates their step; an active forcing order replaces',
          '  the CASE of the grafcet it forces.',
        ]
      : []),
    ...(flags
      ? [
          `  ${cases ? 'Sequences with parallel branches keep' : 'Execution:'} one BOOL per step, X := (X AND NOT out) OR in,`,
          '  with every transition computed from the situation at the start of the scan.',
        ]
      : []),
    ...(holds
      ? [
          '  Stored actions that assign a constant (Q := 1) are assigned in every scan while their step',
          '  is active, those on deactivation too unless the step sets the same variable on activation.',
        ]
      : []),
    `  Timers and edges are updated at the start of the scan. ${CALL_CYCLICALLY}`,
  ];
  const code = renderModule(
    {
      name: fbName,
      header,
      blocks: [
        { kind: 'input', decls: byDir('input') },
        { kind: 'output', decls: byDir('output') },
        {
          kind: 'local',
          decls: [
            ...byDir('internal'),
            ...[...undeclared].map(([n, ty]) => ({
              name: n,
              type: ty,
              comment: 'not declared in the project',
            })),
          ],
        },
        { kind: 'local', title: 'GRAFCET state', decls: state },
      ],
      body,
      indent: TAB,
      comments: 'line',
    },
    opts.dialect ?? 'iec',
    project.id,
  );
  return { code, warnings };
}
