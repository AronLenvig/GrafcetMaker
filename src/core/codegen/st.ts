/**
 * IEC 61131-3 Structured Text from a project: one function block running every grafcet.
 *
 * Each scan: (1) forcing orders active at the start of the scan, (2) every transition from the
 * situation at the start of the scan (enabled ∧ receptivity — rules 2 and 4), (3) every step,
 * `X := (X AND NOT Tout) OR Tin` (rules 3 and 5), (4) forcing, (5) timer and edge function
 * blocks, (6) stored actions from the change of each step since the previous scan, (7) continuous
 * actions. One clearing level per scan; `stabilityLoop` repeats (2)–(6) within the scan instead.
 */
import { compile, type CAction } from '../simulation/program';
import type { Project, Variable } from '../model/types';
import {
  comment,
  initialLiteral,
  NameTable,
  ST_KEYWORDS,
  stArith,
  stBool,
  timeLiteral,
  type CodegenOptions,
  type CodegenResult,
  type CodegenWarning,
  type ExprTarget,
} from './common';

export interface StOptions extends CodegenOptions {
  /** Repeat clearing within one scan until the situation is stable (IEC 60848 search for stability). */
  stabilityLoop?: boolean;
}

export const MAX_ITERATIONS = 1000;

const or = (xs: string[]) => (xs.length > 1 ? `(${xs.join(' OR ')})` : xs[0]!);

