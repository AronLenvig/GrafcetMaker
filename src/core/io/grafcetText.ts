/**
 * GRAFCET text: a project as plain lines that a person or an AI assistant can write and read,
 * and the `#text=` links that open it (docs/ai.md, published as ai.txt, is the reference):
 *
 *   project Drilling station
 *   input start
 *   output Spin
 *   internal Count INT = 0
 *   grafcet Drill
 *   step 0 initial Waiting
 *   0 -> 1: start
 *   step 1 Drilling
 *     do Spin
 *     on enter: Count := Count + 1
 *   1 -> 0: 5s/X1
 *
 * Positions are not written: a project read from text is laid out automatically. Names used but
 * not declared are declared from their use, like typing them in the editor. Expressions are kept
 * as written: their mistakes show in Problems, as in a chart drawn by hand.
 */
import { DURATION_UNITS, RESERVED_WORDS } from '../expr/lexer';
import { formatDuration } from '../expr/format';
import { STEP_REF_RE } from '../expr/parser';
import { IDENT_RE, LIMITS } from '../model/constants';
import type {
  ActionKind,
  Grafcet,
  GrafcetKind,
  Project,
  Step,
  StepKind,
  VariableType,
} from '../model/types';
import { declareUnknownNames, grafcetExpressions } from '../model/variables';
import {
  buildProject,
  type SpecAction,
  type SpecGrafcet,
  type SpecStep,
  type SpecVariable,
} from './buildProject';
import { ProjectFileError, parseProjectFile, serializeProject } from './projectFile';

export const TEXT_PREFIX = '#text=';

/** Longest text accepted, in characters (a link is capped well below by browsers anyway). */
const MAX_TEXT_CHARS = 1024 * 1024;

export type TextErrorCode =
  | 'empty'
  | 'tooLarge'
  | 'unknownLine'
  | 'name'
  | 'duplicateVariable'
  | 'value'
  | 'duplicateGrafcet'
  | 'duplicateStep'
  | 'unknownStep'
  | 'transitionEnds'
  | 'unknownGrafcet'
  | 'invalid';

/** A line that cannot be read: its number (1-based, 0 for the whole text) and what is wrong. */
export class GrafcetTextError extends Error {
  constructor(
    readonly code: TextErrorCode,
    readonly line: number,
    readonly params: Record<string, string> = {},
  ) {
    super(`${line ? `Line ${line}: ` : ''}${code} ${JSON.stringify(params)}`);
    this.name = 'GrafcetTextError';
  }
}

const DIRECTIONS = new Set(['input', 'output', 'internal']);
const GRAFCET_KINDS: Record<string, GrafcetKind> = {
  partial: 'partial',
  expansion: 'macroExpansion',
  macroexpansion: 'macroExpansion',
  enclosed: 'enclosed',
};
const GRAFCET_KIND_WORDS: Record<GrafcetKind, string> = {
  partial: '',
  macroExpansion: 'expansion',
  enclosed: 'enclosed',
};

/** `name [TYPE] [= value] [at address]` of a variable line (the comment already cut off). */
const VARIABLE_RE =
  /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(BOOL|INT|REAL|TIME))?(?:\s*=\s*(\S+))?(?:\s+at\s+(.+?))?$/i;
const TRANSITION_RE = /^(?:(?:transition|t)\s+)?([\d\s,]*)->([\d\s,]*?)\s*(?::(.*))?$/i;
// The kind in lower case only, so a label such as "Initial position" stays a label.
const STEP_RE = /^(?:([Ii]nitial)\s+)?[Ss]tep\s+(\d+)(?:\s+(initial|macro|enclosing)\b)?\s*(.*)$/;

const unescapeNote = (s: string) =>
  s.replace(/\\(n|\\)/g, (_, c: string) => (c === 'n' ? '\n' : '\\'));
const escapeNote = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

function nameError(name: string): boolean {
  return (
    !IDENT_RE.test(name) ||
    name.length > LIMITS.nameLength ||
    RESERVED_WORDS.has(name.toLowerCase()) ||
    STEP_REF_RE.test(name)
  );
}

/** An initial value as written for a type: BOOL 1/0/TRUE/FALSE, numbers, TIME a duration or ms. */
function readValue(type: VariableType, raw: string): boolean | number | null {
  const s = raw.toLowerCase();
  if (type === 'BOOL')
    return s === '1' || s === 'true' ? true : s === '0' || s === 'false' ? false : null;
  if (type === 'TIME') {
    const d = /^(\d+(?:\.\d+)?)(ms|s|min|h)?$/.exec(s);
    return d ? Math.round(Number(d[1]) * DURATION_UNITS[d[2] ?? 'ms']!) : null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || raw.trim() === '') return null;
  return type === 'INT' ? Math.trunc(n) : n;
}

