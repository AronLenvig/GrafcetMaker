import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, EXAMPLES } from '@/app/examples/examples';
import {
  decodeTextHash,
  encodeTextHash,
  GrafcetTextError,
  parseGrafcetText,
  projectToText,
} from '@/core/io/grafcetText';
import { validateProject } from '@/core/validation/validate';
import guide from '../../docs/ai.md?raw';

const SAMPLE = `\`\`\`
# A drilling station, as an assistant would write it
project Drilling station
input start, part -- sensors
input level INT = 3 at %IW2
output Spin
internal Count INT = 0
internal Delay TIME = 1.5s

grafcet Main
step 0 initial Waiting
  do Lamp if start
0 -> 1: ↑start * part
step 1 Working
  on enter: Count := Count + 1
  P0 Count := 0
  on ↑stop: Done := 1
1 -> 2 3: 1
step 2 macro Drill -> M2
step 3 Spin
  N Spin
2 3 -> 0: level > 5
-> 3: reset
note Two lines\\nof text
grafcet M2 expansion
step 10 initial
step 11
10 -> 11: 2s/X10
11 -> : 1
\`\`\``;

describe('GRAFCET text', () => {
  it('reads every construct, laid out and with the names it uses declared', () => {
    const p = parseGrafcetText(SAMPLE);
    expect(p.name).toBe('Drilling station');
    const vars = Object.values(p.variables);
    const v = (name: string) => vars.find((x) => x.name === name);
    expect(v('start')).toMatchObject({ direction: 'input', type: 'BOOL', comment: 'sensors' });
    expect(v('level')).toMatchObject({ type: 'INT', initialValue: 3, address: '%IW2' });
    expect(v('Delay')).toMatchObject({ type: 'TIME', initialValue: 1500 });
    // Undeclared: Lamp is set by a continuous action, stop is read, Done is assigned.
    expect(v('Lamp')?.direction).toBe('output');
    expect(v('stop')?.direction).toBe('input');
    expect(v('Done')?.direction).toBe('internal');

    const [main, m2] = p.grafcetOrder.map((id) => p.grafcets[id]!);
    expect(main!.name).toBe('Main');
    expect(m2!.kind).toBe('macroExpansion');
    const step = (n: number) => Object.values(main!.steps).find((s) => s.number === n)!;
    expect(step(0).kind).toBe('initial');
    expect(step(2)).toMatchObject({ kind: 'macro', label: 'Drill', refGrafcetId: m2!.id });
    const kinds = Object.values(main!.actions).map((a) => [a.kind, a.text, a.condition ?? null]);
    expect(kinds).toEqual(
      expect.arrayContaining([
        ['continuous', 'Lamp', 'start'],
        ['storedOnActivation', 'Count := Count + 1', null],
        ['storedOnDeactivation', 'Count := 0', null],
        ['storedOnEvent', 'Done := 1', '↑stop'],
        ['continuous', 'Spin', null],
      ]),
    );
    const trs = Object.values(main!.transitions);
    expect(trs.find((t) => t.to.length === 2)?.receptivity).toBe('1');
    expect(trs.find((t) => t.from.length === 2)?.receptivity).toBe('level > 5');
    expect(trs.find((t) => t.from.length === 0)?.to).toEqual([step(3).id]);
    expect(Object.values(main!.comments)[0]!.text).toBe('Two lines\nof text');
    // Laid out: steps one under the other, not stacked on one point.
    expect(new Set(Object.values(main!.steps).map((s) => s.position.y)).size).toBeGreaterThan(2);
  });

  it('round-trips every example: text, project, the same text', () => {
    for (const id of EXAMPLE_IDS) {
      const text = projectToText(EXAMPLES[id]());
      const again = projectToText(parseGrafcetText(text));
      expect(again, id).toBe(text);
    }
  });

  it('reports the line it cannot read', () => {
    const fail = (text: string) => {
      try {
        parseGrafcetText(text);
      } catch (e) {
        if (e instanceof GrafcetTextError) return [e.code, e.line, e.params];
        throw e;
      }
      return null;
    };
    expect(fail('step 0 initial\nstep 0')).toEqual(['duplicateStep', 2, { number: '0' }]);
    expect(fail('step 0 initial\n0 -> 7: a')).toEqual([
      'unknownStep',
      2,
      { number: '7', grafcet: 'G1' },
    ]);
    expect(fail('step 0 initial\nhello world')).toEqual(['unknownLine', 2, {}]);
    expect(fail('input 2fast')).toEqual(['name', 1, { name: '2fast' }]);
    expect(fail('input a\noutput A')).toEqual(['duplicateVariable', 2, { name: 'A' }]);
    expect(fail('internal n INT = lots')).toEqual(['value', 1, { value: 'lots', type: 'INT' }]);
    expect(fail('step 0 macro -> Nowhere')).toEqual(['unknownGrafcet', 1, { name: 'Nowhere' }]);
    expect(fail('# nothing')).toEqual(['empty', 0, {}]);
  });

  it('travels in a #text= link, + staying a plus (OR)', () => {
    const text = 'step 0 initial\n0 -> 1: a + b * c\nstep 1';
    expect(decodeTextHash(encodeTextHash(text))).toBe(text);
    // Written by hand: spaces as %20, a stray % kept.
    expect(decodeTextHash('#text=step%200%20initial%0A0%20->%201:%20a+b%')).toBe(
      'step 0 initial\n0 -> 1: a+b%',
    );
  });

  it('opens the examples of the guide for assistants (docs/ai.md) without errors', () => {
    const blocks = [...guide.matchAll(/```grafcet\n([\s\S]*?)```/g)].map((m) => m[1]!);
    expect(blocks.length).toBeGreaterThan(1);
    for (const text of blocks) {
      const errors = validateProject(parseGrafcetText(text)).filter((i) => i.severity === 'error');
      expect(errors.map((i) => i.ruleId)).toEqual([]);
    }
  });
});