export function generateSt(project: Project, opts: StOptions): CodegenResult {
  const p = compile(project);
  const loop = !!opts.stabilityLoop;
  const warnings: CodegenWarning[] = [];
  const seen = new Set<string>();
  const warn = (w: CodegenWarning) => {
    const key = `${w.code}|${w.elementId ?? ''}|${JSON.stringify(w.params)}`;
    if (!seen.has(key)) {
      seen.add(key);
      warnings.push(w);
    }
  };
  for (const prob of p.problems)
    warn({ code: 'expression', elementId: prob.elementId, params: {} });

  const userVars = [...p.variables.values()];
  for (const v of userVars)
    if (ST_KEYWORDS.has(v.name.toUpperCase())) warn({ code: 'keyword', params: { name: v.name } });
  const names = new NameTable(userVars.map((v) => v.name));
  const fbName = names.take(`FB_${project.name}`);
  const initName = names.take('Init');

  // ---- Generated names -----------------------------------------------------------------------
  const gName = (gi: number) => p.grafcets[gi]!.name;
  const X = p.steps.map((s) => names.take(`${gName(s.grafcet)}_X${s.number}`));
  const T: string[] = [];
  const transitionOrder: number[] = [];
  for (const g of p.grafcets) {
    const src = project.grafcets[g.id]!;
    const ordered = [...g.transitions].sort((a, b) => {
      const pa = src.transitions[p.transitions[a]!.id]!.position;
      const pb = src.transitions[p.transitions[b]!.id]!.position;
      return pa.y - pb.y || pa.x - pb.x;
    });
    ordered.forEach((ti, k) => {
      const num = src.transitions[p.transitions[ti]!.id]!.number ?? k + 1;
      T[ti] = names.take(`${g.name}_T${num}`);
      transitionOrder.push(ti);
    });
  }
  const isMacro = (i: number) => p.macros.has(i);
  const storedKinds = new Set(['storedOnActivation', 'storedOnDeactivation']);
  const enclosingOf = new Map<number, number>();
  for (const [enc, e] of p.enclosures) for (const m of e.members) enclosingOf.set(m, enc);
  const needsMemory = p.steps.map(
    (s) =>
      !isMacro(s.idx) &&
      (p.enclosures.has(s.idx) || p.actionsByStep[s.idx]!.some((a) => storedKinds.has(a.kind))),
  );
  const M = p.steps.map((_, i) => (needsMemory[i] ? names.take(`${X[i]}_M`) : ''));

  // ---- Expressions ---------------------------------------------------------------------------
  const fbDecls: string[] = [];
  const fbCalls: string[] = [];
  const edges = new Map<string, string>();
  const timers = new Map<string, string>();
  const undeclared = new Map<string, 'BOOL' | 'INT'>();
  let firstOnly = false;
  const iterName = loop ? names.take('Iter') : '';
  const target: ExprTarget = {
    step: (i) => X[i]!,
    edge(rising, operand) {
      const key = `${rising}|${operand}`;
      let inst = edges.get(key);
      if (!inst) {
        inst = names.take(
          `${rising ? 'RE' : 'FE'}_${[...edges.keys()].filter((k) => k.startsWith(`${rising}|`)).length + 1}`,
        );
        edges.set(key, inst);
        fbDecls.push(
          `    ${inst} : ${rising ? 'R_TRIG' : 'F_TRIG'};   (* ${rising ? '↑' : '↓'}${comment(operand)} *)`,
        );
        fbCalls.push(`${inst}(CLK := ${operand});`);
      }
      // Edges are seen in the first iteration of the scan only (IEC 60848).
      return firstOnly ? `(${inst}.Q AND ${iterName} = 0)` : `${inst}.Q`;
    },
    timer(t1, t2, operand) {
      const key = `${t1}|${t2 ?? ''}|${operand}`;
      let q = timers.get(key);
      if (!q) {
        const k = timers.size + 1;
        const on = names.take(`TON_${k}`);
        fbDecls.push(`    ${on} : TON;   (* ${timeLiteral(t1)} after ${comment(operand)} *)`);
        fbCalls.push(`${on}(IN := ${operand}, PT := ${timeLiteral(t1)});`);
        q = `${on}.Q`;
        if (t2 !== undefined) {
          const off = names.take(`TOF_${k}`);
          fbDecls.push(`    ${off} : TOF;   (* held ${timeLiteral(t2)} *)`);
          fbCalls.push(`${off}(IN := ${on}.Q, PT := ${timeLiteral(t2)});`);
          q = `${off}.Q`;
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

  const varName = (lower: string): string => {
    const v = p.variables.get(lower);
    if (v) return v.name;
    const original = lower;
    if (!undeclared.has(original)) undeclared.set(original, 'BOOL');
    warn({ code: 'undeclared', params: { name: original } });
    return original;
  };

  // ---- (1) Forcing orders active at the start of the scan -------------------------------------
  const forcingActions = p.actions.filter((a) => a.forcing);
  const forceFlag = new Map<CAction, string>();
  const forcedBy = new Map<number, string[]>();
  for (const a of forcingActions) {
    const flag = names.take(`${gName(a.grafcet)}_F${forceFlag.size + 1}`);
    forceFlag.set(a, flag);
    forcedBy.set(a.forcing!.target, [...(forcedBy.get(a.forcing!.target) ?? []), flag]);
  }
  const forcedName = new Map<number, string>();
  for (const gi of forcedBy.keys()) forcedName.set(gi, names.take(`${gName(gi)}_Forced`));
  const forcingLines: string[] = [];
  for (const a of forcingActions) {
    const src = project.grafcets[p.grafcets[a.grafcet]!.id]!.actions[a.id]!.text;
    // Without a step, the order is always in force.
    const on = a.step === null ? 'TRUE' : X[a.step];
    forcingLines.push(`${forceFlag.get(a)} := ${on};   (* ${comment(src)} *)`);
  }
  for (const [gi, flags] of forcedBy)
    forcingLines.push(`${forcedName.get(gi)} := ${flags.join(' OR ')};`);

  // ---- (2) Transitions -----------------------------------------------------------------------
  const transitionLines = (): string[] =>
    transitionOrder.map((ti) => {
      const t = p.transitions[ti]!;
      const src = project.grafcets[p.grafcets[t.grafcet]!.id]!.transitions[t.id]!;
      const parts = t.from.map((s) => X[s]!);
      if (!t.receptivity) parts.push('FALSE');
      else if (!(t.receptivity.ast.type === 'const' && t.receptivity.ast.value))
        parts.push(stBool(t.receptivity.ast, t.receptivity.steps, target, 2));
      if (t.guard !== undefined) parts.push(X[t.guard]!);
      const forced = forcedName.get(t.grafcet);
      if (forced) parts.push(`NOT ${forced}`);
      const nums = (xs: number[]) => xs.map((s) => p.steps[s]!.number).join(', ') || '–';
      return `${T[ti]} := ${parts.join(' AND ') || 'TRUE'};   (* ${nums(t.from)} → ${nums(t.to)}: ${comment(src.receptivity)} *)`;
    });

  // ---- (3) Steps ---------------------------------------------------------------------------------
  const incoming = p.steps.map(() => [] as number[]);
  for (const t of p.transitions) for (const s of t.to) incoming[s]!.push(t.idx);
  const depth = (gi: number): number => {
    const first = p.grafcets[gi]!.steps[0];
    const enc = first === undefined ? undefined : enclosingOf.get(first);
    return enc === undefined ? 0 : depth(p.steps[enc]!.grafcet) + 1;
  };
  // Enclosing steps are updated before the grafcets they enclose.
  const stepOrder = p.steps
    .filter((s) => !isMacro(s.idx))
    .sort(
      (a, b) => depth(a.grafcet) - depth(b.grafcet) || a.grafcet - b.grafcet || a.number - b.number,
    )
    .map((s) => s.idx);
  const nextName = loop ? names.take('Next') : '';
  const changedName = loop ? names.take('Changed') : '';
  const stepLines = (): string[] => {
    const out: string[] = [];
    for (const i of stepOrder) {
      const s = p.steps[i]!;
      const outs = p.outgoing[i]!.map((ti) => T[ti]!);
      const ins = incoming[i]!.map((ti) => T[ti]!);
      if (s.initial && !loop) ins.push(initName);
      let e = outs.length ? `${X[i]} AND NOT ${or(outs)}` : X[i]!;
      if (ins.length)
        e = outs.length ? `(${e}) OR ${ins.join(' OR ')}` : `${e} OR ${ins.join(' OR ')}`;
      const enc = enclosingOf.get(i);
      if (enc !== undefined) {
        e = `(${e}) AND ${X[enc]}`;
        if (p.enclosures.get(enc)!.initial.includes(i)) e = `${e} OR (${X[enc]} AND NOT ${M[enc]})`;
      }
      if (e === X[i]) continue;
      const label = `${gName(s.grafcet)} step ${s.number}`;
      if (loop) {
        out.push(`${nextName} := ${e};   (* ${label} *)`);
        out.push(`${changedName} := ${changedName} OR (${nextName} <> ${X[i]});`);
        out.push(`${X[i]} := ${nextName};`);
      } else out.push(`${X[i]} := ${e};   (* ${label} *)`);
    }
    return out;
  };

  // Macro-steps are active while any step of their expansion is.
  const realMembers = (i: number): number[] =>
    p.macros.get(i)!.members.flatMap((m) => (isMacro(m) ? realMembers(m) : [m]));
  const macroLines = [...p.macros.keys()].map(
    (i) =>
      `${X[i]} := ${
        realMembers(i)
          .map((m) => X[m])
          .join(' OR ') || 'FALSE'
      };   (* macro-step ${p.steps[i]!.number} *)`,
  );

  // ---- (4) Forcing ---------------------------------------------------------------------------
  const applyForcing: string[] = [];
  for (const a of forcingActions) {
    const f = a.forcing!;
    if (f.mode === 'freeze') {
      applyForcing.push(
        `(* ${forceFlag.get(a)}: ${gName(f.target)} frozen (its transitions are disabled) *)`,
      );
      continue;
    }
    const g = p.grafcets[f.target]!;
    const active = new Set(f.mode === 'init' ? g.initial : f.steps);
    applyForcing.push(`IF ${forceFlag.get(a)} THEN`);
    for (const i of g.steps)
      if (!isMacro(i)) applyForcing.push(`    ${X[i]} := ${active.has(i) ? 'TRUE' : 'FALSE'};`);
    applyForcing.push('END_IF;');
  }

  // ---- (6) Stored actions --------------------------------------------------------------------
  const sourceText = (a: CAction) => project.grafcets[p.grafcets[a.grafcet]!.id]!.actions[a.id]!;
  /** Where an action is, for comments. */
  const placeOf = (a: CAction) =>
    a.step === null
      ? `${gName(a.grafcet)}, no step (always active)`
      : `${gName(a.grafcet)} step ${p.steps[a.step]!.number}`;
  /** Actions without a step run "on activation" once, in the first scan. */
  const firstScan = loop ? `${initName} AND ${iterName} = 0` : initName;
  const assignment = (a: CAction): string | null => {
    if (!a.target) return null;
    const v = p.variables.get(a.target);
    const name = varName(a.target);
    if (a.boolValue) return `${name} := ${stBool(a.boolValue.ast, a.boolValue.steps, target)};`;
    if (a.arithValue) return `${name} := ${stArith(a.arithValue.ast, arithTarget, 0, v?.type)};`;
    return null;
  };
  const storedLines = (): string[] => {
    const out: string[] = [];
    const emit = (kind: CAction['kind'], when: (i: number) => string, label: string) => {
      for (const a of p.actions) {
        if (a.kind !== kind) continue;
        if (a.step !== null && isMacro(a.step)) {
          warn({ code: 'macroStoredAction', elementId: a.id, params: {} });
          continue;
        }
        // An always-active action is never deactivated.
        if (a.step === null && kind === 'storedOnDeactivation') continue;
        const body = assignment(a);
        if (!body) continue;
        const parts = [a.step === null ? firstScan : when(a.step)];
        if (a.condition) parts.push(stBool(a.condition.ast, a.condition.steps, target, 2));
        out.push(
          `IF ${parts.join(' AND ')} THEN   (* ${placeOf(a)}, ${label}: ${comment(sourceText(a).text)} *)`,
        );
        out.push(`    ${body}`);
        out.push('END_IF;');
      }
    };
    emit('storedOnDeactivation', (i) => `NOT ${X[i]} AND ${M[i]}`, 'on deactivation');
    emit('storedOnActivation', (i) => `${X[i]} AND NOT ${M[i]}`, 'on activation');
    for (const a of p.actions) {
      if (a.kind !== 'storedOnEvent' || (a.step !== null && isMacro(a.step)) || !a.condition)
        continue;
      const body = assignment(a);
      if (!body) continue;
      const event = stBool(a.condition.ast, a.condition.steps, target, 2);
      out.push(
        `IF ${a.step === null ? event : `${X[a.step]} AND ${event}`} THEN   (* ${placeOf(a)}, on event: ${comment(sourceText(a).text)} *)`,
      );
      out.push(`    ${body}`);
      out.push('END_IF;');
    }
    for (const i of p.steps.keys()) if (needsMemory[i]) out.push(`${M[i]} := ${X[i]};`);
    return out;
  };

  // ---- (7) Continuous actions ----------------------------------------------------------------
  const continuousLines = (): string[] => {
    const continuous = new Map<string, string[]>();
    for (const a of p.actions) {
      if (a.kind !== 'continuous' || !a.target) continue;
      // Without a step the action is always active: its condition alone (or TRUE).
      const cond =
        a.condition && stBool(a.condition.ast, a.condition.steps, target, a.step === null ? 1 : 3);
      const term =
        a.step === null ? (cond ?? 'TRUE') : cond ? `${X[a.step]} AND ${cond}` : X[a.step]!;
      continuous.set(a.target, [...(continuous.get(a.target) ?? []), term]);
    }
    return [...continuous].map(([lower, terms]) => `${varName(lower)} := ${terms.join(' OR ')};`);
  };

  // ---- Body ----------------------------------------------------------------------------------
  // Every expression is translated first: it creates the timer and edge instances to call.
  firstOnly = loop;
  const transitionsCode = transitionLines();
  const stepsCode = stepLines();
  const storedCode = storedLines();
  firstOnly = false;
  const continuousCode = continuousLines();

  const body: string[] = [];
  const section = (title: string, lines: string[], indent = '') => {
    if (!lines.length) return;
    body.push('', `${indent}(* ${title} *)`, ...lines.map((l) => `${indent}${l}`));
  };
  const stepsTitle = 'Steps: activated by an incoming transition, deactivated by an outgoing one';
  section('Forcing orders of the steps active at the start of the scan', forcingLines);
  const unstableName = loop ? names.take('Unstable') : '';
  if (loop) {
    const initial = p.steps.filter((s) => s.initial).map((s) => `    ${X[s.idx]} := TRUE;`);
    if (initial.length)
      section('Initial situation', [`IF ${initName} THEN`, ...initial, 'END_IF;']);
    body.push(
      '',
      '(* Search for stability: clear transitions until the situation no longer changes *)',
    );
    body.push(`${iterName} := 0;`, 'REPEAT', `    ${changedName} := FALSE;`);
    section('Transitions: enabled and receptivity true', transitionsCode, '    ');
    section(stepsTitle, stepsCode, '    ');
    section('Macro-steps', macroLines, '    ');
    section('Stored actions', storedCode, '    ');
    body.push(`    ${iterName} := ${iterName} + 1;`);
    body.push(`UNTIL NOT ${changedName} OR ${iterName} >= ${MAX_ITERATIONS}`, 'END_REPEAT;');
    body.push(
      `${unstableName} := ${changedName};   (* TRUE: the evolution did not become stable *)`,
    );
    section('Forcing', applyForcing);
    if (applyForcing.length) section('Macro-steps after forcing', macroLines);
    section('Timers and edges', fbCalls);
  } else {
    section(
      'Transitions: enabled and receptivity true (all from the situation at the start of the scan)',
      transitionsCode,
    );
    section(stepsTitle, stepsCode);
    section('Forcing', applyForcing);
    section('Macro-steps', macroLines);
    section('Timers and edges (seen by the transitions of the next scan)', fbCalls);
    section('Stored actions', storedCode);
  }
  section('Continuous actions', continuousCode);
  body.push('', `${initName} := FALSE;`);

  // ---- Declarations --------------------------------------------------------------------------
  const declare = (v: Variable) => {
    const notes = [v.address, v.comment].filter(Boolean).join(' · ');
    const init = v.initialValue !== undefined ? ` := ${initialLiteral(v)}` : '';
    return `    ${v.name} : ${v.type}${init};${notes ? `   (* ${comment(notes)} *)` : ''}`;
  };
  const byDir = (d: Variable['direction']) =>
    userVars
      .filter((v) => v.direction === d)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
      .map(declare);
  const decls: string[] = [];
  const block = (head: string, lines: string[]) => {
    if (lines.length) decls.push(head, ...lines, 'END_VAR');
  };
  block('VAR_INPUT', byDir('input'));
  block('VAR_OUTPUT', byDir('output'));
  block('VAR', [
    ...byDir('internal'),
    ...[...undeclared].map(([n, ty]) => `    ${n} : ${ty};   (* not declared in the project *)`),
  ]);
  const state: string[] = [`    ${initName} : BOOL := TRUE;   (* first scan *)`];
  if (loop)
    state.push(
      `    ${iterName} : INT;`,
      `    ${changedName} : BOOL;`,
      `    ${nextName} : BOOL;`,
      `    ${unstableName} : BOOL;   (* the last search for stability hit ${MAX_ITERATIONS} iterations *)`,
    );
  for (const s of p.steps) {
    const kind = s.initial
      ? ', initial'
      : isMacro(s.idx)
        ? ', macro-step'
        : p.enclosures.has(s.idx)
          ? ', enclosing'
          : '';
    state.push(`    ${X[s.idx]} : BOOL;   (* ${gName(s.grafcet)} step ${s.number}${kind} *)`);
    if (needsMemory[s.idx])
      state.push(`    ${M[s.idx]} : BOOL;   (* activity at the previous scan *)`);
  }
  for (const ti of transitionOrder) state.push(`    ${T[ti]} : BOOL;`);
  for (const f of forceFlag.values()) state.push(`    ${f} : BOOL;`);
  for (const f of forcedName.values()) state.push(`    ${f} : BOOL;`);
  state.push(...fbDecls);
  block('VAR (* GRAFCET state *)', state);

  const when = opts.date.toISOString().slice(0, 16).replace('T', ' ');
  const header = [
    '(*',
    `  ${comment(project.name)}: Structured Text generated by GrafcetMaker ${opts.version}`,
    '  generated – review before use',
    `  ${when} UTC · revision ${comment(project.meta.revision || '–')}${project.meta.author ? ` · ${comment(project.meta.author)}` : ''}`,
    '',
    loop
      ? '  Execution: within each scan, transitions are cleared repeatedly until the situation is stable'
      : '  Execution: one clearing level per scan. A sequence of transitions that are all true is crossed',
    loop
      ? `  (at most ${MAX_ITERATIONS} iterations, see Unstable). Edges are true in the first iteration only.`
      : '  one transition per scan (IEC 60848 crosses them in one evolution). Edges and timers are',
    loop ? '' : '  updated at the end of the scan and seen by the transitions of the next scan.',
    '  Stored actions run when a step changes between two scans; forcing orders take effect in the',
    '  scan after their step becomes active. Call this function block cyclically.',
    '*)',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
  const code = [
    ...header,
    `FUNCTION_BLOCK ${fbName}`,
    ...decls,
    ...body,
    '',
    'END_FUNCTION_BLOCK',
    '',
  ].join('\n');
  return { code, warnings };
}