const stepNumbers = (list: string) =>
  list
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);

/** An action line under a step (or before the first step: an action without a step), or null. */
function readAction(line: string): SpecAction | null {
  const withCondition = (kind: ActionKind, body: string): SpecAction => {
    const m = /^(.*?)\s+if\s+(.+)$/i.exec(body);
    return m ? [kind, m[1]!.trim(), m[2]!.trim()] : [kind, body.trim()];
  };
  let m = /^(?:do|n|action)\s+(.+)$/i.exec(line);
  if (m) return withCondition('continuous', m[1]!);
  m = /^(?:on\s+(?:enter|entry|activation)\s*:|p1\s)\s*(.+)$/i.exec(line);
  if (m) return withCondition('storedOnActivation', m[1]!);
  m = /^(?:on\s+(?:exit|deactivation)\s*:|p0\s)\s*(.+)$/i.exec(line);
  if (m) return withCondition('storedOnDeactivation', m[1]!);
  m = /^(?:force|f)\s+(.+)$/i.exec(line);
  if (m) return withCondition('forcing', m[1]!);
  // `on <event>: <assignment>`: the first colon that does not start `:=`.
  m = /^on\s+(.+?):(?!=)\s*(.+)$/i.exec(line);
  if (m) return ['storedOnEvent', m[2]!.trim(), m[1]!.trim()];
  return null;
}

interface PendingTransition {
  from: number[];
  to: number[];
  receptivity: string;
  line: number;
}
interface PendingGrafcet {
  spec: SpecGrafcet;
  line: number;
  transitions: PendingTransition[];
  stepLines: Map<number, number>;
  refs: { name: string; line: number }[];
}

