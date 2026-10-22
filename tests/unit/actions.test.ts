/** Actions not attached to any step: model operations, file format, checks and simulation. */
import { describe, expect, it } from 'vitest';
import { parseProjectFile, ProjectFileError, serializeProject } from '@/core/io/projectFile';
import { actionDecor, computeGeometry, grafcetBounds } from '@/core/layout/geometry';
import {
  copyElements,
  parseClipboard,
  pasteElements,
  serializeClipboard,
} from '@/core/model/clipboard';
import { createGrafcet, createProject } from '@/core/model/factory';
import {
  addAction,
  addFreeAction,
  addStep,
  addTransition,
  attachAction,
  deleteElements,
  detachAction,
  moveElements,
  moveGrafcetTo,
} from '@/core/model/ops';
import type { Action, Grafcet, Project, Variable } from '@/core/model/types';
import { setUiKind, uiKindOf } from '@/core/model/actionKind';
import { generatePlcOpen } from '@/core/codegen/plcopen';
import { generateSt } from '@/core/codegen/st';
import { Simulator } from '@/core/simulation/engine';
import { compile } from '@/core/simulation/program';
import { validateProject } from '@/core/validation/validate';

function setup(): { p: Project; g: Grafcet; step: string } {
  const p = createProject('Test', new Date('2026-01-01T00:00:00Z'));
  const g = p.grafcets[p.grafcetOrder[0]!]!;
  return { p, g, step: Object.keys(g.steps)[0]! };
}

describe('unattached actions', () => {
  it('can be created, attached after the step’s actions, and detached again', () => {
    const { g, step } = setup();
    const first = addAction(g, step, 'continuous', 'Lamp');
    const free = addFreeAction(g, { x: 400, y: 300 }, 'continuous', 'Horn');
    expect(free).toMatchObject({ stepId: null, position: { x: 400, y: 300 } });

    attachAction(g, free.id, step);
    expect(g.actions[free.id]).toMatchObject({ stepId: step, order: first.order + 1 });
    expect(g.actions[free.id]!.position).toBeUndefined();

    detachAction(g, free.id, { x: 100, y: 200 });
    expect(g.actions[free.id]).toMatchObject({ stepId: null, position: { x: 100, y: 200 } });
  });

  it('move on their own and count in the drawing bounds', () => {
    const { g } = setup();
    const free = addFreeAction(g, { x: 900, y: 900 }, 'continuous', 'Horn');
    moveElements(g, [free.id], 20, -10);
    expect(g.actions[free.id]!.position).toEqual({ x: 920, y: 890 });
    const b = grafcetBounds(g, computeGeometry(g))!;
    expect(b.x + b.width).toBeGreaterThan(920);
    deleteElements(g, [free.id]);
    expect(g.actions[free.id]).toBeUndefined();
  });

  it('are saved (format version 2) and loaded back identically', () => {
    const { p, g } = setup();
    addFreeAction(g, { x: 400, y: 300 }, 'storedOnActivation', 'C := 0');
    const text = serializeProject(p);
    expect(JSON.parse(text).schemaVersion).toBe(2);
    expect(parseProjectFile(text)).toEqual(p);
  });

  it('must have a position', () => {
    const { p, g } = setup();
    const free = addFreeAction(g, { x: 400, y: 300 });
    delete g.actions[free.id]!.position;
    expect(() => parseProjectFile(serializeProject(p))).toThrow(ProjectFileError);
  });

  it('opens version 1 files unchanged', () => {
    const { p, g, step } = setup();
    addAction(g, step, 'continuous', 'Lamp');
    const v1 = JSON.parse(serializeProject(p)) as Record<string, unknown>;
    v1.schemaVersion = 1;
    expect(parseProjectFile(JSON.stringify(v1))).toEqual(p);
  });

  it('are copied and pasted on their own', () => {
    const { p, g } = setup();
    const free = addFreeAction(g, { x: 400, y: 300 }, 'continuous', 'Horn');
    const payload = parseClipboard(serializeClipboard(copyElements(g, [free.id])!))!;
    const created = pasteElements(p, g.id, payload, { x: 20, y: 20 });
    expect(created).toHaveLength(1);
    expect(g.actions[created[0]!]).toMatchObject({
      stepId: null,
      text: 'Horn',
      position: { x: 420, y: 320 },
    });
  });

  it('only warn when stored on deactivation (never deactivated)', () => {
    const { p, g } = setup();
    addFreeAction(g, { x: 400, y: 300 }, 'continuous', 'Horn');
    const deact = addFreeAction(g, { x: 400, y: 380 }, 'storedOnDeactivation', 'Horn := 0');
    p.variables.h = { id: 'h', name: 'Horn', type: 'BOOL', direction: 'output' };
    const issues = validateProject(p).filter((i) => i.ruleId === 'unattachedAction');
    expect(issues.map((i) => i.elementIds)).toEqual([[deact.id]]);
  });
});

