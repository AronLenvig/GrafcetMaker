import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  computeGeometry,
  elementBounds,
  layoutActions,
  rectsIntersect,
  type ActionBox,
  type Rect,
} from '@/core/layout/geometry';
import { usePrefs } from '@/app/prefs';
import type { Id } from '@/core/model/types';
import { stateAt, useSim } from '../simulation/simStore';
import { useDoc } from '../store/document';
import { useUi } from '../store/uiStore';
import {
  ActionView,
  BarView,
  CommentView,
  LinkView,
  StepView,
  StubView,
  type StepMark,
  TransitionView,
} from './elements';
import { InlineEditor } from './InlineEditor';
import { IssueBadges } from './IssueBadges';
import { useInteraction } from './interactionStore';
import { Overlay } from './Overlay';
import { SimOverlay } from './SimOverlay';
import { pointsToPath } from './svg';
import { useCanvasInteraction } from './useCanvasInteraction';
import { canvasSizeOf, setCanvasSize } from './viewport';
import { HintBar } from './HintBar';
import { SelectionBar } from './SelectionBar';
import { ZoomControls } from './ZoomControls';
import './canvas.css';

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
/** Above this many elements, only what is (nearly) visible is rendered. */
const CULL_THRESHOLD = 1000;

/** What the simulation shows on the diagram: live state, or the past state under the cursor. */
function useSimDisplay() {
  const on = useSim((s) => s.on);
  const snapshot = useSim((s) => s.snapshot);
  const cursor = useSim((s) => s.cursor);
  const cycles = useSim((s) => s.cycles.length);
  const activeKey = snapshot ? snapshot.active.join(',') : '';
  const valuesKey = snapshot ? JSON.stringify(snapshot.values) : '';
  const executingKey = snapshot ? snapshot.executing.join(',') : '';
  return useMemo(() => {
    if (!on || !snapshot) return null;
    if (cursor !== null) {
      const past = stateAt(cursor);
      if (past)
        return { active: past.active, values: past.values, executing: null as Set<string> | null };
    }
    return {
      active: new Set(snapshot.active),
      values: snapshot.values,
      executing: new Set(snapshot.executing),
    };
    // Keys stand for the snapshot fields that change what is drawn (not the clock).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, activeKey, valuesKey, executingKey, cursor, cycles]);
}

/**
 * The diagram of one grafcet. In a split view the pane that is not focused still renders (and
 * pans, zooms and simulates); its first click or focus makes it the active pane.
 */
export function Canvas({
  gid,
  focused = true,
  onActivate,
}: {
  gid: Id | null;
  focused?: boolean;
  onActivate?: () => void;
}) {
  const { t } = useTranslation();
  const readOnly = useUi((s) => s.mode === 'simulate');
  const sim = useSimDisplay();
  const snapshot = useSim((s) => s.snapshot);
  const cursor = useSim((s) => s.cursor);
  const g = useDoc((s) => (gid ? s.project.grafcets[gid] : undefined));
  const viewport = useUi((s) => (gid ? s.viewports[gid] : undefined)) ?? DEFAULT_VIEWPORT;
  const tool = useUi((s) => s.tool);
  const showGrid = usePrefs((s) => s.showGrid);
  const panning = useInteraction((s) => s.panning);
  const pending = useUi((s) => s.pending);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => (gid ? canvasSizeOf(gid) : { width: 800, height: 600 }));
  const handlers = useCanvasInteraction(containerRef, gid, readOnly);
  const activate = () => {
    if (!focused) onActivate?.();
  };

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const next = { width: r.width, height: r.height };
      if (gid) setCanvasSize(gid, next);
      setSize(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gid]);

  const geom = useMemo(() => (g ? computeGeometry(g) : null), [g]);

  const w = size.width / viewport.zoom;
  const h = size.height / viewport.zoom;

  const total = g
    ? Object.keys(g.steps).length +
      Object.keys(g.transitions).length +
      Object.keys(g.comments).length +
      Object.keys(g.actions).length
    : 0;
  // Culling rect, quantized so panning re-renders only every half screen.
  const cull: Rect | null =
    total > CULL_THRESHOLD
      ? {
          x: Math.floor((viewport.x - w / 2) / (w / 2)) * (w / 2),
          y: Math.floor((viewport.y - h / 2) / (h / 2)) * (h / 2),
          width: w * 2.5,
          height: h * 2.5,
        }
      : null;
  const cullKey = cull ? [cull.x, cull.y, cull.width, cull.height].join(',') : '';

  const content = useMemo(() => {
    if (!g || !geom) return null;
    const steps = Object.values(g.steps);
    const transitions = Object.values(g.transitions);
    const markOf = (id: string): StepMark | undefined => {
      if (g.kind === 'macroExpansion') {
        if (!geom.index.incoming.has(id)) return 'E';
        if (!geom.index.outgoing.has(id)) return 'S';
      }
      if (g.kind === 'enclosed' && g.steps[id]?.kind === 'initial') return '*';
      return undefined;
    };
    const comments = Object.values(g.comments);
    const visible = cull;
    const inView = (id: string) => {
      if (!visible) return true;
      const b = elementBounds(g, geom, id);
      return !b || rectsIntersect(b, visible);
    };
    const linkInView = (pts: readonly { x: number; y: number }[]) =>
      !visible ||
      pts.some(
        (p) =>
          p.x >= visible.x &&
          p.x <= visible.x + visible.width &&
          p.y >= visible.y &&
          p.y <= visible.y + visible.height,
      );
    const actionBoxes: { box: ActionBox; first: boolean }[] = [];
    for (const s of steps) {
      if (!inView(s.id)) continue;
      layoutActions(s, geom.index.actions.get(s.id) ?? []).forEach((box, i) =>
        actionBoxes.push({ box, first: i === 0 }),
      );
    }
    // Actions attached to no step: no link, drawn where they were placed.
    for (const box of geom.freeActions) if (inView(box.id)) actionBoxes.push({ box, first: false });
    return (
      <>
        {comments
          .filter((c) => inView(c.id))
          .map((c) => (
            <CommentView key={c.id} comment={c} />
          ))}
        {geom.links
          .filter((l) => linkInView(l.points))
          .map((l) => (
            <LinkView
              key={l.key}
              linkKey={l.key}
              d={pointsToPath(l.points)}
              arrowX={l.arrow?.x}
              arrowY={l.arrow?.y}
            />
          ))}
        {geom.bars.map((b) => (
          <BarView key={b.key} x1={b.x1} x2={b.x2} y={b.y} stem={pointsToPath(b.stem)} />
        ))}
        {geom.stubs.map((s) => (
          <StubView key={s.key} d={pointsToPath(s.points)} />
        ))}
        {transitions
          .filter((tr) => inView(tr.id))
          .map((tr) => (
            <TransitionView key={tr.id} transition={tr} />
          ))}
        {steps
          .filter((s) => inView(s.id))
          .map((s) => (
            <StepView key={s.id} step={s} active={sim?.active.has(s.id)} mark={markOf(s.id)} />
          ))}
        {actionBoxes.map(({ box, first }) => {
          const action = g.actions[box.id]!;
          // Without a step an action is always active.
          const stepActive = !!sim && (action.stepId === null || sim.active.has(action.stepId));
          const on =
            action.kind === 'continuous' && stepActive
              ? sim!.executing
                ? sim!.executing.has(action.id)
                : sim!.values[action.text.trim().toLowerCase()] === true
              : undefined;
          const target = action.text.split(':=')[0]!.trim().toLowerCase();
          const value =
            sim && action.kind !== 'continuous' && action.kind !== 'forcing'
              ? sim.values[target]
              : undefined;
          return (
            <ActionView
              key={box.id}
              action={action}
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              first={first}
              on={on}
              live={
                value === undefined
                  ? undefined
                  : typeof value === 'boolean'
                    ? value
                      ? '1'
                      : '0'
                    : String(value)
              }
            />
          );
        })}
      </>
    );
    // cull is derived from cullKey; listing it would re-render on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, geom, cullKey, sim]);

  const enabled = useMemo(() => {
    if (!sim || !g) return new Set<string>();
    if (cursor === null && snapshot) return new Set(snapshot.enabled);
    return new Set(
      Object.values(g.transitions)
        .filter((tr) => tr.from.every((s) => sim.active.has(s)))
        .map((tr) => tr.id),
    );
  }, [sim, g, cursor, snapshot]);

  const gridStep = viewport.zoom < 0.5 ? 50 : 10;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-canvas outline-none"
      tabIndex={0}
      role="application"
      aria-label={t('canvas.label', { name: g?.name ?? '' })}
      aria-roledescription={t('canvas.roleDescription')}
      onKeyDown={handlers.onKeyDown}
      onKeyUp={handlers.onKeyUp}
      onFocus={activate}
      // Browsers scroll overflow:hidden boxes to reveal focused children; the viewport owns panning.
      onScroll={(e) => {
        e.currentTarget.scrollTop = 0;
        e.currentTarget.scrollLeft = 0;
      }}
      data-canvas
    >
      <svg
        className="gm-canvas block h-full w-full"
        data-tool={tool}
        data-panning={panning}
        viewBox={`${viewport.x} ${viewport.y} ${w} ${h}`}
        onPointerDown={(e) => {
          activate();
          handlers.onPointerDown(e);
        }}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onPointerLeave={handlers.onPointerLeave}
        onDoubleClick={(e) => {
          activate();
          handlers.onDoubleClick(e);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {showGrid && (
          <>
            <defs>
              <pattern
                id="gm-grid"
                width={gridStep}
                height={gridStep}
                patternUnits="userSpaceOnUse"
              >
                <circle
                  className="gm-grid-dot"
                  cx={0}
                  cy={0}
                  r={Math.min(1.2, 1 / viewport.zoom)}
                />
              </pattern>
            </defs>
            <rect
              x={viewport.x}
              y={viewport.y}
              width={w}
              height={h}
              fill="url(#gm-grid)"
              pointerEvents="none"
            />
          </>
        )}
        <g>{content}</g>
        {g && geom && !readOnly && <IssueBadges g={g} geom={geom} />}
        {g && geom && sim && (
          <SimOverlay
            g={g}
            geom={geom}
            active={sim.active}
            enabled={enabled}
            time={cursor ?? snapshot?.time ?? 0}
            activatedAt={cursor === null ? (snapshot?.activatedAt ?? null) : null}
          />
        )}
        {focused && g && geom && <Overlay g={g} geom={geom} readOnly={readOnly} />}
      </svg>
      {focused && g && geom && <InlineEditor g={g} geom={geom} viewport={viewport} />}
      {gid && <ZoomControls gid={gid} zoom={viewport.zoom} />}
      {focused && <HintBar />}
      {focused && g && !readOnly && <SelectionBar g={g} />}
      {focused && pending && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-md border border-accent bg-surface px-3 py-1.5 text-text shadow-pop"
        >
          {t('canvas.loopHint')}
        </div>
      )}
    </div>
  );
}