/** The project a GRAFCET text describes. Throws GrafcetTextError for the first unreadable line. */
export function parseGrafcetText(text: string): Project {
  if (text.length > MAX_TEXT_CHARS) throw new GrafcetTextError('tooLarge', 0);
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n?|\n/);
  let name = '';
  const variables: SpecVariable[] = [];
  const variableNames = new Set<string>();
  const grafcets: PendingGrafcet[] = [];
  let current: PendingGrafcet | null = null;
  let step: SpecStep | null = null;

  const grafcet = (line: number): PendingGrafcet => {
    if (!current) {
      current = {
        spec: { name: `G${grafcets.length + 1}`, steps: [], transitions: [] },
        line,
        transitions: [],
        stepLines: new Map(),
        refs: [],
      };
      grafcets.push(current);
    }
    return current;
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    // Blank lines, comments, and the fences of a Markdown code block an assistant may add.
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('```')) return;
    const word = line.split(/\s+/, 1)[0]!.toLowerCase();

    if (word === 'project') {
      name = line.slice(word.length).trim().slice(0, 200);
      return;
    }
    if (DIRECTIONS.has(word)) {
      const body = line.slice(word.length).trim();
      const cut = body.indexOf('--');
      const comment = cut >= 0 ? body.slice(cut + 2).trim() : '';
      const parts = (cut >= 0 ? body.slice(0, cut) : body).split(',').map((s) => s.trim());
      for (const part of parts) {
        const m = VARIABLE_RE.exec(part);
        if (!m || nameError(m[1]!)) throw new GrafcetTextError('name', n, { name: part });
        const vname = m[1]!;
        if (variableNames.has(vname.toLowerCase()))
          throw new GrafcetTextError('duplicateVariable', n, { name: vname });
        variableNames.add(vname.toLowerCase());
        const type = (m[2]?.toUpperCase() ?? 'BOOL') as VariableType;
        let initial: boolean | number | undefined;
        if (m[3] !== undefined) {
          const v = readValue(type, m[3]);
          if (v === null) throw new GrafcetTextError('value', n, { value: m[3], type });
          initial = v;
        }
        const direction = word as SpecVariable[2];
        variables.push([vname, type, direction, m[4]?.trim(), comment || undefined, initial]);
      }
      return;
    }
    if (word === 'grafcet') {
      const m = /^grafcet\s+(\S+)(?:\s+(\S+))?\s*$/i.exec(line);
      const kind = m?.[2] ? GRAFCET_KINDS[m[2].toLowerCase()] : 'partial';
      if (!m || !kind || nameError(m[1]!)) throw new GrafcetTextError('unknownLine', n);
      const gname = m[1]!;
      if (grafcets.some((g) => g.spec.name.toLowerCase() === gname.toLowerCase()))
        throw new GrafcetTextError('duplicateGrafcet', n, { name: gname });
      current = {
        spec: { name: gname, kind, steps: [], transitions: [] },
        line: n,
        transitions: [],
        stepLines: new Map(),
        refs: [],
      };
      grafcets.push(current);
      step = null;
      return;
    }
    const s = STEP_RE.exec(line);
    if (s) {
      const g = grafcet(n);
      const number = Number(s[2]);
      if (g.stepLines.has(number))
        throw new GrafcetTextError('duplicateStep', n, { number: String(number) });
      g.stepLines.set(number, n);
      const kind = (s[1] ? 'initial' : (s[3] ?? 'normal')) as StepKind;
      let label = s[4]!.trim();
      const spec: SpecStep = { n: number, kind };
      if (kind === 'macro' || kind === 'enclosing') {
        const arrow = label.lastIndexOf('->');
        if (arrow >= 0) {
          const ref = label.slice(arrow + 2).trim();
          label = label.slice(0, arrow).trim();
          if (ref) {
            spec.ref = ref;
            g.refs.push({ name: ref, line: n });
          }
        }
      }
      if (label) spec.label = label.slice(0, LIMITS.shortText);
      g.spec.steps.push(spec);
      step = spec;
      return;
    }
    if (word === 'note') {
      const g = grafcet(n);
      (g.spec.comments ??= []).push(unescapeNote(line.slice(4).trim()).slice(0, LIMITS.longText));
      return;
    }
    const t = TRANSITION_RE.exec(line);
    if (t) {
      const g = grafcet(n);
      const from = stepNumbers(t[1]!);
      const to = stepNumbers(t[2]!);
      if (!from.length && !to.length) throw new GrafcetTextError('transitionEnds', n);
      g.transitions.push({ from, to, receptivity: (t[3] ?? '').trim(), line: n });
      return;
    }
    const action = readAction(line);
    if (action) {
      if (step) (step.actions ??= []).push(action);
      else (grafcet(n).spec.free ??= []).push(action);
      return;
    }
    throw new GrafcetTextError('unknownLine', n);
  });

  if (!grafcets.length) throw new GrafcetTextError('empty', 0);
  const names = new Set(grafcets.map((g) => g.spec.name));
  for (const g of grafcets) {
    for (const r of g.refs)
      if (!names.has(r.name))
        throw new GrafcetTextError('unknownGrafcet', r.line, { name: r.name });
    for (const tr of g.transitions) {
      const missing = [...tr.from, ...tr.to].find((x) => !g.stepLines.has(x));
      if (missing !== undefined)
        throw new GrafcetTextError('unknownStep', tr.line, {
          number: String(missing),
          grafcet: g.spec.name,
        });
      g.spec.transitions.push([tr.from, tr.receptivity, tr.to]);
    }
  }

  const project = buildProject({
    name: name || grafcets[0]!.spec.name,
    variables,
    grafcets: grafcets.map((g) => g.spec),
  });
  // Names used but not declared, declared as in the editor (read → input, set → output…).
  for (const gid of project.grafcetOrder)
    for (const e of grafcetExpressions(project.grafcets[gid]!))
      declareUnknownNames(project, gid, e.kind, e.source);
  try {
    // Through the file checks: limits and integrity, like any file the editor opens.
    return parseProjectFile(serializeProject(project));
  } catch (e) {
    if (e instanceof ProjectFileError)
      throw new GrafcetTextError('invalid', 0, { details: e.message });
    throw e;
  }
}

function formatValue(type: VariableType, v: boolean | number): string {
  if (typeof v === 'boolean') return v ? '1' : '0';
  return type === 'TIME' ? formatDuration(Math.round(v)) : String(v);
}

function actionLine(kind: ActionKind, text: string, condition?: string): string {
  const body = oneLine(text);
  const cond = condition?.trim() ? oneLine(condition) : '';
  const guard = cond ? ` if ${cond}` : '';
  switch (kind) {
    case 'continuous':
      return `do ${body}${guard}`;
    case 'storedOnActivation':
      return `on enter: ${body}${guard}`;
    case 'storedOnDeactivation':
      return `on exit: ${body}${guard}`;
    case 'storedOnEvent':
      return `on ${cond || '1'}: ${body}`;
    case 'forcing':
      return `force ${body}${guard}`;
  }
}

