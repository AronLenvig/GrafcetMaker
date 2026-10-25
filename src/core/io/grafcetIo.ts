/**
 * Import of grafcet.io files (`.grafcetio`, https://grafcet.io/dateiformat): a JSON graph of nodes
 * (steps, transitions, actions, branch bars, loop connectors, frames, text) and edges between their
 * handles (`top` = in, `bottom` = out, `right` → actions; `handle-n` / `source-n` on branch bars).
 *
 * Links: the edges are joined into "nets" (wires through loop connectors, branch bars, and loop
 * markers in one frame with the same reference label that are wired on one side only); each
 * transition then leads to every step input on its output net and is enabled by every step output
 * on its input net. Several steps into one transition without an AND bar (`andNode`, `andSplit`)
 * is read as alternatives: one transition per step.
 * Grafcets: the charts inside a frame (`boxNode`, named by its lower label) form one partial
 * grafcet, as do the actions of a frame without steps; every other separate chart becomes its own,
 * named after the text heading above it.
 * The result is laid out with the editor's auto-layout and its variables are created from what
 * the expressions use. The file is untrusted: validated with Zod, size-capped, and the project is
 * checked against the project schema before it is returned.
 */
import { z } from 'zod';
import { analyze, envFactory } from '../expr/check';
import { autoLayout } from '../layout/autoLayout';
import { computeGeometry, grafcetBounds, snap } from '../layout/geometry';
import { grafcetExpressions } from '../model/variables';
import { createGrafcet, createProject, newId } from '../model/factory';
import {
  addAction,
  addComment,
  addFreeAction,
  addStep,
  addTransition,
  moveElements,
} from '../model/ops';
import { IDENT_RE, LIMITS, projectSchema } from '../model/schema';
import type { ActionKind, Grafcet, Id, Point, Project, StepKind, Variable } from '../model/types';
import { ProjectFileError } from './projectFile';

export type ImportNoteCode =
  | 'splitTransition'
  | 'renumbered'
  | 'stepNumber'
  | 'forcingHelper'
  | 'invalidLink'
  | 'unsupported'
  | 'macroStep'
  | 'enclosingStep'
  | 'actionRenamed'
  | 'pulseAction'
  | 'openTransition';

/** Something the import changed or left out, shown to the user afterwards. */
export interface ImportNote {
  code: ImportNoteCode;
  params: Record<string, string>;
}

export interface ImportResult {
  project: Project;
  notes: ImportNote[];
}

const ref = z.string().min(1).max(256);
const handle = z.string().max(64).nullish();
const documentSchema = z.object({
  createdAt: z.string().max(64).optional(),
  nodes: z
    .array(
      z.object({
        id: ref,
        type: z.string().max(64),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.record(z.string(), z.unknown()).nullish(),
      }),
    )
    .max(LIMITS.elements),
  edges: z
    .array(
      z.object({
        source: ref,
        target: ref,
        sourceHandle: handle,
        targetHandle: handle,
      }),
    )
    .max(LIMITS.elements),
});
type RawNode = z.infer<typeof documentSchema>['nodes'][number];

/** A file written by grafcet.io (by extension, or by its `createdWith` marker). */
export function isGrafcetIo(fileName: string, text: string): boolean {
  return (
    /\.grafcetio$/i.test(fileName) || /"createdWith"\s*:\s*"grafcet\.io"/.test(text.slice(0, 2000))
  );
}

const STEP_KINDS: Record<string, StepKind> = {
  step: 'normal',
  initialStep: 'initial',
  enclosingStep: 'enclosing',
  macroStep: 'macro',
};
const TRANSITIONS = new Set(['transition', 'startTransition', 'pitTransition']);
const ACTIONS = new Set(['action', 'forcedCommand']);
const LOOP_MARKERS = new Set(['loopNode', 'startLoop', 'endLoop']);
// `andSplit`: what newer grafcet.io versions write for the double bar (not in the format page)
const AND_BARS = new Set(['andNode', 'andSplit']);
const CONNECTORS = new Set([...LOOP_MARKERS, ...AND_BARS, 'orNode']);
const FORCING_RE = /^[A-Za-z_]\w*\s*\{[^{}]*\}$/;

