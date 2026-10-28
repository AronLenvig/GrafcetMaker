import { describe, expect, it } from 'vitest';
import { createProject } from '@/core/model/factory';
import { indexGrafcet } from '@/core/model/graph';
import {
  appendAfterStep,
  appendAfterTransition,
  connect,
  deleteElements,
  disconnectBar,
  moveElements,
} from '@/core/model/ops';
import { addParallelBranch } from '@/core/model/structure';
import {
  copyElements,
  parseClipboard,
  pasteElements,
  serializeClipboard,
} from '@/core/model/clipboard';
import type { Grafcet, Project } from '@/core/model/types';
import { createDocumentStore, isDirty } from '@/editor/store/documentStore';
import { computeGeometry, parseLinkKey, PITCH } from '@/core/layout/geometry';

const G = (p: Project): Grafcet => p.grafcets[p.grafcetOrder[0]!]!;
const stepByNumber = (g: Grafcet, n: number) => Object.values(g.steps).find((s) => s.number === n)!;

/** 0 → T → 1 → T → 2 → T → 3, plus a loop from the last transition back to 0. */
function sequence(): Project {
  const p = createProject('Seq');
  const g = G(p);
  let last = Object.values(g.steps)[0]!.id;
  for (let i = 0; i < 3; i++) last = appendAfterStep(g, last)!.stepId;
  const t = appendAfterStep(g, last)!;
  // Replace the 4th step by a loop back to step 0.
  deleteElements(g, [t.stepId], false);
  connect(g, t.transitionId, stepByNumber(g, 0).id);
  return p;
}

describe('undo/redo with Immer patches', () => {
  it('execute → undo → redo restores exact states', () => {
    const doc = createDocumentStore(createProject('A'));
    const s0 = doc.store.getState().project;
    const gid = s0.grafcetOrder[0]!;
    const stepId = Object.keys(s0.grafcets[gid]!.steps)[0]!;
    expect(doc.execute('Append', (p) => void appendAfterStep(p.grafcets[gid]!, stepId))).toBe(true);
    const s1 = doc.store.getState().project;
    expect(Object.keys(s1.grafcets[gid]!.steps)).toHaveLength(2);

    doc.undo();
    expect(doc.store.getState().project).toEqual(s0);
    doc.redo();
    expect(doc.store.getState().project).toEqual(s1);
  });

  it('records nothing for no-op recipes and clears redo on new edits', () => {
    const doc = createDocumentStore(createProject('A'));
    expect(doc.execute('Nothing', () => {})).toBe(false);
    expect(doc.store.getState().past).toHaveLength(0);
    doc.execute('Rename', (p) => void (p.name = 'B'));
    doc.undo();
    expect(doc.store.getState().future).toHaveLength(1);
    doc.execute('Rename', (p) => void (p.name = 'C'));
    expect(doc.store.getState().future).toHaveLength(0);
  });

  it('a drag transaction is one compact history entry and cancels cleanly', () => {
    const doc = createDocumentStore(createProject('A'));
    const p0 = doc.store.getState().project;
    const gid = p0.grafcetOrder[0]!;
    const sid = Object.keys(p0.grafcets[gid]!.steps)[0]!;
    doc.begin('Move');
    for (let i = 0; i < 20; i++) doc.update((p) => moveElements(p.grafcets[gid]!, [sid], 10, 10));
    doc.commit();
    const { past, project } = doc.store.getState();
    expect(past).toHaveLength(1);
    expect(past[0]!.patches.length).toBeLessThanOrEqual(2);
    expect(project.grafcets[gid]!.steps[sid]!.position).toEqual({ x: 400, y: 300 });
    doc.undo();
    expect(doc.store.getState().project).toEqual(p0);

    doc.begin('Move');
    doc.update((p) => moveElements(p.grafcets[gid]!, [sid], 10, 0));
    doc.cancel();
    expect(doc.store.getState().project).toEqual(p0);
    expect(doc.store.getState().past).toHaveLength(0);
  });

  it('tracks dirty state across save, undo and redo', () => {
    const doc = createDocumentStore(createProject('A'));
    expect(isDirty(doc.store.getState())).toBe(false);
    doc.execute('Rename', (p) => void (p.name = 'B'));
    expect(isDirty(doc.store.getState())).toBe(true);
    doc.markSaved();
    expect(isDirty(doc.store.getState())).toBe(false);
    doc.undo();
    expect(isDirty(doc.store.getState())).toBe(true);
    doc.redo();
    expect(isDirty(doc.store.getState())).toBe(false);
    doc.load(createProject('C'), { dirty: true });
    expect(isDirty(doc.store.getState())).toBe(true);
  });
});

