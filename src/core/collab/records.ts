/**
 * Live collaboration: the project as records whose fields merge independently.
 *
 * Each variable, scenario, grafcet, step, transition, action and comment is a record, and so are
 * the project's name and its grafcet order. Every field of a record is a last-writer-wins
 * register: a version that grows with each change, and a random nonce that breaks ties (the lower
 * one wins). This is the model Excalidraw uses per element, applied per field so that one person
 * moving a step and another renaming it both keep their change. Deleting sets the `$d` field; the
 * record stays as a tombstone so the deletion reaches everyone, and an undo can bring it back.
 *
 * Merging is commutative, associative and idempotent: replicas that received the same registers
 * hold the same records in any order. The project shown is derived from the records by a
 * deterministic repair (references to missing steps dropped, duplicate names resolved), so all
 * replicas show the same project, and it always passes the file schema's integrity checks.
 */
import { z } from 'zod';
import { isSafeKey, LIMITS } from '../model/constants';
import { sameJson } from '../model/json';
import {
  actionSchema,
  commentSchema,
  grafcetSchema,
  idSchema,
  projectMetaSchema,
  projectNameSchema,
  scenarioSchema,
  stepSchema,
  transitionSchema,
  variableSchema,
} from '../model/schema';
import type {
  Action,
  Comment,
  Grafcet,
  GrafcetKind,
  Id,
  Project,
  Scenario,
  Step,
  Transition,
  Variable,
} from '../model/types';

/**
 * p: project name and meta · o: grafcet order · v: variable · x: scenario · g: grafcet (name and
 * kind; its elements are records of their own) · s, t, a, c: step, transition, action, comment.
 */
export type RecordKind = 'p' | 'o' | 'v' | 'x' | 'g' | 's' | 't' | 'a' | 'c';

/** The kind, then the grafcet id for elements, then the record's own id. */
export type RecordKey = [RecordKind, ...Id[]];

/** One field. `x` is the value; a register without `x` means the field is unset. */
export interface Register {
  v: number;
  n: number;
  x?: unknown;
}

export type Fields = Record<string, Register>;

/** Registers of one record, as sent over the wire and stored. */
export type Change = [RecordKey, Fields];

const DELETED = '$d';
const MAX_VERSION = 2 ** 31;
const NONCES = 2 ** 32;
/** Records one replica keeps (tombstones included): twice what a project file may hold. */
const MAX_RECORDS = 2 * LIMITS.elements;

const FIELDS: Record<RecordKind, readonly string[]> = {
  p: ['name', 'meta'],
  o: ['order'],
  v: ['name', 'type', 'direction', 'initialValue', 'address', 'comment'],
  x: ['name', 'events'],
  g: ['name', 'kind'],
  s: ['number', 'kind', 'label', 'position', 'refGrafcetId'],
  t: ['number', 'from', 'to', 'receptivity', 'position', 'routing'],
  a: ['stepId', 'position', 'order', 'kind', 'text', 'condition'],
  c: ['text', 'position'],
};

/** How many ids follow the kind in a key. */
const ARITY: Record<RecordKind, number> = { p: 0, o: 0, v: 1, x: 1, g: 1, s: 2, t: 2, a: 2, c: 2 };

const SCHEMAS: Record<RecordKind, z.ZodObject> = {
  p: z.object({ name: projectNameSchema, meta: projectMetaSchema }),
  o: z.object({ order: z.array(idSchema).max(10_000) }),
  v: variableSchema,
  x: scenarioSchema,
  g: grafcetSchema.pick({ id: true, name: true, kind: true }),
  s: stepSchema,
  t: transitionSchema,
  a: actionSchema,
  c: commentSchema,
};

const keyString = (key: RecordKey): string => JSON.stringify(key);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function isRecordKey(k: unknown): k is RecordKey {
  if (!Array.isArray(k) || typeof k[0] !== 'string' || !Object.hasOwn(ARITY, k[0])) return false;
  if (k.length !== 1 + ARITY[k[0] as RecordKind]) return false;
  return k
    .slice(1)
    .every(
      (id) =>
        typeof id === 'string' && id.length > 0 && id.length <= LIMITS.idLength && isSafeKey(id),
    );
}

