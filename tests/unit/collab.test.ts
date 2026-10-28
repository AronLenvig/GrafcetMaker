import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { RecordStore, type Change } from '@/core/collab/records';
import {
  formatRoomHash,
  importRoomKey,
  message,
  newRoomId,
  newRoomKey,
  parseRoomHash,
  readMessage,
  seal,
  unseal,
} from '@/core/collab/wire';
import { createGrafcet, createProject } from '@/core/model/factory';
import { sameJson } from '@/core/model/json';
import {
  addAction,
  addStep,
  appendAfterStep,
  connect,
  deleteElements,
  moveElements,
} from '@/core/model/ops';
import { projectSchema } from '@/core/model/schema';
import type { Grafcet, Project } from '@/core/model/types';
import { createDocumentStore } from '@/editor/store/documentStore';

/** Deterministic pseudo-random numbers (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One participant: its records, and the project it shows (as the live session keeps them). */
class Replica {
  store: RecordStore;
  doc: Project;

  constructor(store: RecordStore, doc: Project) {
    this.store = store;
    this.doc = doc;
  }

  static first(project: Project): Replica {
    return new Replica(RecordStore.fromProject(project), project);
  }

  /** Joins from a full state, like a newcomer receiving the leader's sync. */
  static join(state: Change[], pid: string): Replica {
    const store = new RecordStore();
    store.merge(state);
    const blank = { ...createProject(''), id: pid, grafcets: {}, grafcetOrder: [] };
    return new Replica(store, store.derive(blank));
  }

  edit(recipe: (d: Project) => void): Change[] {
    const next = produce(this.doc, recipe);
    const changes = this.store.commitLocal(this.doc, next);
    this.doc = this.store.derive(next);
    return changes;
  }

  receive(changes: Change[]): void {
    this.store.merge(JSON.parse(JSON.stringify(changes)) as unknown[]);
    this.doc = this.store.derive(this.doc);
  }
}

const G = (p: Project): Grafcet => p.grafcets[p.grafcetOrder[0]!]!;
const firstStep = (p: Project) => Object.values(G(p).steps)[0]!;

/** Same content (key order and an empty scenario map aside). */
function expectSame(a: Project, b: Project): void {
  const norm = (p: Project) => ({ ...p, scenarios: p.scenarios ?? {} });
  expect(sameJson(norm(a), norm(b))).toBe(true);
}

function expectValid(p: Project): void {
  const r = projectSchema.safeParse(JSON.parse(JSON.stringify(p)));
  expect(r.success ? [] : r.error.issues).toEqual([]);
}

