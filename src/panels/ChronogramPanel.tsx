import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Grafcet, Variable } from '@/core/model/types';
import type { Value } from '@/core/simulation/engine';
import type { CycleRecord } from '@/core/simulation/session';
import { FitIcon, MinusIcon, PlusIcon } from '@/app/ui/icons';
import { Button, IconButton } from '@/app/ui/primitives';
import { formatSimTime } from '@/editor/canvas/SimOverlay';
import { useActiveGrafcet, useDoc } from '@/editor/store/document';
import { setCursor, useSim, type Baseline } from '@/editor/simulation/simStore';
import './chronogram.css';

const LABEL_W = 130;
const ROW_H = 26;
const AXIS_H = 22;

interface Signal {
  key: string;
  label: string;
  kind: 'bool' | 'num';
  /** Change points, first one at the baseline time. */
  points: { t: number; v: Value }[];
}

function buildSignals(
  baseline: Baseline,
  cycles: CycleRecord[],
  variables: Variable[],
  g: Grafcet | undefined,
): Signal[] {
  const signals: Signal[] = [];
  for (const v of variables) {
    const name = v.name.toLowerCase();
    const points = [
      { t: baseline.time, v: baseline.values[name] ?? (v.type === 'BOOL' ? false : 0) },
    ];
    for (const c of cycles) {
      for (const ch of [...c.inputs, ...c.changes]) {
        if (ch.name === name && points[points.length - 1]!.v !== ch.value)
          points.push({ t: c.time, v: ch.value });
      }
    }
    signals.push({
      key: `v:${v.id}`,
      label: v.name,
      kind: v.type === 'BOOL' ? 'bool' : 'num',
      points,
    });
  }
  if (g) {
    const steps = Object.values(g.steps).sort((a, b) => a.number - b.number);
    for (const s of steps) {
      const points = [{ t: baseline.time, v: baseline.active.includes(s.id) as Value }];
      for (const c of cycles) {
        const on = c.active.includes(s.id);
        if (points[points.length - 1]!.v !== on) points.push({ t: c.time, v: on });
      }
      signals.push({ key: `x:${s.id}`, label: `${g.name}.X${s.number}`, kind: 'bool', points });
    }
  }
  return signals;
}

function ticks(t0: number, t1: number, width: number): number[] {
  const span = Math.max(1, t1 - t0);
  const target = span / Math.max(1, width / 90);
  const steps = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 30_000, 60_000, 300_000, 600_000,
    3_600_000,
  ];
  const step = steps.find((s) => s >= target) ?? 3_600_000;
  const out: number[] = [];
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) out.push(t);
  return out;
}