function isRegister(r: unknown): r is Register {
  if (!isObject(r) || Object.keys(r).some((k) => k !== 'v' && k !== 'n' && k !== 'x')) return false;
  const { v, n } = r;
  return (
    Number.isInteger(v) &&
    (v as number) >= 1 &&
    (v as number) <= MAX_VERSION &&
    Number.isInteger(n) &&
    (n as number) >= 0 &&
    (n as number) < NONCES
  );
}

/**
 * One field's register as kept, or null when its value is not acceptable for that kind of
 * record. The value is the schema's output, so keys the schema does not know are dropped.
 */
function validField(kind: RecordKind, field: string, reg: Register): Register | null {
  if (field === DELETED)
    return ARITY[kind] > 0 && typeof reg.x === 'boolean' ? { v: reg.v, n: reg.n, x: reg.x } : null;
  if (!FIELDS[kind].includes(field)) return null;
  const schema = SCHEMAS[kind].shape[field] as z.ZodType;
  if (!('x' in reg)) return schema.safeParse(undefined).success ? { v: reg.v, n: reg.n } : null;
  const parsed = schema.safeParse(reg.x);
  return parsed.success ? { v: reg.v, n: reg.n, x: parsed.data } : null;
}

/** Last writer wins: the higher version, then the lower nonce. Equal registers change nothing. */
const wins = (a: Register, b: Register | undefined): boolean =>
  !b || a.v > b.v || (a.v === b.v && a.n < b.n);

interface Rec {
  key: RecordKey;
  fields: Fields;
  /** Bumped whenever a register of the record changes (caches the assembled object). */
  rev: number;
}

type Obj = Record<string, unknown>;