describe('append (Enter)', () => {
  it('appends at the end and inserts in the middle, shifting the rest down', () => {
    const p = sequence();
    const g = G(p);
    const s1 = stepByNumber(g, 1);
    const s2y = stepByNumber(g, 2).position.y;
    const r = appendAfterStep(g, s1.id)!;
    expect(g.steps[r.stepId]!.number).toBe(4); // 2 is taken → next free
    expect(stepByNumber(g, 2).position.y).toBe(s2y + PITCH);
    const idx = indexGrafcet(g);
    expect(idx.outgoing.get(s1.id)!.map((t) => t.id)).toEqual([r.transitionId]);
    expect(idx.outgoing.get(r.stepId)!.flatMap((t) => t.to)).toEqual([stepByNumber(g, 2).id]);
  });

  it('on a transition: adds its missing step, or inserts step + transition', () => {
    const p = createProject('T');
    const g = G(p);
    const s0 = Object.values(g.steps)[0]!;
    const { transitionId } = appendAfterStep(g, s0.id)!;
    const ins = appendAfterTransition(g, transitionId)!;
    expect(ins.transitionId).toBeDefined();
    expect(g.transitions[transitionId]!.to).toEqual([ins.stepId]);
    expect(Object.keys(g.steps)).toHaveLength(3);
  });
});

describe('delete with heal', () => {
  it('splices a middle step out of the sequence and closes the gap', () => {
    const p = sequence();
    const g = G(p);
    const s1 = stepByNumber(g, 1);
    const s2 = stepByNumber(g, 2);
    const s1y = s1.position.y;
    const tin = indexGrafcet(g).incoming.get(s1.id)![0]!;
    deleteElements(g, [s1.id]);
    expect(g.steps[s1.id]).toBeUndefined();
    expect(g.transitions[tin.id]!.to).toEqual([s2.id]);
    expect(Object.keys(g.transitions)).toHaveLength(3);
    expect(g.steps[s2.id]!.position.y).toBe(s1y);
    // Loop back to step 0 is intact.
    expect(indexGrafcet(g).incoming.get(stepByNumber(g, 0).id)).toHaveLength(1);
  });

  it('deleting the last step keeps the transition leading to it (as a sink transition)', () => {
    const p = createProject('T');
    const g = G(p);
    const s0 = Object.values(g.steps)[0]!;
    const r = appendAfterStep(g, s0.id)!;
    g.transitions[r.transitionId]!.receptivity = 'a';
    deleteElements(g, [r.stepId]);
    expect(Object.keys(g.steps)).toEqual([s0.id]);
    expect(g.transitions[r.transitionId]).toMatchObject({
      from: [s0.id],
      to: [],
      receptivity: 'a',
    });
  });

  it('deleting the first step removes its outgoing transition (no accidental source)', () => {
    const p = createProject('T');
    const g = G(p);
    const s0 = Object.values(g.steps)[0]!;
    const r = appendAfterStep(g, s0.id)!;
    deleteElements(g, [s0.id]);
    expect(Object.keys(g.steps)).toEqual([r.stepId]);
    expect(Object.keys(g.transitions)).toHaveLength(0);
  });

  it('deletes several consecutive steps in one go', () => {
    const p = sequence();
    const g = G(p);
    deleteElements(g, [stepByNumber(g, 1).id, stepByNumber(g, 2).id]);
    const numbers = Object.values(g.steps)
      .map((s) => s.number)
      .sort();
    expect(numbers).toEqual([0, 3]);
    expect(Object.keys(g.transitions)).toHaveLength(2);
    const idx = indexGrafcet(g);
    const out0 = idx.outgoing.get(stepByNumber(g, 0).id)!;
    expect(out0[0]!.to).toEqual([stepByNumber(g, 3).id]);
  });

  it('without heal leaves transitions dangling, and undo restores everything', () => {
    const doc = createDocumentStore(sequence());
    const before = doc.store.getState().project;
    const gid = before.grafcetOrder[0]!;
    const s1 = stepByNumber(before.grafcets[gid]!, 1).id;
    doc.execute('Delete', (p) => deleteElements(p.grafcets[gid]!, [s1], false));
    const g = G(doc.store.getState().project);
    expect(Object.keys(g.transitions)).toHaveLength(4);
    expect(
      Object.values(g.transitions).filter((t) => t.to.length === 0 || t.from.length === 0),
    ).toHaveLength(2);
    doc.undo();
    expect(doc.store.getState().project).toEqual(before);
  });
});

