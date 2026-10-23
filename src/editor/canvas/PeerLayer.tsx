import { memo, useEffect, type CSSProperties, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { peerColor, useLive } from '@/app/collab/liveState';
import type { Presence } from '@/core/collab/wire';
import { elementBounds, type GrafcetGeometry, type Rect } from '@/core/layout/geometry';
import type { Grafcet, Id } from '@/core/model/types';
import { getViewport, screenToDiagram } from './viewport';

const PAD = 7;
/** Approximate width of one character of the 11 px name labels. */
const CHAR = 6.6;

/** A name label above `(x, y)`, drawn at screen size whatever the zoom (`k` = 1 / zoom). */
function Tag({ x, y, k, text }: { x: number; y: number; k: number; text: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect
        className="gm-peer-tag"
        x={0}
        y={-19}
        width={text.length * CHAR + 12}
        height={17}
        rx={4}
      />
      <text className="gm-peer-name" x={6} y={-6.5}>
        {text}
      </text>
    </g>
  );
}

const box = (r: Rect, pad: number, className: string) => (
  <rect
    className={className}
    x={r.x - pad}
    y={r.y - pad}
    width={r.width + 2 * pad}
    height={r.height + 2 * pad}
    rx={3}
  />
);

/**
 * Live sessions: where the others are on this grafcet — their pointer with their name, what they
 * selected, and the element they are editing (dashed, ✎).
 */
export const PeerLayer = memo(function PeerLayer({
  g,
  geom,
  zoom,
}: {
  g: Grafcet;
  geom: GrafcetGeometry;
  zoom: number;
}) {
  const { t } = useTranslation();
  const peers = useLive((s) => s.peers);
  const here = Object.entries(peers).filter(
    (e): e is [string, Presence] => !!e[1] && e[1].g === g.id,
  );
  if (!here.length) return null;
  const k = 1 / zoom;
  return (
    <g className="gm-peers" aria-hidden="true">
      {here.map(([id, p]) => {
        const name = p.name || t('live.guest');
        const selected = p.sel
          .filter((eid) => eid !== p.ed)
          .map((eid) => elementBounds(g, geom, eid))
          .filter((r): r is Rect => !!r);
        const edited = p.ed ? elementBounds(g, geom, p.ed) : null;
        // The name goes with the pointer; without one, next to what they work on.
        const anchor = edited ?? (p.c ? null : selected[0]);
        return (
          <g key={id} style={{ '--peer': peerColor(p.cid) } as CSSProperties}>
            {selected.map((r, i) => (
              <g key={i}>{box(r, PAD, 'gm-peer-selection')}</g>
            ))}
            {edited && box(edited, PAD + 3, 'gm-peer-editing')}
            {anchor && (
              <Tag
                x={anchor.x - PAD}
                y={anchor.y - PAD - (edited ? 3 : 0)}
                k={k}
                text={edited ? `${name} ✎` : name}
              />
            )}
            {p.c && (
              <g
                className="gm-peer-cursor"
                style={{ transform: `translate(${p.c.x}px, ${p.c.y}px) scale(${k})` }}
              >
                <path className="gm-peer-pointer" d="M0 0V17l4.6-4.4 3 6.8 2.8-1.2-2.9-6.6h6z" />
                {!edited && <Tag x={12} y={36} k={1} text={name} />}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});

/**
 * Live sessions: reports where the pointer is on this canvas (diagram units, at most once per
 * frame) for the others to see; cleared when it leaves.
 */
export function useLiveCursor(
  containerRef: RefObject<HTMLDivElement | null>,
  gid: Id | null,
  enabled: boolean,
): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !gid || !enabled) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const move = (e: PointerEvent) => {
      last = e;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        if (!last) return;
        const r = el.getBoundingClientRect();
        const at = screenToDiagram(getViewport(gid), {
          x: last.clientX - r.left,
          y: last.clientY - r.top,
        });
        useLive.setState({ cursor: { g: gid, at: { x: Math.round(at.x), y: Math.round(at.y) } } });
      });
    };
    const leave = () => {
      last = null;
      useLive.setState({ cursor: null });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      useLive.setState({ cursor: null });
    };
  }, [containerRef, gid, enabled]);
}