const byId = (a: { id: Id }, b: { id: Id }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const EMPTY: Readonly<Record<Id, never>> = Object.freeze({});

/** Ids that exist, without duplicates; the same array when nothing had to go. */
function keepExisting(ids: Id[], exists: ReadonlySet<Id>): Id[] {
  const seen = new Set<Id>();
  const out = ids.filter((id) => exists.has(id) && !seen.has(id) && seen.add(id));
  return out.length === ids.length ? ids : out;
}

/**
 * A map of objects by id, or `before` itself when it holds exactly these objects. Ids already in
 * `before` keep their place; new ones follow in id order.
 */
function mapOf<T extends { id: Id }>(before: Record<Id, T> | undefined, items: T[]): Record<Id, T> {
  if (before) {
    const keys = Object.keys(before);
    if (keys.length === items.length && items.every((x) => before[x.id] === x)) return before;
  }
  const rest = new Map(items.map((x) => [x.id, x]));
  const out: Record<Id, T> = {};
  for (const id of Object.keys(before ?? EMPTY)) {
    const x = rest.get(id);
    if (!x) continue;
    out[id] = x;
    rest.delete(id);
  }
  for (const x of [...rest.values()].sort(byId)) out[x.id] = x;
  return out;
}

/** `before` when it equals `next`, so unchanged parts keep their identity (memoized drawing). */
const share = <T>(before: T | undefined, next: T): T =>
  before !== undefined && sameJson(before, next) ? before : next;

export class RecordStore {
  private readonly recs = new Map<string, Rec>();
  /** Assembled objects by key: null when deleted or incomplete. */
  private readonly cache = new Map<string, { rev: number; obj: Obj | null }>();
  private rev = 0;
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  /** Records of a whole project, every field at version 1 (the first replica of a session). */
  static fromProject(project: Project, random?: () => number): RecordStore {
    const store = new RecordStore(random);
    const blank: Project = {
      ...project,
      name: '',
      meta: { ...project.meta },
      grafcetOrder: [],
      variables: {},
      grafcets: {},
      scenarios: {},
    };
    store.commitLocal(blank, project);
    return store;
  }

  get size(): number {
    return this.recs.size;
  }

  /** Every record with all its registers: a full state for a newcomer or the stored snapshot. */
  all(): Change[] {
    return [...this.recs.values()].map((r) => [r.key, r.fields]);
  }

  /**
   * Merges registers from elsewhere (untrusted): malformed keys, unknown fields and invalid
   * values are ignored. Returns how many records changed.
   */
  merge(changes: readonly unknown[]): number {
    let changed = 0;
    for (const c of changes) {
      if (!Array.isArray(c) || c.length !== 2 || !isRecordKey(c[0]) || !isObject(c[1])) continue;
      const key = c[0];
      const ks = keyString(key);
      let rec = this.recs.get(ks);
      // Beyond the cap, records already known still merge; new ones are ignored.
      if (!rec && this.recs.size >= MAX_RECORDS) continue;
      let touched = false;
      for (const [field, reg] of Object.entries(c[1])) {
        if (!isRegister(reg) || !wins(reg, rec?.fields[field])) continue;
        const kept = validField(key[0], field, reg);
        if (!kept) continue;
        if (!rec) {
          rec = { key: [...key], fields: {}, rev: 0 };
          this.recs.set(ks, rec);
        }
        rec.fields[field] = kept;
        touched = true;
      }
      if (touched) {
        rec!.rev = ++this.rev;
        changed++;
      }
    }
    return changed;
  }

  /**
   * Records what changed from `prev` to `next` (local edits, compared by identity: unchanged
   * parts of an Immer result are the same objects) as new register versions, and returns them to
   * send. `prev` must be the project these records last described.
   */
  commitLocal(prev: Project, next: Project): Change[] {
    const out = new Map<string, Change>();
    const stamp = (key: RecordKey, field: string, value: unknown) => {
      const ks = keyString(key);
      let rec = this.recs.get(ks);
      if (!rec) {
        rec = { key, fields: {}, rev: 0 };
        this.recs.set(ks, rec);
      }
      const v = Math.min(MAX_VERSION, (rec.fields[field]?.v ?? 0) + 1);
      const reg: Register = { v, n: Math.floor(this.random() * NONCES) };
      if (value !== undefined) reg.x = value;
      rec.fields[field] = reg;
      rec.rev = ++this.rev;
      let change = out.get(ks);
      if (!change) {
        change = [key, {}];
        out.set(ks, change);
      }
      change[1][field] = reg;
    };

    const record = (key: RecordKey, a: object | undefined, b: object | undefined) => {
      if (a === b) return;
      if (!b) {
        stamp(key, DELETED, true);
        return;
      }
      const existing = this.recs.get(keyString(key));
      const ra = a as Obj | undefined;
      const rb = b as Obj;
      for (const f of FIELDS[key[0]]) {
        if (ra) {
          if (ra[f] !== rb[f]) stamp(key, f, rb[f]);
        } else {
          // Added (or brought back): every field, unsetting what an earlier life had set.
          const old = existing?.fields[f];
          if (rb[f] !== undefined || (old && 'x' in old)) stamp(key, f, rb[f]);
        }
      }
      if (!ra && existing?.fields[DELETED]?.x === true) stamp(key, DELETED, false);
    };

    const records = (
      ma: Readonly<Record<Id, object>>,
      mb: Readonly<Record<Id, object>>,
      keyOf: (id: Id) => RecordKey,
    ) => {
      if (ma === mb) return;
      for (const id of Object.keys(ma)) record(keyOf(id), ma[id], mb[id]);
      for (const id of Object.keys(mb))
        if (!Object.hasOwn(ma, id)) record(keyOf(id), undefined, mb[id]);
    };

    if (prev.name !== next.name) stamp(['p'], 'name', next.name);
    if (prev.meta !== next.meta) stamp(['p'], 'meta', next.meta);
    if (prev.grafcetOrder !== next.grafcetOrder) stamp(['o'], 'order', next.grafcetOrder);
    records(prev.variables, next.variables, (id) => ['v', id]);
    records(prev.scenarios ?? EMPTY, next.scenarios ?? EMPTY, (id) => ['x', id]);
    if (prev.grafcets !== next.grafcets) {
      const gids = new Set([...Object.keys(prev.grafcets), ...Object.keys(next.grafcets)]);
      for (const gid of gids) {
        const a = prev.grafcets[gid];
        const b = next.grafcets[gid];
        if (a === b) continue;
        record(['g', gid], a, b);
        // A deleted grafcet hides its elements; they stay for an undo to bring back.
        if (!b) continue;
        records(a?.steps ?? EMPTY, b.steps, (id) => ['s', gid, id]);
        records(a?.transitions ?? EMPTY, b.transitions, (id) => ['t', gid, id]);
        records(a?.actions ?? EMPTY, b.actions, (id) => ['a', gid, id]);
        records(a?.comments ?? EMPTY, b.comments, (id) => ['c', gid, id]);
      }
    }
    return [...out.values()];
  }

  /** The record as an object, or null when deleted or incomplete (cached by revision). */
  private assemble(ks: string, rec: Rec): Obj | null {
    const cached = this.cache.get(ks);
    if (cached && cached.rev === rec.rev) return cached.obj;
    let obj: Obj | null = null;
    if (rec.fields[DELETED]?.x !== true) {
      const kind = rec.key[0];
      const raw: Obj = {};
      if (ARITY[kind] > 0) raw.id = rec.key[rec.key.length - 1];
      for (const f of FIELDS[kind]) {
        const r = rec.fields[f];
        if (r && 'x' in r) raw[f] = r.x;
      }
      if (SCHEMAS[kind].safeParse(raw).success) obj = raw;
    }
    this.cache.set(ks, { rev: rec.rev, obj });
    return obj;
  }

  /** The assembled record, as `prev`'s own object when equal (kept in the cache for next time). */
  private visible(ks: string, rec: Rec, prev: Project): Obj | null {
    const obj = this.assemble(ks, rec);
    if (!obj) return null;
    const [kind, a, b] = rec.key;
    let before: unknown;
    if (kind === 'v') before = prev.variables[a!];
    else if (kind === 'x') before = prev.scenarios?.[a!];
    else if (kind === 's') before = prev.grafcets[a!]?.steps[b!];
    else if (kind === 't') before = prev.grafcets[a!]?.transitions[b!];
    else if (kind === 'a') before = prev.grafcets[a!]?.actions[b!];
    else if (kind === 'c') before = prev.grafcets[a!]?.comments[b!];
    if (before === undefined || before === obj || !sameJson(before, obj)) return obj;
    this.cache.set(ks, { rev: rec.rev, obj: before as Obj });
    return before as Obj;
  }

  /**
   * The project these records describe. Its content depends only on the records (so every
   * replica derives the same project); `prev` supplies the id and the identity of unchanged parts.
   * Repairs: elements of deleted grafcets are hidden, transitions lose links to missing steps, an
   * action of a missing step is hidden, a macro-step to a missing grafcet loses its reference, a
   * duplicate grafcet name gets a suffix (the lowest id keeps it), a duplicate variable name is
   * hidden (the lowest id is shown).
   */
  derive(prev: Project): Project {
    let name = prev.name;
    let meta = prev.meta;
    let rawOrder: Id[] = prev.grafcetOrder;
    const heads = new Map<Id, { name: string; kind: GrafcetKind }>();
    const kids = new Map<Id, { s: Step[]; t: Transition[]; a: Action[]; c: Comment[] }>();
    const vars: Variable[] = [];
    const scens: Scenario[] = [];
    for (const [ks, rec] of this.recs) {
      const obj = this.visible(ks, rec, prev);
      if (!obj) continue;
      const [kind, gid] = rec.key;
      switch (kind) {
        case 'p':
          name = obj.name as string;
          meta = share(prev.meta, obj.meta as Project['meta']);
          break;
        case 'o':
          rawOrder = obj.order as Id[];
          break;
        case 'v':
          vars.push(obj as Variable);
          break;
        case 'x':
          scens.push(obj as Scenario);
          break;
        case 'g':
          heads.set(gid!, obj as { name: string; kind: GrafcetKind });
          break;
        default: {
          let k = kids.get(gid!);
          if (!k) {
            k = { s: [], t: [], a: [], c: [] };
            kids.set(gid!, k);
          }
          (k[kind] as unknown[]).push(obj);
        }
      }
    }

    // Grafcet names are unique (case-insensitive): the lowest id keeps it, the others get _2, _3…
    const gids = [...heads.keys()].sort();
    const rawNames = new Set(gids.map((gid) => heads.get(gid)!.name.toLowerCase()));
    const used = new Set<string>();
    const names = new Map<Id, string>();
    for (const gid of gids) {
      const base = heads.get(gid)!.name;
      let candidate = base;
      for (let k = 2; used.has(candidate.toLowerCase()); k++) {
        const suffix = `_${k}`;
        candidate = base.slice(0, LIMITS.nameLength - suffix.length) + suffix;
        if (rawNames.has(candidate.toLowerCase())) candidate = base;
      }
      used.add(candidate.toLowerCase());
      names.set(gid, candidate);
    }

    const grafcetList: Grafcet[] = [];
    for (const gid of gids) {
      const head = heads.get(gid)!;
      const k = kids.get(gid) ?? { s: [], t: [], a: [], c: [] };
      const before = prev.grafcets[gid];
      const stepIds = new Set(k.s.map((s) => s.id));
      const steps = k.s.map((s) => {
        if (s.refGrafcetId === undefined || heads.has(s.refGrafcetId)) return s;
        const rest = { ...s };
        delete rest.refGrafcetId;
        return share(before?.steps[s.id], rest);
      });
      const transitions = k.t.map((t) => {
        const from = keepExisting(t.from, stepIds);
        const to = keepExisting(t.to, stepIds);
        return from === t.from && to === t.to
          ? t
          : share(before?.transitions[t.id], { ...t, from, to });
      });
      const actions = k.a.flatMap((a) => {
        if (a.stepId !== null) return stepIds.has(a.stepId) ? [a] : [];
        return a.position
          ? [a]
          : [share(before?.actions[a.id], { ...a, position: { x: 0, y: 0 } })];
      });
      const g: Grafcet = {
        id: gid,
        name: names.get(gid)!,
        kind: head.kind,
        steps: mapOf(before?.steps, steps),
        transitions: mapOf(before?.transitions, transitions),
        actions: mapOf(before?.actions, actions),
        comments: mapOf(before?.comments, k.c),
      };
      grafcetList.push(
        before &&
          before.name === g.name &&
          before.kind === g.kind &&
          before.steps === g.steps &&
          before.transitions === g.transitions &&
          before.actions === g.actions &&
          before.comments === g.comments
          ? before
          : g,
      );
    }
    const grafcets = mapOf(prev.grafcets, grafcetList);

    // Variable names are unique (case-insensitive): the lowest id is shown.
    const seen = new Set<string>();
    const variables = mapOf(
      prev.variables,
      vars.sort(byId).filter((v) => {
        const lower = v.name.toLowerCase();
        return !seen.has(lower) && !!seen.add(lower);
      }),
    );

    const order: Id[] = [];
    const placed = new Set<Id>();
    for (const gid of rawOrder) {
      if (!Object.hasOwn(grafcets, gid) || placed.has(gid)) continue;
      order.push(gid);
      placed.add(gid);
    }
    for (const gid of gids) if (!placed.has(gid)) order.push(gid);
    const grafcetOrder = sameJson(prev.grafcetOrder, order) ? prev.grafcetOrder : order;

    const scenarios = scens.length
      ? mapOf(prev.scenarios, scens)
      : prev.scenarios && !Object.keys(prev.scenarios).length
        ? prev.scenarios
        : undefined;

    if (
      name === prev.name &&
      meta === prev.meta &&
      variables === prev.variables &&
      grafcets === prev.grafcets &&
      grafcetOrder === prev.grafcetOrder &&
      scenarios === prev.scenarios
    )
      return prev;
    const out: Project = { ...prev, name, meta, variables, grafcets, grafcetOrder };
    if (scenarios) out.scenarios = scenarios;
    else delete out.scenarios;
    return out;
  }
}