/** `G1{} AND G2{8}` (or joined by `,` `;` `*` `&&`) → one forcing order each; other text as is. */
function forcingOrders(line: string): string[] {
  const parts = line.trim().split(/(?<=\})\s*(?:,|;|\*|&&|\bAND\b)\s*/i);
  return parts.length > 1 && parts.every((p) => FORCING_RE.test(p)) ? parts : [line];
}

const field = (n: RawNode, key: string, max: number = LIMITS.expression): string => {
  const v = n.data?.[key];
  return (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').slice(0, max);
};
const num = (n: RawNode, key: string): number => {
  const v = Number(n.data?.[key]);
  return Number.isFinite(v) ? v : 0;
};

/** grafcet.io expression text in GrafcetMaker syntax (the operators are mostly the same). */
export function convertExpression(text: string): string {
  return text
    .normalize('NFC')
    .replace(/̲/g, '') // underlined 1 (always true)
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠|!=/g, '<>')
    .replace(/==/g, '=')
    .replace(/%/g, ' MOD ')
    .replace(/\b(\d+[.,]\d+)(ms|s|min|h)\b/gi, (_, n: string, unit: string) => duration(n + unit))
    .replace(/\s+/g, ' ')
    .trim();
}

const CMP_G = /<>|<=|>=|=|<|>/g;
const hasCmp = (s: string) => /<>|<=|>=|=|<|>/.test(s);

/** Splits at `sep` outside parentheses. */
function splitTop(s: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === sep && depth === 0) {
      parts.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(s.slice(start).trim());
  return parts;
}

const wrapped = (s: string) => {
  if (!s.startsWith('(') || !s.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    if (depth === 0) return false;
  }
  return true;
};

/**
 * In grafcet.io `*` is always AND, while GrafcetMaker also reads it as a multiplication next to a
 * comparison (`n > 0 * a` = `n > (0 * a)`): comparisons are put in parentheses,
 * `(n > 0) * a`. Two comparisons joined by `+` are read as OR the same way.
 */
export function separateComparisons(s: string): string {
  if (!hasCmp(s)) return s;
  const ands = splitTop(s, '*');
  return ands
    .map((p) => {
      if (!hasCmp(p) || wrapped(p)) return p;
      const ors = splitTop(p, '+');
      if (ors.length > 1 && (p.match(CMP_G) ?? []).length >= 2) {
        const or = ors.map((o) => (hasCmp(o) && !wrapped(o) ? `(${o})` : o)).join(' + ');
        return ands.length > 1 ? `(${or})` : or;
      }
      return ands.length > 1 ? `(${p})` : p;
    })
    .join(' * ');
}

/** A condition (receptivity or action condition) in GrafcetMaker syntax. */
const condition = (text: string) => separateComparisons(convertExpression(text));

function receptivity(text: string): string {
  const s = condition(text);
  return s === '*' || s === '=1' || s === '= 1' ? '1' : s;
}

/** An IEC identifier from free text: transliterated, other characters become `_`. */
export function toIdentifier(text: string): string {
  const s = text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, LIMITS.nameLength - 1);
  return /^\d/.test(s) ? `G${s}` : s;
}

/** `5s`, `5 s`, `1.5s`, `1,5s`, `T#5s`, `5` (seconds) → a GrafcetMaker duration. */
function duration(text: string): string {
  const s = text.replace(/^t#/i, '').replace(/\s+/g, '').replace(',', '.').toLowerCase();
  const m = /^(\d+(?:\.\d+)?)(ms|s|min|m|h)?$/.exec(s);
  if (!m) return s;
  const ms = Number(m[1]) * { ms: 1, s: 1000, min: 60_000, m: 60_000, h: 3_600_000 }[m[2] ?? 's']!;
  for (const [unit, size] of [
    ['h', 3_600_000],
    ['min', 60_000],
    ['s', 1000],
  ] as const)
    if (ms >= size && ms % size === 0) return `${ms / size}${unit}`;
  return `${Math.round(ms)}ms`;
}

/** Wraps an expression that contains an OR before it is combined with AND. */
const group = (e: string) => (/\+|\|\||\bOR\b/i.test(e) ? `(${e})` : e);
const and = (...parts: string[]) => parts.filter(Boolean).map(group).join(' * ');

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    while (p !== x) {
      const gp = this.parent.get(p)!;
      this.parent.set(x, gp);
      x = p;
      p = this.parent.get(x)!;
    }
    return x;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  keys(): string[] {
    return [...this.parent.keys()];
  }
}

