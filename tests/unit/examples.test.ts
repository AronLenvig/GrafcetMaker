/** The start-screen examples must be valid files, free of problems, and behave as described. */
import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, EXAMPLES } from '@/app/examples/examples';
import { parseProjectFile, serializeProject } from '@/core/io/projectFile';
import { Simulator } from '@/core/simulation/engine';
import { compile } from '@/core/simulation/program';
import { validateProject } from '@/core/validation/validate';

describe('examples', () => {
  it.each(EXAMPLE_IDS)('%s is a valid file without errors or warnings', (id) => {
    const p = EXAMPLES[id]();
    expect(parseProjectFile(serializeProject(p))).toEqual(p);
    const issues = validateProject(p).filter((i) => i.severity !== 'info');
    expect(issues.map((i) => `${i.ruleId}: ${JSON.stringify(i.params)}`)).toEqual([]);
  });

  it('traffic light: a pedestrian request shortens the green phase', () => {
    const p = EXAMPLES.trafficLight();
    const sim = new Simulator(compile(p));
    sim.start();
    const active = () =>
      sim.snapshot().active.map((id) => Object.values(p.grafcets)[0]!.steps[id]!.number);
    expect(active()).toEqual([0]);
    sim.advanceTo(10_000);
    expect(active()).toEqual([1]);
    sim.advanceTo(12_000);
    sim.setInputs({ request: true });
    sim.advanceTo(12_300);
    sim.setInputs({ request: false });
    sim.advanceTo(19_000);
    expect(active()).toEqual([1]);
    sim.advanceTo(20_000);
    expect(active()).toEqual([2]);
  });
});
