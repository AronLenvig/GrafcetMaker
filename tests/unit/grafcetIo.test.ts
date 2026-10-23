/**
 * grafcet.io import: links through branch bars and loop markers, grouping into partial grafcets,
 * action types, expression syntax, notes, variables, and rejection of unreadable files.
 */
import { describe, expect, it } from 'vitest';
import {
  importGrafcetIo,
  isGrafcetIo,
  separateComparisons,
  convertExpression,
} from '@/core/io/grafcetIo';
import { parseProjectFile, ProjectFileError, serializeProject } from '@/core/io/projectFile';
import type { Grafcet, Project } from '@/core/model/types';
import { validateProject } from '@/core/validation/validate';

type Data = Record<string, unknown>;
const nodes: { id: string; type: string; position: { x: number; y: number }; data: Data }[] = [];
const edges: { source: string; target: string; sourceHandle: string; targetHandle: string }[] = [];
const node = (id: string, type: string, x: number, y: number, data: Data = {}) =>
  nodes.push({ id, type, position: { x, y }, data });
const edge = (source: string, sourceHandle: string, target: string, targetHandle: string) =>
  edges.push({ source, sourceHandle, target, targetHandle });
const flow = (a: string, b: string) => edge(a, 'bottom', b, 'top');

// Chart in a frame named G1: an AND bar, an alternative-free loop back through a loop node.
node('box', 'boxNode', 300, 0, { label: '1', bottomLabel: 'G1', width: 500, height: 1000 });
node('s0', 'initialStep', 400, 100, { label: '0' });
node('t0', 'transition', 400, 160, { label: 'start * !stop' });
node('s1', 'step', 400, 250, { label: '1' });
node('t1', 'transition', 400, 310, { label: '*' });
node('and1', 'andNode', 400, 360, { width: 240 });
node('s2', 'step', 340, 400, { label: '2' });
node('s3', 'step', 460, 400, { label: '3' });
node('and2', 'andNode', 400, 470, { width: 240 });
node('t2', 'transition', 400, 500, { label: 'n > 0 * b' });
node('s4', 'step', 400, 600, { label: '4' });
node('t3', 'transition', 400, 660, { label: 'done' });
node('loop', 'loopNode', 320, 500, { label: '' });
flow('s0', 't0');
flow('t0', 's1');
flow('s1', 't1');
edge('t1', 'bottom', 'and1', 'handle-0');
edge('and1', 'source-0', 's2', 'top');
edge('and1', 'source-1', 's3', 'top');
edge('s2', 'bottom', 'and2', 'handle-0');
edge('s3', 'bottom', 'and2', 'handle-1');
edge('and2', 'source-0', 't2', 'top');
flow('t2', 's4');
flow('s4', 't3');
edge('t3', 'bottom', 'loop', 'bottom');
edge('loop', 'top', 's0', 'top');
// Actions: chained from a step, and one without a step.
node('a1', 'action', 490, 220, { label: 'Motor' });
node('a2', 'action', 690, 220, { label: 'Lamp', actionType: 'set' });
node('a3', 'action', 430, 370, { label: 'Valve', actionType: 'delayed', time: '2 s' });
node('a4', 'action', 550, 370, {
  label: 'Count := Count + 1',
  actionType: 'pulse',
  condition: '↑b',
});
node('a5', 'action', 490, 570, { label: 'Lamp', actionType: 'reset' });
node('a6', 'action', 690, 570, { label: 'Horn signal', actionType: 'limited', time: '1.5s' });
node('a7', 'action', 600, 900, { label: 'Alarm', actionType: 'conditional', condition: 'x + y' });
node('a8', 'action', 690, 120, { label: 'Pulse', actionType: 'pulse' });
edge('s1', 'right', 'a1', 'left');
edge('a1', 'right', 'a2', 'left');
edge('s2', 'right', 'a3', 'left');
edge('s3', 'right', 'a4', 'left');
edge('s4', 'right', 'a5', 'left');
edge('a5', 'right', 'a6', 'left');
edge('s0', 'right', 'a8', 'left');