/** A project with one grafcet: initial step 0 → (go) → step 1 → (/go) → 0, plus actions. */
function machine(actions: (g: Grafcet, s0: string, s1: string) => void, extra: Variable[] = []) {
  const { p, g, step: s0 } = setup();
  const s1 = addStep(g, { x: 200, y: 220 }, 'normal', 1).id;
  addTransition(g, { x: 200, y: 160 }, [s0], [s1], 'go');
  addTransition(g, { x: 200, y: 280 }, [s1], [s0], '/go');
  for (const v of [
    { id: 'go', name: 'go', type: 'BOOL', direction: 'input' },
    { id: 'a', name: 'a', type: 'BOOL', direction: 'input' },
    { id: 'pulse', name: 'pulse', type: 'BOOL', direction: 'input' },
    { id: 'Horn', name: 'Horn', type: 'BOOL', direction: 'output' },
    { id: 'C', name: 'C', type: 'INT', direction: 'internal' },
    ...extra,
  ] as Variable[])
    p.variables[v.id] = v;
  actions(g, s0, s1);
  const sim = new Simulator(compile(p));
  sim.start();
  return { p, g, sim, value: (n: string) => sim.snapshot().values[n.toLowerCase()] };
}

describe('actions without a step are always active', () => {
  it('a continuous action follows its assignment condition, whatever the steps', () => {
    const { sim, value } = machine((g) => {
      const h = addFreeAction(g, { x: 400, y: 100 }, 'continuous', 'Horn');
      h.condition = 'a';
    });
    expect(value('Horn')).toBe(false);
    sim.setInputs({ a: true });
    expect(value('Horn')).toBe(true);
    sim.setInputs({ go: true });
    expect(value('Horn')).toBe(true);
    sim.setInputs({ a: false });
    expect(value('Horn')).toBe(false);
  });

  it('without a condition it is always true, and ORs with step actions', () => {
    const { sim, value } = machine((g, _s0, s1) => {
      addFreeAction(g, { x: 400, y: 100 }, 'continuous', 'Horn').condition = 'a';
      addAction(g, s1, 'continuous', 'Horn');
    });
    expect(value('Horn')).toBe(false);
    sim.setInputs({ go: true });
    expect(value('Horn')).toBe(true);
    expect(
      machine((g) => void addFreeAction(g, { x: 0, y: 0 }, 'continuous', 'Horn')).value('Horn'),
    ).toBe(true);
  });

  it('runs stored actions on its event, and on activation once at start', () => {
    const { sim, value } = machine((g) => {
      addFreeAction(g, { x: 400, y: 100 }, 'storedOnActivation', 'C := 5');
      addFreeAction(g, { x: 400, y: 160 }, 'storedOnEvent', 'C := C + 1').condition = '↑pulse';
    });
    expect(value('C')).toBe(5);
    sim.setInputs({ pulse: true });
    sim.setInputs({ pulse: false });
    sim.setInputs({ pulse: true });
    expect(value('C')).toBe(7);
    sim.setInputs({ go: true });
    expect(value('C')).toBe(7);
  });

  it('a forcing order without a step is always in force', () => {
    const { p, g } = setup();
    const g2 = createGrafcet('G2');
    const t0 = addStep(g2, { x: 200, y: 100 }, 'initial', 10).id;
    const t1 = addStep(g2, { x: 200, y: 220 }, 'normal', 11).id;
    addTransition(g2, { x: 200, y: 160 }, [t0], [t1], '1');
    p.grafcets[g2.id] = g2;
    p.grafcetOrder.push(g2.id);
    addFreeAction(g, { x: 400, y: 100 }, 'forcing', 'G2{INIT}');
    const sim = new Simulator(compile(p));
    sim.start();
    expect(sim.snapshot().active).toContain(t0);
    expect(sim.snapshot().active).not.toContain(t1);
  });

  it('are generated as always-active code', () => {
    const { p } = machine((g) => {
      addFreeAction(g, { x: 400, y: 100 }, 'continuous', 'Horn').condition = 'a';
      addFreeAction(g, { x: 400, y: 160 }, 'storedOnEvent', 'C := C + 1').condition = '↑pulse';
      addFreeAction(g, { x: 400, y: 220 }, 'storedOnActivation', 'C := 5');
    });
    const opts = { version: '1.0.0', date: new Date('2026-01-02T03:04:00Z') };
    const code = generateSt(p, opts).code;
    expect(code).toContain('Horn := a;');
    expect(code).toMatch(/IF RE_1.Q THEN .*on event/);
    expect(code).toMatch(/IF Init THEN .*on activation/);
    const xml = generatePlcOpen(p, opts).code;
    expect(xml).toContain('<pou name="GRAFCET_Always" pouType="program">');
    expect(xml).toContain('Horn := (a);');
  });
});

