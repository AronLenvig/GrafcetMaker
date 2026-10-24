import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTION_GAP,
  ACTION_HEIGHT,
  ACTION_MIN_WIDTH,
  elementBounds,
  layoutActions,
  nextStepPosition,
  PITCH,
  portPosition,
  ROW,
  STEP_HALF,
  STEP_SIZE,
  TRANSITION_THICKNESS,
  TRANSITION_WIDTH,
  type GrafcetGeometry,
  type Rect,
} from '@/core/layout/geometry';
import { useCoarsePointer } from '@/app/ui/media';
import { nextStepNumber, preferredStepNumber } from '@/core/model/ops';
import type { Grafcet, Id, Point } from '@/core/model/types';
import { useShallow } from 'zustand/react/shallow';
import { useUi } from '../store/uiStore';
import { useInteraction } from './interactionStore';
import { pointsToPath } from './svg';

const PAD = 4;

function SelectionRect({ r, className = 'gm-selection' }: { r: Rect; className?: string }) {
  return (
    <rect
      className={className}
      x={r.x - PAD}
      y={r.y - PAD}
      width={r.width + 2 * PAD}
      height={r.height + 2 * PAD}
      rx={2}
    />
  );
}

/**
 * Fingers: the handle sits just outside the element (so the element itself can still be dragged)
 * on a short stem, with a larger invisible target. Sizes are in screen pixels, capped in diagram
 * units so a zoomed-out diagram is not buried under handles.
 */
const TOUCH_OFFSET = 14;
const TOUCH_HIT = 20;
const TOUCH_DOT = 6;

function Handles({ g, id }: { g: Grafcet; id: Id }) {
  const coarse = useCoarsePointer();
  const zoom = useUi((s) => s.viewports[g.id]?.zoom ?? 1);
  return (
    <>
      {(['in', 'out'] as const).map((port) => {
        const p = portPosition(g, id, port);
        if (!p) return null;
        if (!coarse)
          return (
            <circle
              key={port}
              className="gm-handle"
              data-handle={port}
              data-id={id}
              cx={p.x}
              cy={p.y}
              r={4.5}
            />
          );
        const cy = p.y + (port === 'out' ? 1 : -1) * Math.min(TOUCH_OFFSET / zoom, TOUCH_OFFSET);
        return (
          <g key={port}>
            <path className="gm-handle-stem" d={`M${p.x} ${p.y}V${cy}`} />
            <circle
              className="gm-handle-hit"
              data-handle={port}
              data-id={id}
              cx={p.x}
              cy={cy}
              r={Math.min(TOUCH_HIT / zoom, 12)}
            />
            <circle
              className="gm-handle"
              data-handle={port}
              data-id={id}
              cx={p.x}
              cy={cy}
              r={Math.min(TOUCH_DOT / zoom, TOUCH_DOT)}
            />
          </g>
        );
      })}
    </>
  );
}

/** Where the next action of a step goes: right after its last action box. */
function nextActionBox(g: Grafcet, geom: GrafcetGeometry, stepId: Id): Rect & { first: boolean } {
  const s = g.steps[stepId]!;
  const boxes = layoutActions(s, geom.index.actions.get(stepId) ?? []);
  const last = boxes[boxes.length - 1];
  return {
    x: last ? last.x + last.width : s.position.x + STEP_HALF + ACTION_GAP,
    y: s.position.y - ACTION_HEIGHT / 2,
    width: ACTION_MIN_WIDTH,
    height: ACTION_HEIGHT,
    first: !last,
  };
}

/*
 * Ghost elements: where `A` or `Enter` would add the next action or step (clickable), or what a
 * placing tool would place under the pointer.
 */

function GhostAction({
  g,
  box,
  stepId,
  title,
}: {
  g: Grafcet;
  box: Rect & { first?: boolean };
  stepId: Id | null;
  title?: string;
}) {
  const s = stepId ? g.steps[stepId] : undefined;
  const cy = box.y + box.height / 2;
  return (
    <g
      className={title ? 'gm-ghost gm-ghost-hit' : 'gm-ghost'}
      data-ghost={title ? 'action' : undefined}
    >
      {title && <title>{title}</title>}
      {s && box.first && <path d={`M${s.position.x + STEP_HALF} ${cy}H${box.x}`} />}
      <rect x={box.x} y={box.y} width={box.width} height={box.height} />
      <text x={box.x + box.width / 2} y={cy}>
        +
      </text>
    </g>
  );
}

