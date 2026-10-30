import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  computeGeometry,
  elementBounds,
  layoutActions,
  linkArrow,
  rectsIntersect,
  type ActionBox,
  type Rect,
} from '@/core/layout/geometry';
import { useLive } from '@/app/collab/liveState';
import { usePrefs } from '@/app/prefs';
import { useCoarsePointer, useCompact } from '@/app/ui/media';
import { cachedBool } from '@/core/expr/cache';
import { buildEnv } from '@/core/expr/check';
import { formatDuration } from '@/core/expr/format';
import { signalsOf, signalValue, variablesOf } from '@/core/expr/signals';
import type { Grafcet, Id, Variable } from '@/core/model/types';
import type { Value } from '@/core/simulation/engine';
import { stateAt, useSim } from '../simulation/simStore';
import { getProject, useDoc } from '../store/document';
import { useUi, type EditTarget } from '../store/uiStore';
import {
  ActionView,
  BarView,
  CommentView,
  LinkView,
  StepView,
  JumpView,
  StubView,
  type StepMark,
  TransitionView,
} from './elements';
import { CanvasMenu } from './CanvasMenu';
import { InlineEditor } from './InlineEditor';
import { IssueBadges } from './IssueBadges';
import { useInteraction } from './interactionStore';
import { Overlay } from './Overlay';
import { PeerLayer, useLiveCursor } from './PeerLayer';
import { SimOverlay } from './SimOverlay';
import { SimValueEditor } from './SimValueEditor';
import { SimWhy } from './SimWhy';
import { pointsToPath } from './svg';
import { useCanvasInteraction } from './useCanvasInteraction';
import { canvasSizeOf, setCanvasSize } from './viewport';
import { HintBar } from './HintBar';
import { SelectionBar } from './SelectionBar';
import { ZoomControls } from './ZoomControls';
import './canvas.css';

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

/**
 * The grafcet as drawn while text is typed in place: the edited text is the draft, so the boxes
 * around it grow as it is typed (only that element is a new object; the others keep their memo).
 */
function withDraft(
  g: Grafcet | undefined,
  t: EditTarget | null,
  draft: string | null,
): Grafcet | undefined {
  if (!g || !t || draft === null) return g;
  const a = g.actions[t.id];
  if (a && (t.field === 'text' || t.field === 'condition'))
    return { ...g, actions: { ...g.actions, [a.id]: { ...a, [t.field]: draft } } };
  const tr = g.transitions[t.id];
  if (tr && t.field === 'receptivity')
    return { ...g, transitions: { ...g.transitions, [tr.id]: { ...tr, receptivity: draft } } };
  const s = g.steps[t.id];
  if (s && t.field === 'label')
    return { ...g, steps: { ...g.steps, [s.id]: { ...s, label: draft } } };
  const c = g.comments[t.id];
  if (c && t.field === 'text')
    return { ...g, comments: { ...g.comments, [c.id]: { ...c, text: draft } } };
  return g;
}
/** Above this many elements, only what is (nearly) visible is rendered. */
const CULL_THRESHOLD = 1000;

/**
 * For the conditions of grafcet `g` while simulating: `on;inputs`, the indices (signalsOf order,
 * comma separated) of the signals that are true with these values and active steps, and of those
 * that are BOOL inputs (switched by a click). A key that changes only when they do.
 */
function signalKeys(
  g: Grafcet,
  values: Record<string, Value>,
  active: ReadonlySet<Id>,
): (source: string) => string | undefined {
  const project = getProject();
  const env = buildEnv(project, g.id);
  const inputs = new Set(
    Object.values(project.variables)
      .filter((v) => v.direction === 'input' && v.type === 'BOOL')
      .map((v) => v.name.toLowerCase()),
  );
  const read = (name: string) => (Object.hasOwn(values, name) ? values[name] : undefined);
  const stepActive = (n: number) => {
    const r = env.resolveStep(n);
    return typeof r === 'object' && active.has(r.stepId);
  };
  return (source) => {
    const r = source.trim() ? cachedBool(source) : null;
    if (!r?.ok) return undefined;
    const on: number[] = [];
    const switches: number[] = [];
    signalsOf(r.value).forEach((s, i) => {
      if (signalValue(s, read, stepActive)) on.push(i);
      if (s.type === 'var' && inputs.has(s.name.toLowerCase())) switches.push(i);
    });
    return `${on.join(',')};${switches.join(',')}`;
  };
}