describe('live collaboration records', () => {
  it('describe a project exactly, and keep its objects when nothing changed', () => {
    const p = createProject('Seq');
    appendAfterStep(G(p), firstStep(p).id);
    const a = Replica.first(p);
    const b = Replica.join(a.store.all(), p.id);
    expectSame(b.doc, p);
    expect(a.store.derive(p)).toBe(p);
    expect(b.store.derive(b.doc)).toBe(b.doc);
  });

  it('merge fields independently: a move and a rename of the same step both stay', () => {
    const a = Replica.first(createProject('P'));
    const b = Replica.join(a.store.all(), a.doc.id);
    const sid = firstStep(a.doc).id;
    const ca = a.edit((d) => moveElements(G(d), [sid], 50, 0));
    const cb = b.edit((d) => {
      G(d).steps[sid]!.label = 'Ready';
    });
    a.receive(cb);
    b.receive(ca);
    expectSame(a.doc, b.doc);
    expect(G(a.doc).steps[sid]).toMatchObject({ label: 'Ready', position: { x: 250 } });
  });

  it('carry every field of the file format, such as a rotated transition', () => {
    const p = createProject('P');
    const tid = appendAfterStep(G(p), firstStep(p).id)!.transitionId;
    const a = Replica.first(p);
    const b = Replica.join(a.store.all(), p.id);
    b.receive(
      a.edit((d) => {
        G(d).transitions[tid]!.flow = 'left';
      }),
    );
    expect(G(b.doc).transitions[tid]!.flow).toBe('left');
    expectSame(Replica.join(a.store.all(), p.id).doc, a.doc);
  });

  it('pick the same winner everywhere when the same field changes at once', () => {
    const a = Replica.first(createProject('P'));
    const b = Replica.join(a.store.all(), a.doc.id);
    const sid = firstStep(a.doc).id;
    const ca = a.edit((d) => void (G(d).steps[sid]!.label = 'A'));
    const cb = b.edit((d) => void (G(d).steps[sid]!.label = 'B'));
    a.receive(cb);
    b.receive(ca);
    expectSame(a.doc, b.doc);
    expect(['A', 'B']).toContain(G(a.doc).steps[sid]!.label);
  });

  it('repair links to a step deleted while someone connected to it', () => {
    const p = createProject('P');
    const pair = appendAfterStep(G(p), firstStep(p).id)!;
    const a = Replica.first(p);
    const b = Replica.join(a.store.all(), p.id);
    const ca = a.edit((d) => deleteElements(G(d), [pair.stepId], false));
    const cb = b.edit((d) => {
      const s = addStep(G(d), { x: 400, y: 100 });
      connect(G(d), pair.transitionId, s.id);
      addAction(G(d), pair.stepId, 'continuous', 'M1');
    });
    a.receive(cb);
    b.receive(ca);
    expectSame(a.doc, b.doc);
    expectValid(a.doc);
    const t = G(a.doc).transitions[pair.transitionId]!;
    expect(t.to).not.toContain(pair.stepId);
    expect(Object.values(G(a.doc).actions)).toEqual([]);
  });

  it('resolve names created twice at once', () => {
    const a = Replica.first(createProject('P'));
    const b = Replica.join(a.store.all(), a.doc.id);
    const addBoth = (r: Replica, vid: string, gid: string) =>
      r.edit((d) => {
        d.variables[vid] = { id: vid, name: 'start', type: 'BOOL', direction: 'input' };
        const g = { ...createGrafcet('G2'), id: gid };
        d.grafcets[gid] = g;
        d.grafcetOrder.push(gid);
      });
    const ca = addBoth(a, 'va', 'ga');
    const cb = addBoth(b, 'vb', 'gb');
    a.receive(cb);
    b.receive(ca);
    expectSame(a.doc, b.doc);
    expectValid(a.doc);
    expect(Object.keys(a.doc.variables)).toEqual(['va']);
    expect([a.doc.grafcets.ga!.name, a.doc.grafcets.gb!.name]).toEqual(['G2', 'G2_2']);
  });

  it('converge on the same valid project after random concurrent edits', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const random = rng(seed);
      const pick = <T>(xs: T[]): T | undefined => xs[Math.floor(random() * xs.length)];
      const start = createProject('Random');
      appendAfterStep(G(start), firstStep(start).id);
      const first = Replica.first(start);
      const replicas = [first, Replica.join(first.store.all(), start.id)];
      replicas.push(Replica.join(first.store.all(), start.id));
      const inbox: Change[][][] = replicas.map(() => []);

      const randomEdit = (d: Project) => {
        const g = pick(Object.values(d.grafcets));
        const step = g && pick(Object.values(g.steps));
        const tr = g && pick(Object.values(g.transitions));
        switch (Math.floor(random() * 12)) {
          case 0:
            if (step) appendAfterStep(g, step.id);
            break;
          case 1:
            // Rarer than additions, so diagrams grow.
            if (step && random() < 0.3) deleteElements(g, [step.id], random() < 0.5);
            break;
          case 2:
            if (step) moveElements(g, [step.id], 10, 20);
            break;
          case 3:
            if (step) step.label = pick(['a', 'b', 'c']);
            break;
          case 4:
            if (tr) tr.receptivity = pick(['x', 'y', '1'])!;
            break;
          case 5:
            if (tr && step) connect(g, tr.id, step.id);
            break;
          case 6:
            if (step) addAction(g, step.id, 'continuous', 'M');
            break;
          case 7: {
            const name = pick(['a', 'b', 'start'])!;
            if (Object.values(d.variables).some((v) => v.name === name)) break;
            const id = `v${Math.floor(random() * 1e9)}`;
            d.variables[id] = { id, name, type: 'BOOL', direction: 'input' };
            break;
          }
          case 8: {
            const v = pick(Object.values(d.variables));
            if (v) delete d.variables[v.id];
            break;
          }
          case 9: {
            const name = pick(['G2', 'G3'])!;
            if (Object.values(d.grafcets).some((x) => x.name === name)) break;
            const ng = createGrafcet(name);
            addStep(ng, { x: 100, y: 100 }, 'initial', 10);
            d.grafcets[ng.id] = ng;
            d.grafcetOrder.push(ng.id);
            break;
          }
          case 10:
            if (g && d.grafcetOrder.length > 1 && random() < 0.15) {
              delete d.grafcets[g.id];
              d.grafcetOrder = d.grafcetOrder.filter((x) => x !== g.id);
            }
            break;
          default:
            d.grafcetOrder.reverse();
            d.name = pick(['P1', 'P2'])!;
        }
      };

      for (let i = 0; i < 300; i++) {
        const from = Math.floor(random() * replicas.length);
        const changes = replicas[from]!.edit(randomEdit);
        expectValid(replicas[from]!.doc);
        if (changes.length) inbox.forEach((box, to) => to !== from && box.push(changes));
        // Deliver some pending messages, in any order.
        for (const [to, box] of inbox.entries()) {
          while (box.length && random() < 0.4) {
            const [msg] = box.splice(Math.floor(random() * box.length), 1);
            replicas[to]!.receive(msg!);
          }
        }
      }
      inbox.forEach((box, to) => box.splice(0).forEach((m) => replicas[to]!.receive(m)));
      for (const r of replicas) {
        expectValid(r.doc);
        expectSame(r.doc, replicas[0]!.doc);
      }
      // A latecomer gets the same project from a full state.
      expectSame(Replica.join(replicas[1]!.store.all(), start.id).doc, replicas[0]!.doc);
    }
  });
});