function GhostStep({ at, number }: { at: Point; number: number }) {
  return (
    <>
      <rect x={at.x - STEP_HALF} y={at.y - STEP_HALF} width={STEP_SIZE} height={STEP_SIZE} />
      <text x={at.x} y={at.y}>
        {number}
      </text>
    </>
  );
}

function GhostBar({ at }: { at: Point }) {
  return (
    <rect
      className="gm-ghost-bar"
      x={at.x - TRANSITION_WIDTH / 2}
      y={at.y - TRANSITION_THICKNESS / 2}
      width={TRANSITION_WIDTH}
      height={TRANSITION_THICKNESS}
    />
  );
}

/** Ghosts of the single selected step, transition or action: click to add what they show. */
function SelectionGhosts({ g, geom, id }: { g: Grafcet; geom: GrafcetGeometry; id: Id }) {
  const { t } = useTranslation();
  const step = g.steps[id];
  const tr = g.transitions[id];
  const stepId = step ? id : (g.actions[id]?.stepId ?? null);
  const out: ReactNode[] = [];
  if (stepId)
    out.push(
      <GhostAction
        key="action"
        g={g}
        box={nextActionBox(g, geom, stepId)}
        stepId={stepId}
        title={t('canvas.ghost.action')}
      />,
    );
  if (step && !geom.index.outgoing.has(id)) {
    const { x, y } = step.position;
    out.push(
      <g key="sequence" className="gm-ghost gm-ghost-hit" data-ghost="sequence">
        <title>{t('canvas.ghost.sequence')}</title>
        <path d={`M${x} ${y + STEP_HALF}V${y + PITCH - STEP_HALF}`} />
        <GhostBar at={{ x, y: y + ROW }} />
        <GhostStep at={{ x, y: y + PITCH }} number={preferredStepNumber(g, step.number)} />
      </g>,
    );
  }
  if (tr && tr.to.length === 0) {
    const { x, y } = tr.position;
    const at = nextStepPosition(tr);
    const prev = Math.max(-1, ...tr.from.map((s) => g.steps[s]?.number ?? -1));
    out.push(
      <g key="step" className="gm-ghost gm-ghost-hit" data-ghost="sequence">
        <title>{t('canvas.ghost.step')}</title>
        {/* Below the bar, or from its left end down (right to left). */}
        <path d={`M${x} ${y}H${at.x}V${at.y - STEP_HALF}`} />
        <GhostStep at={at} number={preferredStepNumber(g, prev)} />
      </g>,
    );
  }
  return <>{out}</>;
}

/** What the active placing tool would add where the pointer is. */
function ToolGhost({ g, geom }: { g: Grafcet; geom: GrafcetGeometry }) {
  const tool = useUi((s) => s.tool);
  const cursor = useInteraction((s) => s.cursor);
  if (!cursor) return null;
  const { at, stepId } = cursor;
  switch (tool) {
    case 'step':
      return (
        <g className="gm-ghost">
          <GhostStep at={at} number={nextStepNumber(g)} />
        </g>
      );
    case 'transition':
      return (
        <g className="gm-ghost">
          <path d={`M${at.x} ${at.y - 10}V${at.y + 10}`} />
          <GhostBar at={at} />
        </g>
      );
    case 'comment':
      return (
        <g className="gm-ghost">
          <rect x={at.x} y={at.y} width={80} height={30} />
        </g>
      );
    case 'action':
      return (
        <GhostAction
          g={g}
          stepId={stepId}
          box={
            stepId && g.steps[stepId]
              ? nextActionBox(g, geom, stepId)
              : {
                  x: at.x,
                  y: at.y - ACTION_HEIGHT / 2,
                  width: ACTION_MIN_WIDTH,
                  height: ACTION_HEIGHT,
                }
          }
        />
      );
    default:
      return null;
  }
}

