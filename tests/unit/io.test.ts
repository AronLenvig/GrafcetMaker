import { describe, expect, it } from 'vitest';
import { createProject, createStep } from '@/core/model/factory';
import { SCHEMA_VERSION } from '@/core/model/schema';
import { MigrationError, migrate, type Migration } from '@/core/io/migrations';
import { ProjectFileError, parseProjectFile, serializeProject } from '@/core/io/projectFile';

function sampleProject() {
  const p = createProject('Sample', new Date('2026-01-01T00:00:00Z'));
  const g = p.grafcets[p.grafcetOrder[0]!]!;
  const s0 = Object.values(g.steps)[0]!;
  const s1 = createStep(1, { x: 200, y: 220 });
  g.steps[s1.id] = s1;
  g.transitions.t1 = {
    id: 't1',
    from: [s0.id],
    to: [s1.id],
    receptivity: 'a * /b',
    position: { x: 200, y: 160 },
  };
  g.transitions.t2 = {
    id: 't2',
    from: [s1.id],
    to: [s0.id],
    receptivity: '3s/X1',
    position: { x: 200, y: 280 },
    routing: { sideX: 120 },
  };
  g.actions.a1 = {
    id: 'a1',
    stepId: s1.id,
    order: 0,
    kind: 'continuous',
    text: 'M1',
    condition: 'c',
  };
  g.comments.c1 = { id: 'c1', text: 'Hello\nworld', position: { x: 400, y: 100 } };
  p.variables.v1 = { id: 'v1', name: 'a', type: 'BOOL', direction: 'input', address: '%I0.0' };
  p.variables.v2 = { id: 'v2', name: 'M1', type: 'BOOL', direction: 'output' };
  return p;
}

function errorOf(fn: () => unknown): ProjectFileError {
  try {
    fn();
  } catch (e) {
    if (e instanceof ProjectFileError) return e;
    throw e;
  }
  throw new Error('expected ProjectFileError');
}

describe('project file round-trip', () => {
  it('save → load → save is byte-identical and deep-equal', () => {
    const p = sampleProject();
    const text = serializeProject(p);
    const loaded = parseProjectFile(text);
    expect(loaded).toEqual(p);
    expect(serializeProject(loaded)).toBe(text);
  });

  it('writes keys in canonical schema order regardless of in-memory order', () => {
    const p = sampleProject();
    const shuffled = Object.fromEntries(Object.entries(p).reverse()) as typeof p;
    expect(serializeProject(shuffled)).toBe(serializeProject(p));
  });
});

describe('invalid files are rejected with a clear code', () => {
  it('rejects non-JSON', () => {
    expect(errorOf(() => parseProjectFile('{nope')).code).toBe('notJson');
  });

  it('rejects JSON that is not a project', () => {
    expect(errorOf(() => parseProjectFile('[1,2]')).code).toBe('notProject');
    expect(errorOf(() => parseProjectFile('{"name":"x"}')).code).toBe('notProject');
  });

  it('rejects files from a newer version and reports it', () => {
    const doc = { ...sampleProject(), schemaVersion: SCHEMA_VERSION + 1 };
    const err = errorOf(() => parseProjectFile(JSON.stringify(doc)));
    expect(err.code).toBe('newerVersion');
    expect(err.version).toBe(SCHEMA_VERSION + 1);
  });

  it('rejects dangling references with a path to the problem', () => {
    const p = sampleProject();
    const g = p.grafcets[p.grafcetOrder[0]!]!;
    g.transitions.t1!.to = ['missing'];
    const err = errorOf(() => parseProjectFile(JSON.stringify(p)));
    expect(err.code).toBe('invalid');
    expect(err.details.join('\n')).toMatch(/unknown step "missing"/);
  });

  it('rejects duplicate variable names case-insensitively', () => {
    const p = sampleProject();
    p.variables.v3 = { id: 'v3', name: 'A', type: 'BOOL', direction: 'input' };
    expect(errorOf(() => parseProjectFile(JSON.stringify(p))).code).toBe('invalid');
  });

  it('rejects invalid identifiers and oversize files', () => {
    const p = sampleProject();
    p.variables.v1!.name = '1abc';
    expect(errorOf(() => parseProjectFile(JSON.stringify(p))).code).toBe('invalid');
    expect(errorOf(() => parseProjectFile('{}', 11 * 1024 * 1024)).code).toBe('tooLarge');
  });
});

describe('migration chain', () => {
  const chain: Record<number, Migration> = {
    1: (d) => ({ ...d, renamed: d.old, old: undefined }),
    2: (d) => ({ ...d, added: true }),
  };

  it('applies each step in order and stamps the version', () => {
    const out = migrate({ schemaVersion: 1, old: 'x' }, 1, 3, chain);
    expect(out).toMatchObject({ schemaVersion: 3, renamed: 'x', added: true });
  });

  it('is a no-op at the current version', () => {
    const doc = { schemaVersion: 3 };
    expect(migrate(doc, 3, 3, chain)).toBe(doc);
  });

  it('fails clearly when a step is missing', () => {
    expect(() => migrate({ schemaVersion: 0 }, 0, 3, chain)).toThrow(MigrationError);
  });
});
