import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '@/app/examples/examples';
import { grafcetToSvg } from '@/core/io/svgExport';
import { frameLabels } from '@/core/layout/frame';
import { stepReference } from '@/core/layout/geometry';

describe('grafcet frames and macro-step references', () => {
  it('label a partial grafcet with its name, an expansion and an enclosed grafcet with their step', () => {
    const bottling = EXAMPLES.bottlingLine();
    const byName = (p: typeof bottling, name: string) =>
      Object.values(p.grafcets).find((g) => g.name === name)!;
    expect(frameLabels(bottling, byName(bottling, 'Line'))).toEqual({ bottomLeft: 'Line' });
    expect(frameLabels(bottling, byName(bottling, 'M2'))).toEqual({
      topLeft: 'M2',
      bottomLeft: 'M2',
    });
    const modes = EXAMPLES.operatingModes();
    const enclosed = Object.values(modes.grafcets).find((g) => g.kind === 'enclosed')!;
    const encloser = Object.values(modes.grafcets)
      .flatMap((g) => Object.values(g.steps))
      .find((s) => s.refGrafcetId === enclosed.id)!;
    expect(frameLabels(modes, enclosed)).toEqual({
      topLeft: `X${encloser.number}`,
      bottomLeft: enclosed.name,
    });
  });

  it('write M and the number in a macro-step', () => {
    expect(stepReference({ kind: 'macro', number: 5 })).toBe('M5');
    expect(stepReference({ kind: 'enclosing', number: 4 })).toBe('4');
  });

  it('are drawn around the whole grafcet in exports, which grow to hold them', () => {
    const p = EXAMPLES.trafficLight();
    const g = p.grafcets[p.grafcetOrder[0]!]!;
    const plain = grafcetToSvg(g);
    const framed = grafcetToSvg(g, { frame: frameLabels(p, g) });
    expect(framed.box.width).toBeGreaterThan(plain.box.width);
    expect(framed.box.height).toBeGreaterThan(plain.box.height);
    expect(framed.body).toContain(`>${g.name}</text>`);
    // A selection is exported without its grafcet's frame.
    const step = Object.keys(g.steps)[0]!;
    expect(grafcetToSvg(g, { only: new Set([step]), frame: frameLabels(p, g) }).body).toBe(
      grafcetToSvg(g, { only: new Set([step]) }).body,
    );
  });
});
