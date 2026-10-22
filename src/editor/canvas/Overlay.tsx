import {
  elementBounds,
  portPosition,
  type GrafcetGeometry,
  type Rect,
} from '@/core/layout/geometry';
import { useCoarsePointer } from '@/app/ui/media';
import type { Grafcet, Id } from '@/core/model/types';
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

/** Selection, link handles, link-drag preview, marquee and flash: everything that is not the diagram. */
export function Overlay({
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
  const { marquee, link, hover, moving, dropTarget } = useInteraction();

  const ids = Object.keys(selection);
  const handleIds = new Set<Id>();
  if (!readOnly && !moving && !marquee && !pending) {
    if (ids.length === 1 && (g.steps[ids[0]!] || g.transitions[ids[0]!])) handleIds.add(ids[0]!);
    if (hover && (g.steps[hover] || g.transitions[hover])) handleIds.add(hover);
    if (link) handleIds.clear();
  }
  const selLink = selectedLink ? geom.links.find((l) => l.key === selectedLink) : undefined;

  let targets: Id[] = [];
  if (link) {
    targets =
      link.fromKind === 'step'
        ? Object.keys(g.transitions)
        : Object.keys(g.steps).filter((id) => id !== link.from);
  } else if (pending?.kind === 'loop') {
    targets = Object.keys(g.steps);
  }
  if (dropTarget) targets = [dropTarget];
  const hotTarget = link ? link.target : pending ? hover : dropTarget;

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
      {link && <path className="gm-link-preview" d={pointsToPath([link.origin, link.current])} />}
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