/** Selection, link handles, link-drag preview, marquee and flash: everything that is not the diagram. */
function OverlayView({
  g,
  geom,
  readOnly,
}: {
  g: Grafcet;
  geom: GrafcetGeometry;
  readOnly: boolean;
}) {
  const selection = useUi((s) => s.selection);
  const selectedLink = useUi((s) => s.selectedLink);
  const flash = useUi((s) => s.flash);
  const pending = useUi((s) => s.pending);
  const editing = useUi((s) => s.editing);
  const tool = useUi((s) => s.tool);
  const { marquee, link, hover, moving, dropTarget } = useInteraction(
    useShallow((s) => ({
      marquee: s.marquee,
      link: s.link,
      hover: s.hover,
      moving: s.moving,
      dropTarget: s.dropTarget,
    })),
  );

  const ids = Object.keys(selection);
  const handleIds = new Set<Id>();
  if (!readOnly && !moving && !marquee && !pending) {
    if (ids.length === 1 && (g.steps[ids[0]!] || g.transitions[ids[0]!])) handleIds.add(ids[0]!);
    if (hover && (g.steps[hover] || g.transitions[hover])) handleIds.add(hover);
    if (link) handleIds.clear();
  }
  const selLink = selectedLink ? geom.links.find((l) => l.key === selectedLink) : undefined;
  // Ghosts of the selection with the Select tool only (a placing tool shows its own ghost).
  const ghostsOf =
    !readOnly &&
    tool === 'select' &&
    !moving &&
    !marquee &&
    !pending &&
    !link &&
    !editing &&
    ids.length === 1
      ? ids[0]!
      : null;

  let targets: Id[] = [];
  if (link) {
    targets =
      link.fromKind === 'step'
        ? Object.keys(g.transitions)
        : Object.keys(g.steps).filter((id) => id !== link.from);
  } else if (pending?.kind === 'loop') {
    targets = Object.keys(g.steps);
  }
  if (dropTarget) targets = [dropTarget.stepId];
  const hotTarget = link ? link.target : pending ? hover : (dropTarget?.stepId ?? null);
  const dropStep = dropTarget ? g.steps[dropTarget.stepId] : undefined;

  return (
    <g className="gm-overlay">
      {ids.map((id) => {
        const r = elementBounds(g, geom, id);
        return r ? <SelectionRect key={id} r={r} /> : null;
      })}
      {selLink && <path className="gm-selected-link" d={pointsToPath(selLink.points)} />}
      {targets.map((id) => {
        const r = elementBounds(g, geom, id);
        if (!r) return null;
        const hot = hotTarget === id;
        return (
          <g key={id}>
            <SelectionRect r={r} className={hot ? 'gm-target-hot' : 'gm-target'} />
            {hot && <path className="gm-line" d={`M${r.x + r.width + 8} ${r.y - 4}h8m-4 -4v8`} />}
          </g>
        );
      })}
      {dropTarget && dropStep && (
        // Where the dragged action goes among the step's actions.
        <path
          className="gm-drop-mark"
          d={`M${dropTarget.x} ${dropStep.position.y - ACTION_HEIGHT / 2 - 6}v${ACTION_HEIGHT + 12}`}
        />
      )}
      {link && <path className="gm-link-preview" d={pointsToPath([link.origin, link.current])} />}
      {ghostsOf && <SelectionGhosts g={g} geom={geom} id={ghostsOf} />}
      {!readOnly && <ToolGhost g={g} geom={geom} />}
      {[...handleIds].map((id) => (
        <Handles key={id} g={g} id={id} />
      ))}
      {marquee && (
        <rect
          className="gm-marquee"
          x={marquee.x}
          y={marquee.y}
          width={marquee.width}
          height={marquee.height}
        />
      )}
      {flash &&
        flash.ids.map((id) => {
          const r = elementBounds(g, geom, id);
          return r ? (
            <SelectionRect
              key={`${flash.at}:${id}`}
              r={{ x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 }}
              className="gm-flash"
            />
          ) : null;
        })}
    </g>
  );
}

/** Memoized: the canvas re-renders on every pan and zoom frame. */
export const Overlay = memo(OverlayView);
