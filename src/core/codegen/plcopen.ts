/**
 * PLCopen TC6 XML (v2.01): one SFC program per partial grafcet (macro-steps inlined), the variables
 * as globals of one resource, and a Structured Text program `GRAFCET_Signals` that computes the
 * edges and timers SFC conditions cannot call themselves. Qualifiers: continuous → N (D / L for
 * delayed / time-limited conditions), on activation → P1 (S / R for constant BOOL), on
 * deactivation → P0, on event → N with an IF. Upward links become jumps.
 */
import { autoLayout } from '../layout/autoLayout';
import type { BoolNode } from '../expr/ast';
import type { Grafcet, Id, Point, Project, Step, Transition, Variable } from '../model/types';
import { compile, type CAction, type Program } from '../simulation/program';
import {
  initialLiteral,
  NameTable,
  cdata,
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

export interface PlcOpenOptions extends CodegenOptions {
  /** Cycle time of the task running the programs, in ms. */
  taskInterval?: number;
}

const esc = (s: string) =>
  s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
const st = (code: string) => `<ST><xhtml:p>${cdata(code)}</xhtml:p></ST>`;
const typeXml = (t: string) =>
  ['BOOL', 'INT', 'REAL', 'TIME'].includes(t) ? `<${t}/>` : `<derived name="${esc(t)}"/>`;

interface Global {
  name: string;
  type: string;
  address?: string;
  initial?: string;
  doc?: string;
}

function variableXml(g: Global, indent: string): string {
  const attrs = `name="${esc(g.name)}"${g.address ? ` address="${esc(g.address)}"` : ''}`;
  const parts = [`${indent}<variable ${attrs}>`, `${indent}  <type>${typeXml(g.type)}</type>`];
  if (g.initial)
    parts.push(`${indent}  <initialValue><simpleValue value="${esc(g.initial)}"/></initialValue>`);
  if (g.doc)
    parts.push(`${indent}  <documentation><xhtml:p>${cdata(g.doc)}</xhtml:p></documentation>`);
  parts.push(`${indent}</variable>`);
  return parts.join('\n');
}

/** Grafcets whose steps make up the SFC of `root`: itself and, recursively, its macro expansions. */
function pouGrafcets(p: Program, root: number): number[] {
  const out = [root];
  for (const s of p.grafcets[root]!.steps) {
    const m = p.macros.get(s);
    if (!m) continue;
    const child = p.steps[m.entry]!.grafcet;
    if (!out.includes(child)) out.push(...pouGrafcets(p, child));
  }
  return out;
}

export function generatePlcOpen(project: Project, opts: PlcOpenOptions): CodegenResult {
  const p = compile(project);
  const { warnings, warn } = warningCollector();
  for (const prob of p.problems)
    warn({ code: 'expression', elementId: prob.elementId, params: {} });
  const userVars = [...p.variables.values()];
  warnKeywords(userVars, warn);

  const names = new NameTable([...userVars.map((v) => v.name), ...p.grafcets.map((g) => g.name)]);
  const isMacro = (i: number) => p.macros.has(i);
  const stepName = p.steps.map((s) => names.take(`${p.grafcets[s.grafcet]!.name}_X${s.number}`));

  // POUs: partial and enclosed grafcets; expansions are inlined into the POU of their macro-step.
  const roots = p.grafcets
    .filter((g) => project.grafcets[g.id]!.kind !== 'macroExpansion')
    .map((g) => g.idx);
  const pouOf = new Map<number, number>();
  for (const r of roots) for (const gi of pouGrafcets(p, r)) if (!pouOf.has(gi)) pouOf.set(gi, r);
  const stepPou = (i: number) => pouOf.get(p.steps[i]!.grafcet);
  for (const r of roots)
    if (project.grafcets[p.grafcets[r]!.id]!.kind === 'enclosed')
      warn({
        code: 'enclosed',
        elementId: p.grafcets[r]!.id,
        params: { grafcet: p.grafcets[r]!.name },
      });

  // Globals: user variables, step mirrors (steps read from another POU), signals (edges, timers).
  const globals: Global[] = userVars.map((v: Variable) => ({
    name: v.name,
    type: v.type,
    address: v.address,
    initial: v.initialValue !== undefined ? initialLiteral(v) : undefined,
    doc: v.comment,
  }));
  const undeclared = new Set<string>();
  const mirror = new Map<number, string>();
  const mirrorOf = (i: number) => {
    let m = mirror.get(i);
    if (!m) {
      m = names.take(`${stepName[i]}_Active`);
      warn({
        code: 'stepSignal',
        elementId: p.steps[i]!.id,
        params: { step: stepName[i]!, mirror: m },
      });
      mirror.set(i, m);
      globals.push({
        name: m,
        type: 'BOOL',
        doc: `Activity of step ${stepName[i]} (set by an N action)`,
      });
    }
    return m;
  };
  const realMembers = (i: number) => macroSteps(p, i);
  const activity = (i: number, pou: number | undefined, inPou: (j: number) => string) =>
    isMacro(i)
      ? `(${realMembers(i)
          .map((m) => (stepPou(m) === pou ? inPou(m) : mirrorOf(m)))
          .join(' OR ')})`
      : stepPou(i) === pou
        ? inPou(i)
        : mirrorOf(i);

  const helperDecls: Global[] = [];
  const helperBody: string[] = [];
  const signals = new Map<string, string>();
  const signal = (key: string, make: (q: string) => string[], decl: (k: number) => Global[]) => {
    let s = signals.get(key);
    if (!s) {
      const k = signals.size + 1;
      s = names.take(`SIG_${k}`);
      signals.set(key, s);
      globals.push({ name: s, type: 'BOOL', doc: key });
      const ds = decl(k);
      helperDecls.push(...ds);
      helperBody.push(...make(s));
    }
    return s;
  };

  const base = {
    variable: (name: string) => p.variables.get(name.toLowerCase()) ?? null,
    undeclared(name: string) {
      undeclared.add(name);
      warn({ code: 'undeclared', params: { name } });
    },
    unknownStep: (n: number) => warn({ code: 'unknownStep', params: { number: String(n) } }),
  };
  // In the signals program every step is read through its mirror.
  const helperTarget: ExprTarget = {
    ...base,
    step: (i) => activity(i, undefined, () => ''),
    edge: (rising, _operand, node, steps) => edgeSignal(rising, node, steps),
    timer: (t1, t2, _operand, node, steps) => timerSignal(t1, t2, node, steps),
  };
  function edgeSignal(rising: boolean, node: BoolNode, steps: Map<number, number>): string {
    const clk = stBool(node, steps, helperTarget);
    return signal(
      `${rising ? '↑' : '↓'}(${clk})`,
      (s) => {
        const fb = helperDecls[helperDecls.length - 1]!.name;
        return [`${fb}(CLK := ${clk});`, `${s} := ${fb}.Q;`];
      },
      (k) => [
        { name: names.take(`${rising ? 'RE' : 'FE'}_${k}`), type: rising ? 'R_TRIG' : 'F_TRIG' },
      ],
    );
  }
  function timerSignal(
    t1: number,
    t2: number | undefined,
    node: BoolNode,
    steps: Map<number, number>,
  ): string {
    const input = stBool(node, steps, helperTarget);
    return signal(
      `${timeLiteral(t1)}/(${input})${t2 !== undefined ? `/${timeLiteral(t2)}` : ''}`,
      (s) => {
        const on =
          helperDecls[t2 !== undefined ? helperDecls.length - 2 : helperDecls.length - 1]!.name;
        const lines = [`${on}(IN := ${input}, PT := ${timeLiteral(t1)});`];
        if (t2 === undefined) return [...lines, `${s} := ${on}.Q;`];
        const off = helperDecls[helperDecls.length - 1]!.name;
        return [...lines, `${off}(IN := ${on}.Q, PT := ${timeLiteral(t2)});`, `${s} := ${off}.Q;`];
      },
      (k) => [
        { name: names.take(`TON_${k}`), type: 'TON' },
        ...(t2 !== undefined ? [{ name: names.take(`TOF_${k}`), type: 'TOF' }] : []),
      ],
    );
  }
  // Inside an SFC program: own steps as `name.X`, `t/Xn` of an own step as `name.T >= t`.
  const pouTarget = (pou: number): ExprTarget => ({
    ...base,
    step: (i) => activity(i, pou, (j) => `${stepName[j]}.X`),
    edge: (rising, _operand, node, steps) => edgeSignal(rising, node, steps),
    timer: (t1, t2, _operand, node, steps) => {
      if (t2 === undefined && node.type === 'step') {
        const i = steps.get(node.number);
        if (i !== undefined && !isMacro(i) && stepPou(i) === pou)
          return `(${stepName[i]}.T >= ${timeLiteral(t1)})`;
      }
      return timerSignal(t1, t2, node, steps);
    },
  });

  // ---- SFC programs --------------------------------------------------------------------------
  // Action blocks are rendered last: a step read by a later program needs its mirror action too.
  interface PendingPou {
    name: string;
    xml: string[];
    blocks: Map<number, string[]>;
    stepIds: Map<number, number>;
    pos: (i: number) => Point;
    nextId: number;
  }
  const pending: PendingPou[] = [];
  const pouNames: string[] = [];
  for (const root of roots) {
    const pouName = p.grafcets[root]!.name;
    pouNames.push(pouName);
    const target = pouTarget(root);
    const grafcets = new Set(pouGrafcets(p, root));
    const steps = p.steps
      .filter((s) => grafcets.has(s.grafcet) && !isMacro(s.idx))
      .map((s) => s.idx);
    const stepSet = new Set(steps);
    const transitions = p.transitions.filter((t) => {
      if (!grafcets.has(t.grafcet)) return false;
      if (!t.from.length) warn({ code: 'sourceTransition', elementId: t.id, params: {} });
      else if (!t.to.length) warn({ code: 'sinkTransition', elementId: t.id, params: {} });
      return (
        t.from.length > 0 &&
        t.to.length > 0 &&
        t.from.every((s) => stepSet.has(s)) &&
        t.to.every((s) => stepSet.has(s))
      );
    });

    // Layout of the flattened network (expansions placed under their macro-step first).
    const positionOf = (i: number): Point => {
      const s = p.steps[i]!;
      const src = project.grafcets[p.grafcets[s.grafcet]!.id]!.steps[s.id]!.position;
      for (const [m, info] of p.macros) {
        if (!info.members.includes(i) || !grafcets.has(p.steps[m]!.grafcet)) continue;
        const mp = positionOf(m);
        const ep =
          project.grafcets[p.grafcets[p.steps[info.entry]!.grafcet]!.id]!.steps[
            p.steps[info.entry]!.id
          ]!.position;
        return { x: mp.x + src.x - ep.x, y: mp.y + src.y - ep.y };
      }
      return src;
    };
    const starIn = new Set([...p.enclosures.values()].flatMap((e) => e.initial));
    const flat: Grafcet = {
      id: 'flat',
      name: pouName,
      kind: 'partial',
      steps: {},
      transitions: {},
      actions: {},
      comments: {},
    };
    for (const i of steps) {
      const s = p.steps[i]!;
      const st: Step = {
        id: s.id,
        number: s.number,
        kind: s.initial || starIn.has(i) ? 'initial' : 'normal',
        position: positionOf(i),
      };
      flat.steps[s.id] = st;
    }
    for (const t of transitions) {
      const ys = t.from.map((s) => flat.steps[p.steps[s]!.id]!.position);
      const tr: Transition = {
        id: t.id,
        from: t.from.map((s) => p.steps[s]!.id),
        to: t.to.map((s) => p.steps[s]!.id),
        receptivity: '',
        position: { x: ys[0]!.x, y: Math.max(...ys.map((q) => q.y)) + 60 },
      };
      flat.transitions[t.id] = tr;
    }
    const laid = autoLayout(flat);
    const pos = (id: Id): Point =>
      laid.get(id) ?? (flat.steps[id] ?? flat.transitions[id])!.position;

    let nextId = 1;
    const lid = new Map<string, number>();
    const idOf = (key: string) => {
      let v = lid.get(key);
      if (v === undefined) lid.set(key, (v = nextId++));
      return v;
    };
    for (const i of steps) idOf(`s${i}`);
    for (const t of transitions) idOf(`t${t.idx}`);

    const outs = new Map<number, typeof transitions>();
    for (const t of transitions) for (const s of t.from) outs.set(s, [...(outs.get(s) ?? []), t]);
    const isJump = (t: (typeof transitions)[number], s: number) =>
      pos(p.steps[s]!.id).y <= pos(t.id).y;
    /** The connection point a transition takes its input from: the step, or its OR divergence. */
    const sourceOfStep = (s: number) =>
      (outs.get(s)?.length ?? 0) > 1 ? idOf(`sd${s}`) : idOf(`s${s}`);
    const sourceOfTransitionOut = (t: (typeof transitions)[number]) =>
      t.to.length > 1 ? idOf(`pd${t.idx}`) : idOf(`t${t.idx}`);

    const xml: string[] = [];
    const at = (x: number, y: number) => `<position x="${Math.round(x)}" y="${Math.round(y)}"/>`;
    const rel = (tag: string, x: number, y: number, conns: number[] = [], attrs = '') =>
      `<${tag}${attrs}><relPosition x="${x}" y="${y}"/>${conns.map((c) => `<connection refLocalId="${c}"/>`).join('')}</${tag}>`;

    for (const i of steps) {
      const s = p.steps[i]!;
      const q = pos(s.id);
      const sources = transitions
        .filter((t) => t.to.includes(i) && !isJump(t, i))
        .map(sourceOfTransitionOut);
      const merged = sources.length > 1 ? [idOf(`sc${i}`)] : sources;
      xml.push(
        `<step localId="${idOf(`s${i}`)}" name="${esc(stepName[i]!)}" initialStep="${s.initial}" height="40" width="40">${at(q.x - 20, q.y - 20)}${merged.length ? rel('connectionPointIn', 20, 0, merged) : ''}${rel('connectionPointOut', 20, 40, [], ' formalParameter="sfc"')}${rel('connectionPointOutAction', 40, 20, [], ' formalParameter=""')}</step>`,
      );
      if (sources.length > 1) {
        xml.push(
          `<selectionConvergence localId="${idOf(`sc${i}`)}" height="1" width="${40 * sources.length}">${at(q.x - 20, q.y - 35)}${sources.map((c, k) => rel('connectionPointIn', 40 * k, 0, [c])).join('')}${rel('connectionPointOut', 20, 1)}</selectionConvergence>`,
        );
      }
      const o = outs.get(i) ?? [];
      if (o.length > 1) {
        xml.push(
          `<selectionDivergence localId="${idOf(`sd${i}`)}" height="1" width="${40 * o.length}">${at(q.x - 20, q.y + 30)}${rel('connectionPointIn', 20, 0, [idOf(`s${i}`)])}${o.map((_, k) => rel('connectionPointOut', 40 * k, 1)).join('')}</selectionDivergence>`,
        );
      }
    }
    for (const t of transitions) {
      const q = pos(t.id);
      const srcs = t.from.map(sourceOfStep);
      const input = srcs.length > 1 ? [idOf(`pc${t.idx}`)] : srcs;
      const cond = t.receptivity ? stBool(t.receptivity.ast, t.receptivity.steps, target) : 'FALSE';
      xml.push(
        `<transition localId="${idOf(`t${t.idx}`)}" height="2" width="20">${at(q.x - 10, q.y - 1)}${rel('connectionPointIn', 10, 0, input)}${rel('connectionPointOut', 10, 2)}<condition><inline name="">${st(cond)}</inline></condition></transition>`,
      );
      if (srcs.length > 1) {
        xml.push(
          `<simultaneousConvergence localId="${idOf(`pc${t.idx}`)}" height="3" width="${40 * srcs.length}">${at(q.x - 20, q.y - 15)}${srcs.map((c, k) => rel('connectionPointIn', 40 * k, 0, [c])).join('')}${rel('connectionPointOut', 20, 3)}</simultaneousConvergence>`,
        );
      }
      if (t.to.length > 1) {
        xml.push(
          `<simultaneousDivergence localId="${idOf(`pd${t.idx}`)}" height="3" width="${40 * t.to.length}">${at(q.x - 20, q.y + 15)}${rel('connectionPointIn', 20, 0, [idOf(`t${t.idx}`)])}${t.to.map((_, k) => rel('connectionPointOut', 40 * k, 3)).join('')}</simultaneousDivergence>`,
        );
      }
      t.to.forEach((s, k) => {
        if (!isJump(t, s)) return;
        xml.push(
          `<jumpStep localId="${idOf(`j${t.idx}_${k}`)}" targetName="${esc(stepName[s]!)}" height="13" width="12">${at(q.x - 6 + 40 * k, q.y + 25)}${rel('connectionPointIn', 6, 0, [sourceOfTransitionOut(t)])}</jumpStep>`,
        );
      });
    }

    // Actions: blocks attached to their steps (macro-step actions go to every step of its expansion).
    const blockActions = new Map<number, string[]>();
    const add = (i: number, a: string) => blockActions.set(i, [...(blockActions.get(i) ?? []), a]);
    const varName = (lower: string) => p.variables.get(lower)?.name ?? lower;
    const actionXml = (qualifier: string, inner: string, duration?: number) =>
      `<action localId="{id}" qualifier="${qualifier}"${duration !== undefined ? ` duration="${timeLiteral(duration)}"` : ''}><relPosition x="0" y="{y}"/>${inner}</action>`;
    const ref = (name: string) => `<reference name="${esc(name)}"/>`;
    const inline = (code: string) => `<inline>${st(code)}</inline>`;
    const ownTimer = (n: BoolNode, a: CAction): number | undefined =>
      n.type === 'timer' &&
      n.t2 === undefined &&
      n.operand.type === 'step' &&
      a.condition!.steps.get(n.operand.number) === a.step
        ? n.t1
        : undefined;
    for (const a of p.actions) {
      // Actions without a step go to the GRAFCET_Always program.
      if (a.step === null) continue;
      const stepsOf = isMacro(a.step) ? realMembers(a.step) : [a.step];
      if (!stepsOf.some((s) => stepSet.has(s))) continue;
      let xmlAction: string | null = null;
      const cond = a.condition ? stBool(a.condition.ast, a.condition.steps, target) : null;
      const assign = () => {
        const v = a.target ? p.variables.get(a.target) : undefined;
        if (!a.target) return '';
        if (a.boolValue)
          return `${varName(a.target)} := ${stBool(a.boolValue.ast, a.boolValue.steps, target)};`;
        if (a.arithValue)
          return `${varName(a.target)} := ${stArith(a.arithValue, target, 0, v?.type)};`;
        return '';
      };
      switch (a.kind) {
        case 'continuous': {
          if (!a.target) break;
          const name = varName(a.target);
          if (!a.condition) xmlAction = actionXml('N', ref(name));
          else if (ownTimer(a.condition.ast, a) !== undefined)
            xmlAction = actionXml('D', ref(name), ownTimer(a.condition.ast, a));
          else if (
            a.condition.ast.type === 'not' &&
            ownTimer(a.condition.ast.operand, a) !== undefined
          )
            xmlAction = actionXml('L', ref(name), ownTimer(a.condition.ast.operand, a));
          else {
            warn({ code: 'conditionalAction', elementId: a.id, params: { name } });
            xmlAction = actionXml('N', inline(`${name} := ${cond};`));
          }
          break;
        }
        case 'storedOnActivation': {
          if (isMacro(a.step)) {
            warn({ code: 'macroStoredAction', elementId: a.id, params: {} });
            break;
          }
          const b = a.boolValue?.ast;
          if (!cond && a.target && b?.type === 'const')
            xmlAction = actionXml(b.value ? 'S' : 'R', ref(varName(a.target)));
          else
            xmlAction = actionXml(
              'P1',
              inline(cond ? `IF ${cond} THEN ${assign()} END_IF;` : assign()),
            );
          break;
        }
        case 'storedOnDeactivation':
          if (isMacro(a.step)) {
            warn({ code: 'macroStoredAction', elementId: a.id, params: {} });
            break;
          }
          xmlAction = actionXml(
            'P0',
            inline(cond ? `IF ${cond} THEN ${assign()} END_IF;` : assign()),
          );
          break;
        case 'storedOnEvent':
          if (isMacro(a.step) || !cond) break;
          xmlAction = actionXml('N', inline(`IF ${cond} THEN ${assign()} END_IF;`));
          break;
        case 'forcing': {
          const text = project.grafcets[p.grafcets[a.grafcet]!.id]!.actions[a.id]!.text;
          warn({ code: 'forcing', elementId: a.id, params: { order: text } });
          xmlAction = actionXml(
            'N',
            inline(
              `(* forcing order ${text.replace(/\*\)/g, '* )')}: not available in IEC 61131-3 SFC, see the Structured Text export *)`,
            ),
          );
          break;
        }
      }
      if (xmlAction) for (const s of stepsOf) if (stepSet.has(s)) add(s, xmlAction);
    }
    pending.push({
      name: pouName,
      xml,
      blocks: blockActions,
      stepIds: new Map(steps.map((i) => [i, idOf(`s${i}`)])),
      pos: (i) => pos(p.steps[i]!.id),
      nextId,
    });
  }
  // ---- Actions without a step: always active, in an ST program run after the SFC programs ---
  const always: string[] = [];
  const alwaysDecls: Global[] = [];
  if (p.alwaysActions.length) {
    const first = names.take('FirstScan');
    alwaysDecls.push({ name: first, type: 'BOOL', initial: 'TRUE', doc: 'first scan' });
    const name = (lower: string) => p.variables.get(lower)?.name ?? lower;
    const cond = (a: CAction) =>
      a.condition ? stBool(a.condition.ast, a.condition.steps, helperTarget) : null;
    const assign = (a: CAction) => {
      if (!a.target) return null;
      const v = p.variables.get(a.target);
      if (a.boolValue)
        return `${name(a.target)} := ${stBool(a.boolValue.ast, a.boolValue.steps, helperTarget)};`;
      if (a.arithValue)
        return `${name(a.target)} := ${stArith(a.arithValue, helperTarget, 0, v?.type)};`;
      return null;
    };
    const stepDriven = new Set(
      p.actions.filter((a) => a.kind === 'continuous' && a.step !== null).map((a) => a.target),
    );
    const continuous = new Map<string, string[]>();
    for (const a of p.alwaysActions) {
      const c = cond(a);
      const body = assign(a);
      if (a.kind === 'continuous' && a.target)
        continuous.set(a.target, [...(continuous.get(a.target) ?? []), c ? `(${c})` : 'TRUE']);
      else if (a.kind === 'storedOnActivation' && body)
        always.push(`IF ${first}${c ? ` AND (${c})` : ''} THEN ${body} END_IF;`);
      else if (a.kind === 'storedOnEvent' && body && c) always.push(`IF ${c} THEN ${body} END_IF;`);
      else if (a.kind === 'forcing') {
        const text = project.grafcets[p.grafcets[a.grafcet]!.id]!.actions[a.id]!.text;
        warn({ code: 'forcing', elementId: a.id, params: { order: text } });
        always.push(
          `(* forcing order ${text.replace(/\*\)/g, '* )')}: see the Structured Text export *)`,
        );
      }
    }
    // Variables also driven by steps keep what the SFC programs set this scan (OR).
    for (const [lower, terms] of continuous)
      always.push(
        `${name(lower)} := ${stepDriven.has(lower) ? `${name(lower)} OR ` : ''}${terms.join(' OR ')};`,
      );
    always.push(`${first} := FALSE;`);
  }

  const pous = pending.map((pp) => {
    for (const [i, m] of mirror)
      if (pp.stepIds.has(i))
        pp.blocks.set(i, [
          ...(pp.blocks.get(i) ?? []),
          `<action localId="{id}" qualifier="N"><relPosition x="0" y="{y}"/><reference name="${esc(m)}"/></action>`,
        ]);
    let nextId = pp.nextId;
    const xml = [...pp.xml];
    for (const [i, list] of pp.blocks) {
      const q = pp.pos(i);
      const items = list
        .map((a, k) => a.replace('{id}', String(nextId++)).replace('{y}', String(20 * k)))
        .join('');
      xml.push(
        `<actionBlock localId="${nextId++}" width="160" height="${20 * list.length}"><position x="${Math.round(q.x + 40)}" y="${Math.round(q.y - 10)}"/><connectionPointIn><relPosition x="0" y="10"/><connection refLocalId="${pp.stepIds.get(i)}"/></connectionPointIn>${items}</actionBlock>`,
      );
    }
    return `    <pou name="${esc(pp.name)}" pouType="program">\n      <interface>{externals}</interface>\n      <body>\n        <SFC>\n${xml.map((x) => `          ${x}`).join('\n')}\n        </SFC>\n      </body>\n    </pou>`;
  });

  // ---- Signals program -----------------------------------------------------------------------
  const helperName = helperBody.length ? names.take('GRAFCET_Signals') : null;
  if (helperName) {
    pous.unshift(
      `    <pou name="${helperName}" pouType="program">\n      <interface>{externals}\n        <localVars>\n${helperDecls.map((d) => variableXml(d, '          ')).join('\n')}\n        </localVars>\n      </interface>\n      <body>${st(helperBody.join('\n'))}</body>\n    </pou>`,
    );
  }
  const alwaysName = always.length ? names.take('GRAFCET_Always') : null;
  if (alwaysName) {
    pous.push(
      `    <pou name="${alwaysName}" pouType="program">\n      <interface>{externals}\n        <localVars>\n${alwaysDecls.map((d) => variableXml(d, '          ')).join('\n')}\n        </localVars>\n      </interface>\n      <body>${st(`(* Actions without a step: always active *)\n${always.join('\n')}`)}</body>\n    </pou>`,
    );
  }
  for (const u of undeclared)
    globals.push({ name: u, type: 'BOOL', doc: 'not declared in the project' });
  const externals = `\n        <externalVars>\n${globals.map((g) => variableXml({ name: g.name, type: g.type }, '          ')).join('\n')}\n        </externalVars>`;

  const now = opts.date.toISOString().slice(0, 19);
  const instances = [
    ...(helperName
      ? [`          <pouInstance name="${helperName}_Instance" typeName="${helperName}"/>`]
      : []),
    ...pouNames.map(
      (n) => `          <pouInstance name="${esc(n)}_Instance" typeName="${esc(n)}"/>`,
    ),
    ...(alwaysName
      ? [`          <pouInstance name="${alwaysName}_Instance" typeName="${alwaysName}"/>`]
      : []),
  ];
  const code = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${esc(project.name).replace(/--/g, '- -')}: generated by GrafcetMaker ${esc(opts.version)} – generated – review before use -->`,
    '<project xmlns="http://www.plcopen.org/xml/tc6_0201" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    `  <fileHeader companyName="${esc(project.meta.company || 'unknown')}" productName="GrafcetMaker" productVersion="${esc(opts.version)}" creationDateTime="${now}"/>`,
    `  <contentHeader name="${esc(project.name)}" modificationDateTime="${now}"${project.meta.author ? ` author="${esc(project.meta.author)}"` : ''}>`,
    '    <coordinateInfo>',
    '      <fbd><scaling x="1" y="1"/></fbd>',
    '      <ld><scaling x="1" y="1"/></ld>',
    '      <sfc><scaling x="1" y="1"/></sfc>',
    '    </coordinateInfo>',
    '  </contentHeader>',
    '  <types>',
    '    <dataTypes/>',
    '    <pous>',
    ...pous.map((x) => x.replace('{externals}', externals)),
    '    </pous>',
    '  </types>',
    '  <instances>',
    '    <configurations>',
    '      <configuration name="Config">',
    '        <resource name="Resource">',
    `          <task name="MainTask" priority="1" interval="${timeLiteral(opts.taskInterval ?? 10)}">`,
    ...instances.map((x) => `  ${x}`),
    '          </task>',
    '          <globalVars>',
    ...globals.map((g) => variableXml(g, '            ')),
    '          </globalVars>',
    '        </resource>',
    '      </configuration>',
    '    </configurations>',
    '  </instances>',
    '</project>',
    '',
  ].join('\n');
  return { code, warnings };
}