describe('action kinds', () => {
  const action = (over: Partial<Action> = {}): Action => ({
    id: 'a',
    stepId: 's',
    order: 0,
    kind: 'continuous',
    text: 'Lamp',
    ...over,
  });

  it('reads "conditional" from a continuous action with a condition', () => {
    expect(uiKindOf(action())).toBe('continuous');
    expect(uiKindOf(action({ condition: '' }))).toBe('conditional');
    expect(uiKindOf(action({ condition: 'a' }))).toBe('conditional');
    expect(uiKindOf(action({ kind: 'storedOnEvent', condition: '↑b' }))).toBe('storedOnEvent');
  });

  it('keeps the condition only where it still means something', () => {
    const a = action();
    setUiKind(a, 'conditional');
    expect(a).toMatchObject({ kind: 'continuous', condition: '' });
    a.condition = 'x';
    setUiKind(a, 'storedOnEvent');
    expect(a).toMatchObject({ kind: 'storedOnEvent', condition: 'x' });
    setUiKind(a, 'conditional');
    expect(a).toMatchObject({ kind: 'continuous', condition: 'x' });
    setUiKind(a, 'continuous');
    expect(a.condition).toBeUndefined();
    a.condition = 'y';
    setUiKind(a, 'storedOnActivation');
    expect(a.condition).toBeUndefined();
  });

  it('draws the condition line of a conditional action before its condition is written', () => {
    const box = { x: 0, y: 0, width: 60, height: 40 };
    expect(actionDecor(action({ condition: '' }), box).stem).toBeDefined();
    expect(actionDecor(action(), box).stem).toBeUndefined();
  });

  it('warns about a conditional action without its condition', () => {
    const { p, g, step } = setup();
    const a = addAction(g, step, 'continuous', 'Lamp');
    a.condition = '';
    p.variables.l = { id: 'l', name: 'Lamp', type: 'BOOL', direction: 'output' };
    expect(validateProject(p).map((i) => i.ruleId)).toContain('missingCondition');
  });
});

describe('stored actions written as the variable alone', () => {
  it('set the BOOL to TRUE, in simulation and generated code', () => {
    const { p, sim, value } = machine((g, _s0, s1) => {
      addAction(g, s1, 'storedOnActivation', 'Horn');
    });
    expect(value('Horn')).toBe(false);
    sim.setInputs({ go: true });
    expect(value('Horn')).toBe(true);
    sim.setInputs({ go: false });
    expect(value('Horn')).toBe(true);
    const opts = { version: '1.0.0', date: new Date('2026-01-02T03:04:00Z') };
    expect(generateSt(p, opts).code).toContain('Horn := TRUE;');
    expect(generatePlcOpen(p, opts).code).toContain('qualifier="S"');
  });
});

describe('grafcet tab order', () => {
  it('moves a grafcet to any position', () => {
    const { p } = setup();
    for (const name of ['G2', 'G3', 'G4']) {
      const g = createGrafcet(name);
      p.grafcets[g.id] = g;
      p.grafcetOrder.push(g.id);
    }
    const names = () => p.grafcetOrder.map((id) => p.grafcets[id]!.name);
    const id = (n: string) => p.grafcetOrder.find((g) => p.grafcets[g]!.name === n)!;
    moveGrafcetTo(p, id('G4'), 0);
    expect(names()).toEqual(['G4', 'G1', 'G2', 'G3']);
    moveGrafcetTo(p, id('G1'), 3);
    expect(names()).toEqual(['G4', 'G2', 'G3', 'G1']);
    moveGrafcetTo(p, id('G2'), 99);
    expect(names()).toEqual(['G4', 'G3', 'G1', 'G2']);
  });
});