describe('undo in a live session', () => {
  it('keeps changes someone else made to other fields and records', () => {
    const p = createProject('P');
    const doc = createDocumentStore(p);
    const gid = p.grafcetOrder[0]!;
    const sid = firstStep(p).id;
    doc.execute('label', (d) => void (d.grafcets[gid]!.steps[sid]!.label = 'mine'));
    // Someone else moves the same step and adds one.
    doc.applyRemote(
      produce(doc.store.getState().project, (d) => {
        moveElements(d.grafcets[gid]!, [sid], 100, 0);
        addStep(d.grafcets[gid]!, { x: 0, y: 0 });
      }),
    );
    expect(doc.undo()).toBe(false);
    const g = doc.store.getState().project.grafcets[gid]!;
    expect(g.steps[sid]!.label).toBeUndefined();
    expect(g.steps[sid]!.position.x).toBe(300);
    expect(Object.keys(g.steps)).toHaveLength(2);
    doc.redo();
    expect(doc.store.getState().project.grafcets[gid]!.steps[sid]!.label).toBe('mine');
  });

  it('skips a field someone else changed since, and says so', () => {
    const p = createProject('P');
    const doc = createDocumentStore(p);
    const gid = p.grafcetOrder[0]!;
    const sid = firstStep(p).id;
    doc.execute('label', (d) => void (d.grafcets[gid]!.steps[sid]!.label = 'mine'));
    doc.execute('move', (d) => moveElements(d.grafcets[gid]!, [sid], 10, 0));
    doc.applyRemote(
      produce(doc.store.getState().project, (d) => {
        d.grafcets[gid]!.steps[sid]!.position = { x: 500, y: 500 };
      }),
    );
    // The move cannot be undone (the position is theirs now); the label change before it is.
    expect(doc.undo()).toBe(true);
    const s = doc.store.getState().project.grafcets[gid]!.steps[sid]!;
    expect(s.position).toEqual({ x: 500, y: 500 });
    expect(s.label).toBeUndefined();
    expect(doc.store.getState().past).toHaveLength(0);
  });

  it('cancels a drag whose element was deleted meanwhile without failing', () => {
    const p = createProject('P');
    const doc = createDocumentStore(p);
    const gid = p.grafcetOrder[0]!;
    const sid = firstStep(p).id;
    doc.begin('move');
    doc.update((d) => moveElements(d.grafcets[gid]!, [sid], 10, 0));
    doc.applyRemote(
      produce(doc.store.getState().project, (d) => {
        delete d.grafcets[gid]!.steps[sid];
      }),
    );
    doc.cancel();
    expect(doc.store.getState().project.grafcets[gid]!.steps[sid]).toBeUndefined();
  });
});