function grafcetLines(p: Project, g: Grafcet): string[] {
  const kind = GRAFCET_KIND_WORDS[g.kind];
  const out = [`grafcet ${g.name}${kind ? ` ${kind}` : ''}`];
  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;
  const actions = Object.values(g.actions);
  for (const a of actions.filter((x) => x.stepId === null).sort(byOrder))
    out.push(actionLine(a.kind, a.text, a.condition));
  // Top to bottom, left to right: read back, branches keep their order.
  const steps = Object.values(g.steps).sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  );
  const index = new Map(steps.map((s, i) => [s.id, i]));
  const after = new Map<number, string[]>();
  for (const t of Object.values(g.transitions)) {
    const ends = (ids: string[]) => ids.map((id) => g.steps[id]?.number).join(' ');
    const anchor = t.from.length
      ? Math.max(...t.from.map((id) => index.get(id) ?? 0))
      : Math.min(...t.to.map((id) => index.get(id) ?? 0));
    const from = ends(t.from);
    const to = ends(t.to);
    const line = `${from}${from ? ' ' : ''}->${to ? ' ' : ''}${to}: ${oneLine(t.receptivity)}`;
    (after.get(anchor) ?? after.set(anchor, []).get(anchor)!).push(line.trimEnd());
  }
  const refName = (s: Step) => (s.refGrafcetId ? p.grafcets[s.refGrafcetId]?.name : undefined);
  steps.forEach((s, i) => {
    const kind = s.kind === 'normal' ? '' : ` ${s.kind}`;
    const label = s.label?.trim() ? ` ${oneLine(s.label)}` : '';
    const ref = refName(s);
    out.push(`step ${s.number}${kind}${label}${ref ? ` -> ${ref}` : ''}`);
    for (const a of actions.filter((x) => x.stepId === s.id).sort(byOrder))
      out.push(`  ${actionLine(a.kind, a.text, a.condition)}`);
    out.push(...(after.get(i) ?? []));
  });
  for (const c of Object.values(g.comments).sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  ))
    out.push(`note ${escapeNote(c.text)}`);
  return out;
}

/**
 * The project as GRAFCET text (for an AI assistant, or to edit as text). Positions, transition
 * numbers, routing, scenarios and file details are not written.
 */
export function projectToText(p: Project): string {
  const out = [
    '# GrafcetMaker text (format: https://grafcet.org/ai.txt)',
    `project ${oneLine(p.name)}`,
  ];
  const vars = Object.values(p.variables);
  if (vars.length) out.push('');
  const order = { input: 0, output: 1, internal: 2 } as const;
  for (const v of vars.sort((a, b) => order[a.direction] - order[b.direction])) {
    const type = v.type === 'BOOL' ? '' : ` ${v.type}`;
    const value = v.initialValue === undefined ? '' : ` = ${formatValue(v.type, v.initialValue)}`;
    const address = v.address?.trim() ? ` at ${oneLine(v.address)}` : '';
    const comment = v.comment?.trim() ? ` -- ${oneLine(v.comment)}` : '';
    out.push(`${v.direction} ${v.name}${type}${value}${address}${comment}`);
  }
  for (const gid of p.grafcetOrder) {
    const g = p.grafcets[gid];
    if (g) out.push('', ...grafcetLines(p, g));
  }
  return `${out.join('\n')}\n`;
}

/**
 * The `#text=…` fragment opening a GRAFCET text: encodeURIComponent, and parentheses too, which
 * chat apps take for the end of a link.
 */
export const encodeTextHash = (text: string): string =>
  TEXT_PREFIX + encodeURIComponent(text).replace(/\(/g, '%28').replace(/\)/g, '%29');

/**
 * The text of a `#text=…` fragment. Lenient with hand-made links: a stray `%` that is not an
 * escape stays as it is. A `+` is a plus (OR), never a space.
 */
export function decodeTextHash(hash: string): string {
  const data = hash.startsWith(TEXT_PREFIX) ? hash.slice(TEXT_PREFIX.length) : '';
  if (data.length > MAX_TEXT_CHARS * 3) throw new GrafcetTextError('tooLarge', 0);
  try {
    return decodeURIComponent(data);
  } catch {
    return data.replace(/(%[0-9a-f]{2})+/gi, (m) => {
      try {
        return decodeURIComponent(m);
      } catch {
        return m;
      }
    });
  }
}