// Separate chart under a heading: OR bar, two alternatives into one transition, a duplicate step
// number, a loop through two markers with the same reference, a step linked straight to a step.
node('title', 'text', 1000, 40, { label: 'Conveyor belt', fontSize: 18 });
node('c0', 'initialStep', 1000, 100, { label: '0' });
node('or1', 'orNode', 1000, 150, { width: 240 });
node('ct1', 'transition', 940, 170, { label: 'go' });
node('ct2', 'transition', 1060, 170, { label: '!go * reverse' });
node('c1', 'step', 940, 250, { label: '1' });
node('c2', 'step', 1060, 250, { label: '1' });
node('ct3', 'transition', 1000, 330, { label: 'stop' });
node('from', 'startLoop', 1000, 380, { label: 'A' });
node('to', 'endLoop', 1100, 60, { label: 'A' });
node('c9', 'step', 1200, 100, { label: '9' });
node('c10', 'step', 1200, 200, { label: '10' });
node('odd', 'fancyNode', 1500, 500, {});
edge('c0', 'bottom', 'or1', 'handle-0');
edge('or1', 'source-0', 'ct1', 'top');
edge('or1', 'source-1', 'ct2', 'top');
flow('ct1', 'c1');
flow('ct2', 'c2');
flow('c1', 'ct3');
flow('c2', 'ct3');
edge('ct3', 'bottom', 'from', 'top');
edge('to', 'bottom', 'c0', 'top');
flow('c9', 'c10');

// A forcing order with a condition.
node('f', 'forcedCommand', 1400, 100, { label: 'G1{}', condition: 'estop' });

const FILE = JSON.stringify({
  version: '1.0',
  createdWith: 'grafcet.io',
  createdAt: '2026-10-13T21:57:38.159Z',
  nodes,
  edges,
  counter: 1,
});

const { project, notes } = importGrafcetIo(FILE, 'Cell');
const byName = (p: Project, name: string): Grafcet =>
  Object.values(p.grafcets).find((g) => g.name === name)!;
const links = (g: Grafcet) =>
  Object.values(g.transitions)
    .map((t) => {
      const n = (ids: string[]) =>
        ids
          .map((i) => g.steps[i]!.number)
          .sort((a, b) => a - b)
          .join('+');
      return `${n(t.from)} -> ${n(t.to)}: ${t.receptivity}`;
    })
    .sort();
const actions = (g: Grafcet) =>
  Object.values(g.actions)
    .map(
      (a) =>
        `${a.stepId ? g.steps[a.stepId]!.number : '-'} ${a.kind} ${a.text}${a.condition ? ` if ${a.condition}` : ''}`,
    )
    .sort();

