/** Actions not attached to any step: model operations, file format, checks and simulation. */
import { describe, expect, it } from 'vitest';
import { parseProjectFile, ProjectFileError, serializeProject } from '@/core/io/projectFile';
import { computeGeometry, grafcetBounds } from '@/core/layout/geometry';
import {
  copyElements,
  parseClipboard,
  pasteElements,
  serializeClipboard,
} from '@/core/model/clipboard';
import { createProject } from '@/core/model/factory';
import {
  addAction,
  addFreeAction,
  attachAction,
  deleteElements,
  detachAction,
  moveElements,
} from '@/core/model/ops';
import type { Grafcet, Project } from '@/core/model/types';
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

  it('are reported and never executed', () => {
    const { p, g } = setup();
    const free = addFreeAction(g, { x: 400, y: 300 }, 'continuous', 'Horn');
    p.variables.h = { id: 'h', name: 'Horn', type: 'BOOL', direction: 'output' };
    const issues = validateProject(p).filter((i) => i.ruleId === 'unattachedAction');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.elementIds).toEqual([free.id]);
    expect(compile(p).actions.find((a) => a.id === free.id)).toBeUndefined();
  });
});