/** A numeric value as the diagram shows it: TIME as a duration, REAL to 3 decimals at most. */
function shownValue(v: Value, type: Variable['type']): string {
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (type === 'TIME') return formatDuration(Math.round(v));
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3)));
}

/** The numeric variables of the project by lower-case name. */
function numericVariables(): Map<string, Variable> {
  return new Map(
    Object.values(getProject().variables)
      .filter((v) => v.type !== 'BOOL')
      .map((v) => [v.name.toLowerCase(), v]),
  );
}

/**
 * For the conditions of a grafcet while simulating: `name=shown` (comma separated) for each
 * numeric variable a condition reads, drawn over its name (see ExprText); undefined for none.
 */
function valueKeys(
  numeric: ReadonlyMap<string, Variable>,
  values: Record<string, Value>,
): (source: string) => string | undefined {
  return (source) => {
    if (!numeric.size) return undefined;
    const r = source.trim() ? cachedBool(source) : null;
    if (!r?.ok) return undefined;
    const parts: string[] = [];
    for (const name of variablesOf(r.value)) {
      const v = numeric.get(name);
      if (v && Object.hasOwn(values, name))
        parts.push(`${name}=${shownValue(values[name]!, v.type)}`);
    }
    return parts.length ? parts.join(',') : undefined;
  };
}

