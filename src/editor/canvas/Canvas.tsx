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
import { useDoc } from '../store/document';
import { useUi } from '../store/uiStore';
import {
  ActionView,
  BarView,
  CommentView,
  LinkView,
  StepView,
  StubView,
  TransitionView,
} from './elements';
import { InlineEditor } from './InlineEditor';
import { useInteraction } from './interactionStore';
import { Overlay } from './Overlay';
import { pointsToPath } from './svg';
import { useCanvasInteraction } from './useCanvasInteraction';
import { canvasSize } from './viewport';
import { ZoomControls } from './ZoomControls';
import './canvas.css';

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
/** Above this many elements, only what is (nearly) visible is rendered. */
const CULL_THRESHOLD = 1000;

export function Canvas({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const gid = useUi((s) => s.activeGrafcetId);
  const g = useDoc((s) => (gid ? s.project.grafcets[gid] : undefined));
  const viewport = useUi((s) => (gid ? s.viewports[gid] : undefined)) ?? DEFAULT_VIEWPORT;
  const tool = useUi((s) => s.tool);
  const showGrid = usePrefs((s) => s.showGrid);
  const panning = useInteraction((s) => s.panning);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: canvasSize.width, height: canvasSize.height });
  const handlers = useCanvasInteraction(containerRef, gid, readOnly);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      canvasSize.width = r.width;
      canvasSize.height = r.height;
      setSize({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
            <StepView key={s.id} step={s} />
          ))}
        {actionBoxes.map(({ box, first }) => (
          <ActionView
            key={box.id}
            action={g.actions[box.id]!}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            first={first}
          />
        ))}
      </>
    );
    // cull is derived from cullKey; listing it would re-render on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, geom, cullKey]);

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
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onPointerLeave={handlers.onPointerLeave}
        onDoubleClick={handlers.onDoubleClick}
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
        {g && geom && <Overlay g={g} geom={geom} readOnly={readOnly} />}
      </svg>
      {g && geom && <InlineEditor g={g} geom={geom} viewport={viewport} />}
      {gid && <ZoomControls gid={gid} zoom={viewport.zoom} />}
    </div>
  );
}