describe('live session links and messages', () => {
  it('round-trips room links', async () => {
    const link = { id: newRoomId(), key: await newRoomKey() };
    expect(parseRoomHash(formatRoomHash(link))).toEqual(link);
    expect(parseRoomHash('#room=short,key')).toBeNull();
    expect(parseRoomHash('#share=abc')).toBeNull();
  });

  it('seals and opens messages, and refuses altered or foreign ones', async () => {
    const key = await importRoomKey(await newRoomKey());
    const other = await importRoomKey(await newRoomKey());
    const big = message({
      type: 'changes',
      records: [['p', { name: { v: 1, n: 0, x: 'x'.repeat(5000) } }]],
    });
    for (const m of [message({ type: 'changes', records: [] }), big]) {
      const sealed = await seal(key, m);
      expect(readMessage(await unseal(key, sealed))).toEqual(m);
    }
    const sealed = await seal(key, big);
    await expect(unseal(other, sealed)).rejects.toThrow();
    const flipped = sealed.slice(0, 20) + (sealed[20] === 'A' ? 'B' : 'A') + sealed.slice(21);
    await expect(unseal(key, flipped)).rejects.toThrow();
  });

  it('ignores records and ids named like built-in properties, and fields it does not know', () => {
    const p = createProject('Seq');
    const a = Replica.first(p);
    const gid = p.grafcetOrder[0]!;
    const reg = (x: unknown) => ({ v: 9, n: 0, x });
    const hostile: unknown[] = [
      [['o'], { order: reg(['constructor', gid]) }],
      [['g', '__proto__'], { name: reg('Evil'), kind: reg('partial') }],
      [
        ['s', 'constructor', 'x1'],
        { number: reg(5), kind: reg('normal'), position: reg({ x: 0, y: 0 }) },
      ],
      [
        ['s', gid, 'toString'],
        { number: reg(6), kind: reg('normal'), position: reg({ x: 0, y: 0 }) },
      ],
    ];
    expect(a.store.merge(hostile)).toBe(0);
    const s = firstStep(p);
    a.store.merge([
      [['s', gid, s.id], { position: reg({ x: 10, y: 20, junk: 'x'.repeat(1000) }) }],
    ]);
    const next = a.store.derive(a.doc);
    expect(next.grafcets[gid]!.steps[s.id]!.position).toEqual({ x: 10, y: 20 });
    expectValid(next);
    const presence = {
      cid: 'c',
      name: 'Eve',
      g: gid,
      c: null,
      sel: ['constructor'],
      ed: null,
      sim: false,
    };
    expect(readMessage({ p: 1, s: p.schemaVersion, type: 'presence', presence })).toBeNull();
  });

  it('recognizes messages from a newer version', () => {
    expect(readMessage({ p: 99, s: 1, type: 'changes', records: [] })).toBe('newer');
    expect(readMessage({ p: 1, s: 999, type: 'changes', records: [] })).toBe('newer');
    expect(readMessage({ p: 1, type: 'nonsense' })).toBeNull();
  });
});