describe('AND double lines', () => {
  it('deleting one removes only the links it joins, and undo restores them', () => {
    // 0 → T1 ⇉ (1 ∥ new step) ⇉ T2 → 2
    const p = createProject('P');
    const g = G(p);
    const s0 = stepByNumber(g, 0).id;
    const s1 = appendAfterStep(g, s0)!.stepId;
    appendAfterStep(g, s1);
    const s2 = addParallelBranch(g, s1)!;
    const idx = indexGrafcet(g);
    const t1 = idx.incoming.get(s1)![0]!.id;
    const t2 = idx.outgoing.get(s1)![0]!.id;
    const doc = createDocumentStore(p);
    const before = doc.store.getState().project;
    const gid = before.grafcetOrder[0]!;
    const now = () => G(doc.store.getState().project);

    // The canvas names each double line by a key that Del reads back.
    const refs = computeGeometry(now()).bars.map((b) => parseLinkKey(b.key));
    expect(refs).toEqual(
      expect.arrayContaining([
        { kind: 'bar', transitionId: t1, bar: 'split' },
        { kind: 'bar', transitionId: t2, bar: 'join' },
      ]),
    );

    doc.execute('Delete double line', (d) => disconnectBar(d.grafcets[gid]!, t1, 'split'));
    expect(now().transitions[t1]).toMatchObject({ from: [s0], to: [] });
    expect(now().transitions[t2]!.from).toEqual([s1, s2]);
    doc.execute('Delete double line', (d) => disconnectBar(d.grafcets[gid]!, t2, 'join'));
    expect(now().transitions[t2]!.from).toEqual([]);
    expect(now().transitions[t2]!.to).toHaveLength(1);
    // Every step and transition stays; the lines become a sink and a source.
    expect(Object.keys(now().steps)).toHaveLength(4);
    expect(Object.keys(now().transitions)).toHaveLength(2);
    const geom = computeGeometry(now());
    expect(geom.bars).toEqual([]);
    expect(geom.stubs.map((s) => s.kind).sort()).toEqual(['sink', 'source']);

    doc.undo();
    doc.undo();
    expect(doc.store.getState().project).toEqual(before);
  });

  it('parses only the keys the canvas makes', () => {
    expect(parseLinkKey('t:in:s')).toEqual({
      kind: 'link',
      transitionId: 't',
      side: 'in',
      stepId: 's',
    });
    for (const bad of ['', 't', 't:split:s', 't:in', 't:out:s:x', 't:sink']) {
      expect(parseLinkKey(bad)).toBeNull();
    }
  });
});

describe('copy / paste', () => {
  it('round-trips through text with fresh ids and renumbered steps', () => {
    const p = sequence();
    const g = G(p);
    const ids = [stepByNumber(g, 1).id, stepByNumber(g, 2).id, ...Object.keys(g.transitions)];
    const text = serializeClipboard(copyElements(g, ids)!);
    const payload = parseClipboard(text)!;
    expect(payload).not.toBeNull();
    const created = pasteElements(p, g.id, payload, { x: 200, y: 0 });
    expect(created).toHaveLength(2 + 4);
    const numbers = Object.values(g.steps)
      .map((s) => s.number)
      .sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const id of created) expect(g.steps[id] ?? g.transitions[id]).toBeDefined();
    expect(parseClipboard('{"format":"other"}')).toBeNull();
  });
});
