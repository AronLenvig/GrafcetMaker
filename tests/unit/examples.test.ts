/** The start-screen examples must be valid files, free of problems, and behave as described. */
import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, EXAMPLES } from '@/app/examples/examples';
import { parseProjectFile, serializeProject } from '@/core/io/projectFile';
import { Simulator } from '@/core/simulation/engine';
import { compile } from '@/core/simulation/program';
import type { Project } from '@/core/model/types';
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

  /** Plays a scenario of the example; `at` reads the active step numbers and values at a time. */
  function replay(p: Project, scenario: string) {
    const sim = new Simulator(compile(p));
    sim.start();
    const numbers = new Map(
      Object.values(p.grafcets).flatMap((g) => Object.values(g.steps).map((s) => [s.id, s.number])),
    );
    const events = Object.values(p.scenarios ?? {}).find((s) => s.name === scenario)!.events;
    let i = 0;
    return (t: number) => {
      for (; i < events.length && events[i]!.t <= t; i++) {
        sim.advanceTo(events[i]!.t);
        sim.setInputs({ [events[i]!.name]: events[i]!.value });
      }
      sim.advanceTo(t);
      const s = sim.snapshot();
      return {
        active: s.active.map((id) => numbers.get(id)).sort((a, b) => a! - b!),
        value: (name: string) => s.values[name.toLowerCase()],
      };
    };
  }

  it('bottling line: fills, caps and labels in parallel, counts and rejects', () => {
    const at = replay(EXAMPLES.bottlingLine(), 'One good, one rejected');
    expect(at(0).active).toEqual([0]);
    expect(at(1_000).active).toEqual([1]);
    expect(at(1_600).active).toEqual([2, 4, 6, 20]);
    expect(at(4_200).active).toEqual([2, 5, 6, 22]);
    expect(at(5_200).active).toEqual([2, 5, 7, 23]);
    expect(at(6_000).active).toEqual([8]);
    // Step 9 is transient: the good bottle is counted, the conveyor runs again.
    const good = at(6_600);
    expect(good.active).toEqual([1]);
    expect(good.value('Good')).toBe(1);
    expect(at(13_200).active).toEqual([10]);
    const end = at(15_000);
    expect(end.active).toEqual([1]);
    expect([end.value('Good'), end.value('Rejected')]).toEqual([1, 1]);
  });

  it('operating modes: pause freezes the cycle, stop waits for the end of the cycle', () => {
    const at = replay(EXAMPLES.operatingModes(), 'Pause, then stop at the end of the cycle');
    expect(at(0).active).toEqual([0, 30, 40]);
    expect(at(1_200).active).toEqual([1, 11, 30, 40]);
    expect(at(2_100).active).toEqual([1, 12, 30, 40]);
    // Paused past the 2 s of step 12: frozen until the pause is released.
    expect(at(4_500).active).toEqual([1, 12, 30, 41]);
    expect(at(5_400).active).toEqual([1, 13, 30, 40]);
    expect(at(5_600).value('Parts')).toBe(1);
    expect(at(6_200).value('StopReq')).toBe(true);
    const end = at(7_000);
    expect(end.active).toEqual([0, 30, 40]);
    expect(end.value('StopReq')).toBe(false);
  });

  it('operating modes: an emergency stop deactivates the cycle', () => {
    const at = replay(EXAMPLES.operatingModes(), 'Emergency stop');
    expect(at(1_200).active).toEqual([1, 11, 30, 40]);
    const stopped = at(2_000);
    expect(stopped.active).toEqual([0, 31, 40]);
    expect(stopped.value('Alarm')).toBe(true);
    expect(at(4_000).active).toEqual([0, 30, 40]);
  });
});