describe('grafcet.io import', () => {
  it('recognises grafcet.io files', () => {
    expect(isGrafcetIo('line.grafcetio', '{}')).toBe(true);
    expect(isGrafcetIo('line.json', FILE)).toBe(true);
    expect(isGrafcetIo('line.grafcet.json', '{"schemaVersion": 2}')).toBe(false);
  });

  it('makes a partial grafcet per frame and per separate chart, named like them', () => {
    expect(project.grafcetOrder.map((id) => project.grafcets[id]!.name)).toEqual([
      'G1',
      'Conveyor_belt',
      'Forcing_G1',
    ]);
    expect(project.meta.createdAt).toBe('2026-10-13T21:57:38.159Z');
  });

  it('follows links through AND bars and loop nodes', () => {
    expect(links(byName(project, 'G1'))).toEqual([
      '0 -> 1: start * !stop',
      '1 -> 2+3: 1',
      '2+3 -> 4: (n > 0) * b',
      '4 -> 0: done',
    ]);
  });

  it('follows OR bars and loop markers, splits alternatives drawn into one transition', () => {
    const g = byName(project, 'Conveyor_belt');
    expect(links(g)).toEqual([
      '0 -> 1: go',
      '0 -> 2: !go * reverse',
      '1 -> 0: stop',
      '2 -> 0: stop',
    ]);
    expect(
      Object.values(g.steps)
        .map((s) => s.number)
        .sort((a, b) => a - b),
    ).toEqual([0, 1, 2, 9, 10]);
  });

  it('converts the action types', () => {
    expect(actions(byName(project, 'G1'))).toEqual([
      '- continuous Alarm if x + y',
      '0 continuous Pulse if ↑X0',
      '1 continuous Motor',
      '1 storedOnActivation Lamp := 1',
      '2 continuous Valve if 2s/X2',
      '3 storedOnEvent Count := Count + 1 if ↑b',
      '4 continuous Horn_signal if /(1500ms/X4)',
      '4 storedOnActivation Lamp := 0',
    ]);
  });

  it('holds a conditional forcing order in a grafcet of its own', () => {
    const g = byName(project, 'Forcing_G1');
    expect(links(g)).toEqual(['20 -> 21: estop', '21 -> 20: /(estop)']);
    expect(actions(g)).toEqual(['21 forcing G1{}']);
  });

  it('reports what it changed or left out', () => {
    expect(notes.map((n) => n.code).sort()).toEqual([
      'actionRenamed',
      'forcingHelper',
      'invalidLink',
      'pulseAction',
      'renumbered',
      'splitTransition',
      'unsupported',
    ]);
    expect(notes.find((n) => n.code === 'splitTransition')!.params).toEqual({
      receptivity: 'stop',
      steps: '1, 2',
    });
  });

  it('creates the variables the expressions use', () => {
    const vars = Object.values(project.variables)
      .map((v) => `${v.name}:${v.type}:${v.direction}`)
      .sort();
    expect(vars).toEqual([
      'Alarm:BOOL:output',
      'Count:INT:internal',
      'Horn_signal:BOOL:output',
      'Lamp:BOOL:internal',
      'Motor:BOOL:output',
      'Pulse:BOOL:output',
      'Valve:BOOL:output',
      'b:BOOL:input',
      'done:BOOL:input',
      'estop:BOOL:input',
      'go:BOOL:input',
      'n:INT:internal',
      'reverse:BOOL:input',
      'start:BOOL:input',
      'stop:BOOL:input',
      'x:BOOL:input',
      'y:BOOL:input',
    ]);
  });

  it('gives a valid project that saves and reopens unchanged', () => {
    expect(validateProject(project).filter((i) => i.severity === 'error')).toEqual([]);
    const text = serializeProject(project);
    expect(serializeProject(parseProjectFile(text))).toBe(text);
  });

  it('keeps separate loops with the same label apart, reads andSplit bars and step-less frames', () => {
    // Three frames as drawn by newer grafcet.io versions: an andSplit bar (one step wired to it
    // backwards), two loops that both keep the default label `*`, forcing orders joined by AND,
    // conditional actions in a frame without steps, and a transition with nothing below it.
    const n: typeof nodes = [];
    const e: typeof edges = [];
    const add = (id: string, type: string, x: number, y: number, data: Data = {}) =>
      n.push({ id, type, position: { x, y }, data });
    const wire = (source: string, sourceHandle: string, target: string, targetHandle: string) =>
      e.push({ source, sourceHandle, target, targetHandle });
    const down = (a: string, b: string) => wire(a, 'bottom', b, 'top');
    add('fa', 'boxNode', -100, 0, { bottomLabel: 'G1', width: 600, height: 800 });
    add('a0', 'initialStep', 0, 20, { label: '0' });
    add('at0', 'transition', 0, 80, { label: 'go' });
    add('abar', 'andSplit', 0, 120, { width: 300 });
    add('a10', 'step', 0, 160, { label: '10' });
    add('a20', 'step', 300, 160, { label: '20' });
    add('at1', 'transition', 0, 220, { label: 'Not a' });
    add('at2', 'transition', 300, 220, { label: '0,5s/X20' });
    add('aloop', 'loopNode', -60, 120, { label: '*' });
    down('a0', 'at0');
    wire('at0', 'bottom', 'abar', 'handle-0');
    wire('abar', 'source-0', 'a10', 'top');
    wire('a20', 'top', 'abar', 'source-30');
    down('a10', 'at1');
    down('a20', 'at2');
    wire('at1', 'bottom', 'aloop', 'bottom');
    wire('at2', 'bottom', 'aloop', 'bottom');
    wire('aloop', 'top', 'a0', 'top');
    add('fb', 'boxNode', -700, 0, { bottomLabel: 'G4', width: 500, height: 800 });
    add('b900', 'initialStep', -600, 20, { label: '900' });
    add('bt0', 'transition', -600, 80, { label: '!estop' });
    add('b3', 'step', -600, 160, { label: '3' });
    add('bf', 'forcedCommand', -500, 140, { label: 'G1 { } AND G2{}' });
    add('bt1', 'transition', -600, 220, { label: 'drift' });
    add('bt2', 'transition', -500, 220, { label: 'lost' });
    add('bloop', 'loopNode', -660, 120, { label: '*' });
    down('b900', 'bt0');
    down('bt0', 'b3');
    wire('b3', 'right', 'bf', 'left');
    down('b3', 'bt1');
    down('b3', 'bt2');
    wire('bt1', 'bottom', 'bloop', 'bottom');
    wire('bloop', 'top', 'b900', 'top');
    add('fc', 'boxNode', -1100, 0, { bottomLabel: 'G2', width: 350, height: 400 });
    add('cm', 'action', -1080, 40, { label: 'M1', actionType: 'conditional', condition: 'hand' });
    const result = importGrafcetIo(
      JSON.stringify({ createdWith: 'grafcet.io', nodes: n, edges: e }),
      'Mill',
    );
    const p = result.project;
    expect(p.grafcetOrder.map((id) => p.grafcets[id]!.name)).toEqual(['G2', 'G4', 'G1']);
    expect(links(byName(p, 'G1'))).toEqual([
      '0 -> 10+20: go',
      '10 -> 0: Not a',
      '20 -> 0: 500ms/X20',
    ]);
    expect(links(byName(p, 'G4'))).toEqual(['3 -> 900: drift', '3 -> : lost', '900 -> 3: !estop']);
    expect(actions(byName(p, 'G4'))).toEqual(['3 forcing G1 { }', '3 forcing G2{}']);
    expect(actions(byName(p, 'G2'))).toEqual(['- continuous M1 if hand']);
    expect(result.notes).toEqual([{ code: 'openTransition', params: { receptivity: 'lost' } }]);
  });

  it('rewrites the grafcet.io expression syntax', () => {
    expect(convertExpression('BoxFed % 3 = 0  *  a ≥ 2')).toBe('BoxFed MOD 3 = 0 * a >= 2');
    expect(convertExpression('1̲')).toBe('1');
    expect(convertExpression('0,5s/X32 * 1.5min/X2')).toBe('500ms/X32 * 90s/X2');
    expect(separateComparisons('n MOD 2 = 0 * !n = 0')).toBe('(n MOD 2 = 0) * (!n = 0)');
    expect(separateComparisons('a = 1 + b = 2')).toBe('(a = 1) + (b = 2)');
    expect(separateComparisons('a * b + c')).toBe('a * b + c');
  });

  it('rejects files it cannot read', () => {
    const code = (text: string) => {
      try {
        importGrafcetIo(text, 'x');
        return 'ok';
      } catch (e) {
        return e instanceof ProjectFileError ? e.code : 'other';
      }
    };
    expect(code('{nodes: ')).toBe('notJson');
    expect(code('{"nodes": [{"id": 1}], "edges": []}')).toBe('invalid');
    expect(code('{"nodes": [], "edges": []}')).toBe('ok');
  });
});