/** Timing diagram of all variables and of the active grafcet's steps; click to time-travel. */
export default function ChronogramPanel() {
  const { t } = useTranslation();
  const on = useSim((s) => s.on);
  const baseline = useSim((s) => s.baseline);
  const cycles = useSim((s) => s.cycles);
  const time = useSim((s) => s.snapshot?.time ?? 0);
  const cursor = useSim((s) => s.cursor);
  const variables = useDoc((s) => s.project.variables);
  const g = useActiveGrafcet();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [view, setView] = useState<{ t0: number; t1: number } | null>(null);
  const drag = useRef(false);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [on]);

  const signals = useMemo(() => {
    if (!baseline) return [];
    const vars = Object.values(variables).sort(
      (a, b) =>
        ['input', 'output', 'internal'].indexOf(a.direction) -
          ['input', 'output', 'internal'].indexOf(b.direction) || a.name.localeCompare(b.name),
    );
    return buildSignals(baseline, cycles, vars, g);
  }, [baseline, cycles, variables, g]);

  if (!on || !baseline) return <p className="p-4 text-muted">{t('simulation.notRunning')}</p>;

  const end = Math.max(time, 1000);
  const t0 = view?.t0 ?? 0;
  const t1 = view?.t1 ?? end;
  const plotW = Math.max(50, width - LABEL_W - 8);
  const x = (tt: number) => LABEL_W + ((tt - t0) / (t1 - t0)) * plotW;
  const timeAt = (px: number) =>
    Math.min(end, Math.max(0, t0 + ((px - LABEL_W) / plotW) * (t1 - t0)));
  const height = AXIS_H + signals.length * ROW_H + 4;
  const zoom = (factor: number, around = (t0 + t1) / 2) => {
    const span = Math.min(Math.max((t1 - t0) * factor, 10), Math.max(end, 10));
    let a = around - (around - t0) * (span / (t1 - t0));
    a = Math.max(0, Math.min(a, Math.max(0, end - span)));
    setView({ t0: a, t1: a + span });
  };
  const scrub = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    if (px >= LABEL_W) setCursor(timeAt(px));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <IconButton label={t('chronogram.zoomIn')} className="h-7 w-7" onClick={() => zoom(0.5)}>
          <PlusIcon size={14} />
        </IconButton>
        <IconButton label={t('chronogram.zoomOut')} className="h-7 w-7" onClick={() => zoom(2)}>
          <MinusIcon size={14} />
        </IconButton>
        <IconButton label={t('chronogram.fit')} className="h-7 w-7" onClick={() => setView(null)}>
          <FitIcon size={14} />
        </IconButton>
        <span className="ml-2 text-xs text-muted tabular-nums">
          {cursor === null
            ? t('chronogram.live', { time: formatSimTime(time) })
            : t('chronogram.at', { time: formatSimTime(cursor) })}
        </span>
        {cursor !== null && (
          <Button size="sm" className="ml-auto" onClick={() => setCursor(null)}>
            {t('chronogram.backToLive')}
          </Button>
        )}
      </div>
      <div
        ref={boxRef}
        tabIndex={0}
        role="region"
        aria-label={t('chronogram.scrollArea')}
        className="min-h-0 flex-1 overflow-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          className="gm-chrono block select-none"
          width={width}
          height={height}
          role="img"
          aria-label={t('chronogram.label')}
          onPointerDown={(e) => {
            drag.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e);
          }}
          onPointerMove={(e) => drag.current && scrub(e)}
          onPointerUp={() => (drag.current = false)}
          onWheel={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            zoom(e.deltaY > 0 ? 1.25 : 0.8, timeAt(e.clientX - r.left));
          }}
        >
          {ticks(t0, t1, plotW).map((tt) => (
            <g key={tt}>
              <line className="gm-chrono-grid" x1={x(tt)} x2={x(tt)} y1={AXIS_H - 4} y2={height} />
              <text className="gm-chrono-axis" x={x(tt) + 2} y={13}>
                {formatSimTime(tt)}
              </text>
            </g>
          ))}
          {signals.map((sig, row) => {
            const top = AXIS_H + row * ROW_H;
            const hi = top + 5;
            const lo = top + ROW_H - 5;
            const visible = sig.points.filter(
              (p, i) => p.t <= t1 && (sig.points[i + 1]?.t ?? Infinity) >= t0,
            );
            const segs = visible.map((p, i) => ({
              a: Math.max(p.t, t0),
              b: Math.min(visible[i + 1]?.t ?? end, t1),
              v: p.v,
            }));
            return (
              <g key={sig.key}>
                <line
                  className="gm-chrono-row"
                  x1={0}
                  x2={width}
                  y1={top + ROW_H}
                  y2={top + ROW_H}
                />
                <text className="gm-chrono-label" x={6} y={top + ROW_H / 2 + 4}>
                  {sig.label}
                </text>
                {sig.kind === 'bool' ? (
                  <>
                    {segs.map((s, i) =>
                      s.v === true ? (
                        <rect
                          key={i}
                          className="gm-chrono-high"
                          x={x(s.a)}
                          y={hi}
                          width={Math.max(0, x(s.b) - x(s.a))}
                          height={lo - hi}
                        />
                      ) : null,
                    )}
                    <path
                      className="gm-chrono-trace"
                      d={segs
                        .map((s, i) => {
                          const y = s.v === true ? hi : lo;
                          return `${i ? 'L' : 'M'}${x(s.a)} ${y}H${x(s.b)}`;
                        })
                        .join('')}
                    />
                  </>
                ) : (
                  segs.map((s, i) => (
                    <g key={i}>
                      <path
                        className="gm-chrono-trace"
                        d={`M${x(s.a)} ${hi}H${x(s.b)}M${x(s.a)} ${lo}H${x(s.b)}M${x(s.a)} ${hi}V${lo}`}
                      />
                      {x(s.b) - x(s.a) > 24 && (
                        <text className="gm-chrono-value" x={x(s.a) + 4} y={top + ROW_H / 2 + 4}>
                          {typeof s.v === 'number'
                            ? Number.isInteger(s.v)
                              ? s.v
                              : s.v.toFixed(2)
                            : String(s.v)}
                        </text>
                      )}
                    </g>
                  ))
                )}
              </g>
            );
          })}
          {cursor !== null && cursor >= t0 && cursor <= t1 && (
            <line className="gm-chrono-cursor" x1={x(cursor)} x2={x(cursor)} y1={0} y2={height} />
          )}
          {cursor === null && time >= t0 && time <= t1 && (
            <line className="gm-chrono-now" x1={x(time)} x2={x(time)} y1={0} y2={height} />
          )}
        </svg>
      </div>
    </div>
  );
}