/** What the simulation shows on the diagram: live state, or the past state under the cursor. */
function useSimDisplay() {
  const on = useSim((s) => s.on);
  const snapshot = useSim((s) => s.snapshot);
  const cursor = useSim((s) => s.cursor);
  const cycles = useSim((s) => s.cycles.length);
  // Keys of what is drawn, so a snapshot that only moves the clock changes nothing.
  const { activeKey, valuesKey, executingKey } = useMemo(
    () => ({
      activeKey: snapshot ? snapshot.active.join(',') : '',
      valuesKey: snapshot ? JSON.stringify(snapshot.values) : '',
      executingKey: snapshot ? snapshot.executing.join(',') : '',
    }),
    [snapshot],
  );
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
  const docG = useDoc((s) => (gid ? s.project.grafcets[gid] : undefined));
  const editing = useUi((s) => s.editing);
  const draft = useInteraction((s) => s.draft);
  const g = useMemo(() => withDraft(docG, editing, draft), [docG, editing, draft]);
  const viewport = useUi((s) => (gid ? s.viewports[gid] : undefined)) ?? DEFAULT_VIEWPORT;
  const tool = useUi((s) => s.tool);
  const showGrid = usePrefs((s) => s.showGrid);
  const panning = useInteraction((s) => s.panning);
  const pending = useUi((s) => s.pending);
  const compact = useCompact();
  // The right-click menu: desktops, while editing (touch screens have the selection toolbar).
  const coarse = useCoarsePointer();
  const noMenu = readOnly || coarse;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => (gid ? canvasSizeOf(gid) : { width: 800, height: 600 }));
  const handlers = useCanvasInteraction(containerRef, gid, readOnly);
  const live = useLive((s) => s.status !== 'off');
  useLiveCursor(containerRef, gid, live && focused);
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

  const total = useMemo(
    () =>
      g
        ? Object.keys(g.steps).length +
          Object.keys(g.transitions).length +
          Object.keys(g.comments).length +
          Object.keys(g.actions).length
        : 0,
    [g],
  );
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
    // While simulating: which signals of a condition are true or inputs, as a key that changes
    // only when they do (so unchanged elements keep their memoized drawing).
    const signalKey = sim ? signalKeys(g, sim.values, sim.active) : () => undefined;
    const numeric = sim ? numericVariables() : new Map<string, Variable>();
    const valueKey = sim ? valueKeys(numeric, sim.values) : () => undefined;
    // The field typed in place: the editor (in the focused pane) shows it instead of the element.
    const editField = (id: Id) => (focused && editing?.id === id ? editing.field : undefined);
    return (
      <>
        {comments
          .filter((c) => inView(c.id))
          .map((c) => (
            <CommentView key={c.id} comment={c} editing={editField(c.id)} />
          ))}
        {geom.links
          .filter((l) => linkInView(l.points))
          .map((l) => (
            <LinkView key={l.key} linkKey={l.key} d={pointsToPath(l.points)} arrow={linkArrow(l)} />
          ))}
        {geom.bars.map((b) => (
          <BarView
            key={b.key}
            barKey={b.key}
            x1={b.x1}
            x2={b.x2}
            y={b.y}
            stem={pointsToPath(b.stem)}
          />
        ))}
        {geom.stubs.map((s) => (
          <StubView key={s.key} d={pointsToPath(s.points)} />
        ))}
        {geom.jumps
          .filter((j) => inView(j.elementId))
          .map((j) => (
            <JumpView
              key={j.key}
              jump={j}
              editing={j.side === 'from' && editField(j.elementId) === 'jump'}
            />
          ))}
        {transitions
          .filter((tr) => inView(tr.id))
          .map((tr) => (
            <TransitionView
              key={tr.id}
              transition={tr}
              signals={signalKey(tr.receptivity)}
              values={valueKey(tr.receptivity)}
              editing={editField(tr.id)}
            />
          ))}
        {steps
          .filter((s) => inView(s.id))
          .map((s) => (
            <StepView
              key={s.id}
              step={s}
              active={sim?.active.has(s.id)}
              mark={markOf(s.id)}
              editing={editField(s.id)}
            />
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
            sim &&
            action.kind !== 'continuous' &&
            action.kind !== 'forcing' &&
            Object.hasOwn(sim.values, target)
              ? sim.values[target]
              : undefined;
          const written = value === undefined ? undefined : numeric.get(target);
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
              editing={editField(action.id)}
              conditionSignals={action.condition ? signalKey(action.condition) : undefined}
              conditionValues={action.condition ? valueKey(action.condition) : undefined}
              live={
                value === undefined
                  ? undefined
                  : written
                    ? shownValue(value, written.type)
                    : typeof value === 'boolean'
                      ? value
                        ? '1'
                        : '0'
                      : String(value)
              }
              liveName={written ? target : undefined}
            />
          );
        })}
      </>
    );
    // cull is derived from cullKey; listing it would re-render on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, geom, cullKey, sim, editing, focused]);

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
    <CanvasMenu g={g} disabled={noMenu} canvasRef={containerRef}>
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
        onContextMenu={handlers.onContextMenu}
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
          // Without our menu (simulating, touch screens), no browser menu either.
          onContextMenu={noMenu ? (e) => e.preventDefault() : undefined}
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
          {live && g && geom && <PeerLayer g={g} geom={geom} zoom={viewport.zoom} />}
          {g && geom && !readOnly && <IssueBadges g={g} geom={geom} />}
          {g && geom && sim && (
            <SimOverlay
              g={g}
              active={sim.active}
              enabled={enabled}
              time={cursor ?? snapshot?.time ?? 0}
              activatedAt={cursor === null ? (snapshot?.activatedAt ?? null) : null}
            />
          )}
          {focused && g && geom && <Overlay g={g} geom={geom} readOnly={readOnly} />}
        </svg>
        {focused && g && geom && <InlineEditor g={g} geom={geom} viewport={viewport} />}
        {focused && <SimValueEditor viewport={viewport} />}
        {g && sim && (
          <SimWhy
            g={g}
            sim={sim}
            enabled={enabled}
            time={cursor ?? snapshot?.time ?? 0}
            activatedAt={cursor === null ? (snapshot?.activatedAt ?? null) : null}
            viewport={viewport}
          />
        )}
        {/* Desktops show zoom and hints as islands around the canvas (see App). */}
        {gid && compact && <ZoomControls gid={gid} zoom={viewport.zoom} />}
        {focused && compact && <HintBar />}
        {focused && g && !readOnly && <SelectionBar g={g} />}
        {focused && pending && (
          <div
            role="status"
            className="pointer-events-none absolute top-[60px] left-1/2 -translate-x-1/2 rounded-md border border-accent bg-surface px-3 py-1.5 text-text shadow-pop compact:top-2"
          >
            {t('canvas.loopHint')}
          </div>
        )}
      </div>
    </CanvasMenu>
  );
}