interface Group {
  key: string;
  name: string;
  nodes: RawNode[];
  box?: RawNode;
}

interface ForcingHelper {
  order: string;
  condition: string;
}

export function importGrafcetIo(
  text: string,
  name: string,
  byteLength = text.length,
): ImportResult {
  if (byteLength > LIMITS.fileBytes)
    throw new ProjectFileError('tooLarge', `File is larger than ${LIMITS.fileBytes} bytes`);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ProjectFileError('notJson', 'File is not valid JSON', [String((e as Error).message)]);
  }
  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success)
    throw new ProjectFileError(
      'invalid',
      'Not a readable grafcet.io file',
      parsed.error.issues
        .slice(0, 8)
        .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)),
    );
  const doc = parsed.data;
  const notes: ImportNote[] = [];
  const note = (code: ImportNoteCode, params: Record<string, string> = {}) =>
    notes.push({ code, params });

  // ---- Nodes by role -------------------------------------------------------------------------
  const nodes = new Map<string, RawNode>();
  const unsupported = new Map<string, number>();
  for (const n of doc.nodes) {
    nodes.set(n.id, n);
    const known =
      n.type in STEP_KINDS ||
      TRANSITIONS.has(n.type) ||
      ACTIONS.has(n.type) ||
      CONNECTORS.has(n.type) ||
      n.type === 'text' ||
      n.type === 'boxNode';
    if (!known) unsupported.set(n.type, (unsupported.get(n.type) ?? 0) + 1);
  }
  for (const [type, count] of unsupported)
    note('unsupported', { type: type.slice(0, 40), count: String(count) });
  const isStep = (id: string) => (nodes.get(id)?.type ?? '') in STEP_KINDS;
  const isTransition = (id: string) => TRANSITIONS.has(nodes.get(id)?.type ?? '');
  const isAction = (id: string) => ACTIONS.has(nodes.get(id)?.type ?? '');
  const isConnector = (id: string) => CONNECTORS.has(nodes.get(id)?.type ?? '');
  const all = (pred: (id: string) => boolean) => doc.nodes.filter((n) => pred(n.id));
  const boxes = doc.nodes.filter((n) => n.type === 'boxNode');
  const inside = (b: RawNode, p: Point) =>
    p.x >= b.position.x &&
    p.y >= b.position.y &&
    p.x <= b.position.x + num(b, 'width') &&
    p.y <= b.position.y + num(b, 'height');
  const area = (b: RawNode) => num(b, 'width') * num(b, 'height');
  /** The innermost frame around a point: the smallest, the first of equal ones. */
  const boxOf = (p: Point): RawNode | undefined => {
    let best: RawNode | undefined;
    for (const b of boxes) if (inside(b, p) && (!best || area(b) < area(best))) best = b;
    return best;
  };

  // ---- Nets: wires joined through connectors -------------------------------------------------
  const nets = new UnionFind();
  const port = (id: string, h: string | null | undefined, role: 'source' | 'target') => {
    if (isConnector(id)) return `c:${id}`;
    if (!isStep(id) && !isTransition(id)) return null;
    const side = h ?? (role === 'source' ? 'bottom' : 'top');
    if (side === 'top' || side.startsWith('handle')) return `${id}:in`;
    if (side === 'bottom' || side.startsWith('source')) return `${id}:out`;
    return null;
  };
  const actionLinks: [string, string][] = [];
  let invalid = 0;
  for (const e of doc.edges) {
    if (!nodes.has(e.source) || !nodes.has(e.target)) continue;
    if (isAction(e.source) || isAction(e.target)) {
      actionLinks.push([e.source, e.target]);
      continue;
    }
    const a = port(e.source, e.sourceHandle, 'source');
    const b = port(e.target, e.targetHandle, 'target');
    if (a && b) nets.union(a, b);
    else invalid++;
  }
  // Two loop markers with the same reference label stand for one long line: the marker it leaves
  // by and the one it arrives at. A marker wired on both sides is a whole loop by itself, so
  // separate loops that keep the default label `*` (or loops in different frames) stay apart.
  const wired = new Map<string, { out: boolean; in: boolean }>();
  for (const key of nets.keys()) {
    const w = wired.get(nets.find(key)) ?? { out: false, in: false };
    if (key.endsWith(':out')) w.out = true;
    else if (key.endsWith(':in')) w.in = true;
    wired.set(nets.find(key), w);
  }
  for (const n of doc.nodes) {
    const label = field(n, 'label', 64).trim();
    if (!LOOP_MARKERS.has(n.type) || !label) continue;
    const w = wired.get(nets.find(`c:${n.id}`));
    if (w?.out && w.in) continue;
    nets.union(`c:${n.id}`, `loop:${boxOf(n.position)?.id ?? ''}:${label}`);
  }
  interface Net {
    stepOut: string[];
    stepIn: string[];
    tOut: string[];
    tIn: string[];
    and: boolean;
  }
  const byRoot = new Map<string, Net>();
  for (const key of nets.keys()) {
    const root = nets.find(key);
    const net = byRoot.get(root) ?? { stepOut: [], stepIn: [], tOut: [], tIn: [], and: false };
    byRoot.set(root, net);
    const m = /^(.*):(in|out)$/.exec(key);
    if (key.startsWith('c:')) net.and ||= AND_BARS.has(nodes.get(key.slice(2))?.type ?? '');
    else if (m && !key.startsWith('loop:')) {
      const [, id, side] = m as unknown as [string, string, 'in' | 'out'];
      const list = isStep(id)
        ? side === 'in'
          ? net.stepIn
          : net.stepOut
        : side === 'in'
          ? net.tIn
          : net.tOut;
      list.push(id);
    }
  }
  const tFrom = new Map<string, string[]>();
  const tTo = new Map<string, string[]>();
  const split = new Set<string>();
  for (const net of byRoot.values()) {
    for (const t of net.tOut) tTo.set(t, [...new Set([...(tTo.get(t) ?? []), ...net.stepIn])]);
    for (const t of net.tIn) {
      tFrom.set(t, [...new Set([...(tFrom.get(t) ?? []), ...net.stepOut])]);
      if (!net.and && net.stepOut.length > 1) split.add(t);
    }
    if (net.stepOut.length && net.stepIn.length) invalid++;
    if (net.tOut.length && net.tIn.length) invalid++;
  }
  if (invalid) note('invalidLink', { count: String(invalid) });

  // ---- Actions: the step each one hangs on (directly or along a chain of actions) -------------
  const actionStep = new Map<string, string>();
  const neighbours = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const list = neighbours.get(a);
    if (list) list.push(b);
    else neighbours.set(a, [b]);
  };
  for (const [a, b] of actionLinks) {
    link(a, b);
    link(b, a);
  }
  for (const s of all(isStep)) {
    const queue = (neighbours.get(s.id) ?? []).filter(isAction);
    for (let qi = 0; qi < queue.length; qi++) {
      const a = queue[qi]!;
      if (actionStep.has(a)) continue;
      actionStep.set(a, s.id);
      for (const b of neighbours.get(a) ?? []) if (isAction(b) && !actionStep.has(b)) queue.push(b);
    }
  }

  // ---- Grafcets: frames, then separate charts --------------------------------------------------
  const charts = new UnionFind();
  for (const n of doc.nodes) if (isStep(n.id) || isTransition(n.id)) charts.find(n.id);
  for (const [t, steps] of [...tFrom, ...tTo]) for (const s of steps) charts.union(t, s);

  const groups = new Map<string, Group>();
  const chartMembers = new Map<string, RawNode[]>();
  for (const id of charts.keys()) {
    const root = charts.find(id);
    const members = chartMembers.get(root);
    if (members) members.push(nodes.get(id)!);
    else chartMembers.set(root, [nodes.get(id)!]);
  }
  for (const members of chartMembers.values()) {
    const votes = new Map<RawNode | undefined, number>();
    for (const m of members) {
      const b = boxOf(m.position);
      votes.set(b, (votes.get(b) ?? 0) + 1);
    }
    const box = [...votes].sort((a, b) => b[1] - a[1])[0]![0];
    const key = box ? `box:${box.id}` : `chart:${members[0]!.id}`;
    const g = groups.get(key) ?? { key, name: '', nodes: [], ...(box ? { box } : {}) };
    g.nodes.push(...members);
    groups.set(key, g);
  }
  const bounds = (list: RawNode[]) => {
    const xs = list.map((n) => n.position.x);
    const ys = list.map((n) => n.position.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  };
  const distance = (b: ReturnType<typeof bounds>, p: Point) =>
    Math.hypot(
      Math.max(b.x - p.x, 0, p.x - (b.x + b.width)),
      Math.max(b.y - p.y, 0, p.y - (b.y + b.height)),
    );
  // A loose fragment without an initial step (outside any frame) belongs to the nearest chart.
  const hasInitial = (g: Group) => g.nodes.some((n) => n.type === 'initialStep');
  for (const g of [...groups.values()]) {
    if (g.box || hasInitial(g)) continue;
    const at = bounds(g.nodes);
    const host = [...groups.values()]
      .filter(hasInitial)
      .sort((a, b) => distance(bounds(a.nodes), at) - distance(bounds(b.nodes), at))[0];
    if (!host) continue;
    host.nodes.push(...g.nodes);
    groups.delete(g.key);
  }
  // A frame without steps (e.g. manual commands as actions with a condition) is a grafcet too.
  const freeIn = new Map<RawNode | undefined, RawNode[]>();
  for (const a of all(isAction)) {
    if (actionStep.has(a.id)) continue;
    const b = boxOf(a.position);
    const list = freeIn.get(b);
    if (list) list.push(a);
    else freeIn.set(b, [a]);
  }
  for (const b of boxes) {
    const key = `box:${b.id}`;
    if (groups.has(key)) continue;
    const free = freeIn.get(b) ?? [];
    if (free.length) groups.set(key, { key, name: '', nodes: free, box: b });
  }
  const ordered = [...groups.values()].sort((a, b) => {
    const ba = bounds(a.nodes);
    const bb = bounds(b.nodes);
    return ba.x - bb.x || ba.y - bb.y;
  });

  // Names: the frame's lower label, else the text heading just above the chart.
  const texts = doc.nodes.filter((n) => n.type === 'text');
  const usedTexts = new Set<string>();
  const names = new Set<string>();
  const unique = (base: string) => {
    let n = base.slice(0, LIMITS.nameLength);
    for (let i = 2; names.has(n.toLowerCase()); i++)
      n = `${base.slice(0, LIMITS.nameLength - 4)}_${i}`;
    names.add(n.toLowerCase());
    return n;
  };
  for (const g of ordered) {
    let base = '';
    if (g.box)
      base =
        toIdentifier(field(g.box, 'bottomLabel', 200)) ||
        toIdentifier(`G${field(g.box, 'label', 20)}`);
    else {
      const b = bounds(g.nodes);
      const heading = texts
        .filter(
          (t) =>
            !usedTexts.has(t.id) &&
            !boxOf(t.position) &&
            t.position.y <= b.y + 10 &&
            b.y - t.position.y <= 300 &&
            t.position.x >= b.x - 250 &&
            t.position.x <= b.x + b.width + 250,
        )
        .sort((p, q) => q.position.y - p.position.y)[0];
      if (heading) {
        usedTexts.add(heading.id);
        base = toIdentifier(field(heading, 'label', 200));
      }
    }
    g.name = base && IDENT_RE.test(base) ? unique(base) : '';
  }
  let counter = 1;
  for (const g of ordered) {
    if (g.name) continue;
    while (names.has(`g${counter}`)) counter++;
    g.name = unique(`G${counter}`);
  }

  // ---- Project ---------------------------------------------------------------------------------
  const project = createProject(name.slice(0, LIMITS.shortText) || 'grafcet.io');
  project.grafcets = {};
  project.grafcetOrder = [];
  const created = Date.parse(doc.createdAt ?? '');
  if (Number.isFinite(created)) project.meta.createdAt = new Date(created).toISOString();
  const grafcetOf = new Map<string, Grafcet>();
  const helpers: ForcingHelper[] = [];
  const stepIds = new Map<string, Id>();
  const stepNumbers = new Map<string, number>();

  for (const group of ordered) {
    const g = createGrafcet(group.name);
    project.grafcets[g.id] = g;
    project.grafcetOrder.push(g.id);
    grafcetOf.set(group.key, g);
    const byPos = (a: RawNode, b: RawNode) =>
      a.position.y - b.position.y || a.position.x - b.position.x;
    const steps = group.nodes.filter((n) => isStep(n.id)).sort(byPos);

    // Step numbers: the label's number; duplicates and labels without one get the next free.
    const used = new Set<number>();
    const pending: { s: RawNode; n: number }[] = [];
    for (const s of steps) {
      const m = /\d+/.exec(field(s, 'label', 200));
      const n = m ? Number(m[0]) : NaN;
      const valid = Number.isSafeInteger(n) && n < 999_999;
      if (valid && !used.has(n)) {
        used.add(n);
        stepNumbers.set(s.id, n);
      } else pending.push({ s, n: valid ? n : NaN });
    }
    const last = used.size ? Math.max(...used) : -1;
    for (const { s, n } of pending) {
      // A duplicate takes the next free number after its own; a step without one, after the last.
      let next = Number.isNaN(n) ? last + 1 : n + 1;
      while (used.has(next)) next++;
      used.add(next);
      stepNumbers.set(s.id, next);
      const label = field(s, 'label', 200).trim();
      if (!Number.isNaN(n)) note('renumbered', { grafcet: g.name, from: label, to: String(next) });
      else note('stepNumber', { label, to: String(next) });
    }
    for (const s of steps) {
      const kind = STEP_KINDS[s.type]!;
      const step = addStep(g, s.position, kind, stepNumbers.get(s.id)!);
      const label = field(s, 'label', LIMITS.shortText).trim();
      if (label && !/^\d+$/.test(label)) step.label = label;
      stepIds.set(s.id, step.id);
      if (kind === 'macro') note('macroStep', { number: String(step.number) });
      if (kind === 'enclosing') note('enclosingStep', { number: String(step.number) });
    }

    // Transitions; one per upstream step where alternatives were drawn into one transition.
    for (const t of group.nodes.filter((n) => isTransition(n.id))) {
      const from = (tFrom.get(t.id) ?? []).filter((s) => stepIds.has(s));
      const to = (tTo.get(t.id) ?? []).filter((s) => stepIds.has(s));
      const r = receptivity(field(t, 'label'));
      const ids = (list: string[]) => list.map((s) => stepIds.get(s)!);
      if (t.type === 'transition' && (!from.length || !to.length))
        note('openTransition', { receptivity: r });
      if (split.has(t.id) && from.length > 1) {
        note('splitTransition', {
          receptivity: r,
          steps: from.map((s) => stepNumbers.get(s)).join(', '),
        });
        for (const s of from) addTransition(g, t.position, ids([s]), ids(to), r);
      } else addTransition(g, t.position, ids(from), ids(to), r);
    }
  }

  // ---- Actions ---------------------------------------------------------------------------------
  const nearestGroup = (p: Point): Grafcet | undefined => {
    const box = boxOf(p);
    if (box && grafcetOf.has(`box:${box.id}`)) return grafcetOf.get(`box:${box.id}`);
    let best: { g: Grafcet; d: number } | undefined;
    for (const group of ordered) {
      const d = distance(bounds(group.nodes), p);
      if (!best || d < best.d) best = { g: grafcetOf.get(group.key)!, d };
    }
    return best?.g;
  };
  const fallbackGrafcet = (): Grafcet => {
    const first = project.grafcetOrder[0];
    if (first) return project.grafcets[first]!;
    const g = createGrafcet(unique('G1'));
    project.grafcets[g.id] = g;
    project.grafcetOrder.push(g.id);
    return g;
  };
  const owner = new Map<Id, Grafcet>();
  for (const g of Object.values(project.grafcets))
    for (const s of Object.values(g.steps)) owner.set(s.id, g);

  const actions = all(isAction).sort((a, b) => a.position.x - b.position.x);
  for (const a of actions) {
    const stepNode = actionStep.get(a.id);
    const stepId = stepNode ? stepIds.get(stepNode) : undefined;
    const g = (stepId && owner.get(stepId)) || nearestGroup(a.position) || fallbackGrafcet();
    const n = stepNode ? stepNumbers.get(stepNode) : undefined;
    const type = a.type === 'forcedCommand' ? 'forcing' : field(a, 'actionType', 32);
    const cond = condition(field(a, 'condition'));
    const time = duration(field(a, 'time', 32));
    const lines = field(a, 'label')
      .split(/\r?\n/)
      .flatMap(forcingOrders)
      .map((l) => l.trim())
      .filter(Boolean);
    let offset = 0;
    for (const line of lines) {
      let kind: ActionKind = 'continuous';
      let textOut = convertExpression(line);
      let condition = cond;
      if (type === 'forcing' || FORCING_RE.test(textOut)) {
        if (cond) {
          helpers.push({ order: textOut, condition: n === undefined ? cond : and(`X${n}`, cond) });
          continue;
        }
        kind = 'forcing';
      } else if (textOut.includes(':=')) {
        kind = type === 'set' || type === 'reset' || !cond ? 'storedOnActivation' : 'storedOnEvent';
      } else {
        const id = toIdentifier(textOut);
        if (id !== textOut) note('actionRenamed', { from: textOut, to: id });
        textOut = id;
        const x = n === undefined ? '' : `X${n}`;
        if (type === 'set' || type === 'reset') {
          kind = 'storedOnActivation';
          textOut = `${id} := ${type === 'set' ? 1 : 0}`;
        } else if (type === 'pulse') {
          condition = cond || (x ? `↑${x}` : '');
          note('pulseAction', { name: id, condition });
        } else if (type === 'delayed' && time) {
          condition = and(x ? `${time}/${x}` : cond ? `${time}/(${cond})` : '', x ? cond : '');
        } else if (type === 'limited' && time) {
          condition = and(x ? `/(${time}/${x})` : '', cond);
        }
      }
      const action = stepId
        ? addAction(g, stepId, kind, textOut)
        : addFreeAction(g, { x: a.position.x, y: a.position.y + offset }, kind, textOut);
      offset += 50;
      if (condition) action.condition = condition.slice(0, LIMITS.expression);
    }
  }

  // ---- Comments ----------------------------------------------------------------------------------
  for (const t of texts) {
    if (usedTexts.has(t.id)) continue;
    const label = field(t, 'label', LIMITS.longText).trim();
    if (label) addComment(nearestGroup(t.position) ?? fallbackGrafcet(), t.position, label);
  }

  // ---- Layout: auto-layout of each chart; actions without a step and comments in a column to its
  // right, in their original reading order (top to bottom, then left to right).
  const reading = (a: { position?: Point }, b: { position?: Point }) =>
    a.position!.y - b.position!.y || a.position!.x - b.position!.x;
  for (const g of Object.values(project.grafcets)) {
    // Each separate sequence is laid out on its own and the next one placed below it, so their
    // loops (routed left of whatever is beside them) never cross another sequence.
    const parts = new UnionFind();
    for (const s of Object.values(g.steps)) parts.find(s.id);
    for (const t of Object.values(g.transitions))
      for (const s of [...t.from, ...t.to]) parts.union(t.id, s);
    const byPart = new Map<string, Id[]>();
    for (const id of parts.keys())
      byPart.set(parts.find(id), [...(byPart.get(parts.find(id)) ?? []), id]);
    const position = (id: Id) => (g.steps[id] ?? g.transitions[id])!.position;
    const sequences = [...byPart.values()].sort((a, b) =>
      reading({ position: position(a[0]!) }, { position: position(b[0]!) }),
    );
    let below = null as { x: number; y: number } | null;
    for (const ids of sequences) {
      const only = new Set(ids);
      for (const [id, pos] of autoLayout(g, only)) {
        const el = g.steps[id] ?? g.transitions[id];
        if (el) el.position = pos;
      }
      const left = Math.min(...ids.map((id) => position(id).x));
      const top = Math.min(...ids.map((id) => position(id).y));
      if (below) moveElements(g, ids, below.x - left, below.y - top);
      const b = grafcetBounds(g, computeGeometry(g), only);
      below = { x: below?.x ?? left, y: snap((b ? b.y + b.height : top) + 80) };
    }
    const free = Object.values(g.actions)
      .filter((a) => a.stepId === null)
      .sort(reading);
    const comments = Object.values(g.comments).sort(reading);
    for (const a of free) delete g.actions[a.id];
    g.comments = {};
    const chart = grafcetBounds(g, computeGeometry(g)) ?? { x: 100, y: 100, width: 0, height: 0 };
    const x = snap(chart.x + chart.width + 60);
    let y = snap(chart.y + 20);
    for (const a of free) {
      a.position = { x, y };
      g.actions[a.id] = a;
      y += 70;
    }
    for (const c of comments) {
      c.position = { x, y };
      g.comments[c.id] = c;
      y = snap(y + c.text.split('\n').length * 16 + 40);
    }
  }

  // ---- Forcing orders with a condition: a grafcet whose step holds the order -----------------
  if (helpers.length) {
    let base = 0;
    for (const g of Object.values(project.grafcets))
      for (const s of Object.values(g.steps)) base = Math.max(base, s.number + 1);
    base = Math.ceil(base / 10) * 10;
    let x = 100;
    for (const h of helpers) {
      const target = /^\s*([A-Za-z_]\w*)/.exec(h.order)?.[1] ?? 'G';
      const g = createGrafcet(unique(`Forcing_${target}`));
      const s0 = addStep(g, { x, y: 100 }, 'initial', base);
      const s1 = addStep(g, { x, y: 260 }, 'normal', base + 1);
      addAction(g, s1.id, 'forcing', h.order);
      addTransition(g, { x, y: 180 }, [s0.id], [s1.id], h.condition);
      addTransition(g, { x, y: 340 }, [s1.id], [s0.id], `/(${h.condition})`);
      for (const [id, pos] of autoLayout(g)) {
        const el = g.steps[id] ?? g.transitions[id];
        if (el) el.position = pos;
      }
      project.grafcets[g.id] = g;
      project.grafcetOrder.push(g.id);
      note('forcingHelper', { order: h.order, condition: h.condition, grafcet: g.name });
      base += 10;
      x += 200;
    }
  }
  if (!project.grafcetOrder.length) fallbackGrafcet();

  // ---- Variables: what the expressions use, as the "Create variable" quick fix would ----------
  const found = new Map<string, Variable>();
  const rank = { input: 0, internal: 1, output: 2 } as const;
  const envOf = envFactory(project);
  for (const g of Object.values(project.grafcets)) {
    const env = envOf(g.id);
    for (const { kind, source } of grafcetExpressions(g)) {
      if (!source.trim()) continue;
      for (const d of analyze(kind, source, env).diagnostics) {
        if (!d.create || !IDENT_RE.test(d.create.name)) continue;
        const key = d.create.name.toLowerCase();
        const v = found.get(key) ?? {
          id: newId(),
          name: d.create.name,
          type: d.create.type,
          direction: d.create.direction,
        };
        if (d.create.type !== 'BOOL') v.type = d.create.type;
        if (rank[d.create.direction] > rank[v.direction]) v.direction = d.create.direction;
        found.set(key, v);
      }
    }
  }
  for (const v of found.values()) project.variables[v.id] = v;

  const check = projectSchema.safeParse(project);
  if (!check.success)
    throw new ProjectFileError(
      'invalid',
      'The grafcet.io file could not be converted',
      check.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  return { project: check.data, notes };
}
