import { computeGeometry, grafcetBounds, type Rect } from '@/core/layout/geometry';
import type { Id, Point } from '@/core/model/types';
import { getProject } from '../store/document';
import { useUi, type Viewport } from '../store/uiStore';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const FIT_PADDING = 40;

/** Size of the canvas element in CSS px, kept up to date by the Canvas' ResizeObserver. */
export const canvasSize = { width: 800, height: 600 };

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function getViewport(gid: Id): Viewport {
  return useUi.getState().viewports[gid] ?? DEFAULT_VIEWPORT;
}

export function setViewport(gid: Id, v: Viewport): void {
  useUi.setState((s) => ({ viewports: { ...s.viewports, [gid]: v } }));
}

export function screenToDiagram(v: Viewport, p: Point): Point {
  return { x: v.x + p.x / v.zoom, y: v.y + p.y / v.zoom };
}

export function diagramToScreen(v: Viewport, p: Point): Point {
  return { x: (p.x - v.x) * v.zoom, y: (p.y - v.y) * v.zoom };
}

/** Zooms keeping the diagram point under `screen` fixed. */
export function zoomAt(gid: Id, factor: number, screen: Point): void {
  const v = getViewport(gid);
  const zoom = clampZoom(v.zoom * factor);
  const d = screenToDiagram(v, screen);
  setViewport(gid, { zoom, x: d.x - screen.x / zoom, y: d.y - screen.y / zoom });
}

export function zoomBy(gid: Id, factor: number): void {
  zoomAt(gid, factor, { x: canvasSize.width / 2, y: canvasSize.height / 2 });
}

export function setZoom(gid: Id, zoom: number): void {
  zoomBy(gid, zoom / getViewport(gid).zoom);
}

export function panBy(gid: Id, dxScreen: number, dyScreen: number): void {
  const v = getViewport(gid);
  setViewport(gid, { ...v, x: v.x - dxScreen / v.zoom, y: v.y - dyScreen / v.zoom });
}

function showRect(gid: Id, r: Rect, maxZoom: number): void {
  const w = Math.max(1, canvasSize.width - 2 * FIT_PADDING);
  const h = Math.max(1, canvasSize.height - 2 * FIT_PADDING);
  const zoom = clampZoom(Math.min(w / Math.max(r.width, 1), h / Math.max(r.height, 1), maxZoom));
  setViewport(gid, {
    zoom,
    x: r.x + r.width / 2 - canvasSize.width / 2 / zoom,
    y: r.y + r.height / 2 - canvasSize.height / 2 / zoom,
  });
}

function boundsOf(gid: Id, ids?: Iterable<Id>): Rect | null {
  const g = getProject().grafcets[gid];
  if (!g) return null;
  return grafcetBounds(g, computeGeometry(g), ids ? new Set(ids) : undefined);
}

/** Fits the whole grafcet (or some elements) into view, never zooming in beyond 100 %. */
export function fitToContent(gid: Id, ids?: Iterable<Id>): void {
  const r = boundsOf(gid, ids);
  if (r) showRect(gid, r, 1);
  else setViewport(gid, DEFAULT_VIEWPORT);
}

/** Pans (and zooms out if needed) so the elements are visible; keeps the zoom when they fit. */
export function revealElements(gid: Id, ids: Iterable<Id>): void {
  const r = boundsOf(gid, ids);
  if (!r) return;
  const v = getViewport(gid);
  const vw = canvasSize.width / v.zoom;
  const vh = canvasSize.height / v.zoom;
  const inside =
    r.x >= v.x && r.y >= v.y && r.x + r.width <= v.x + vw && r.y + r.height <= v.y + vh;
  if (inside) return;
  if (r.width + (2 * FIT_PADDING) / v.zoom <= vw && r.height + (2 * FIT_PADDING) / v.zoom <= vh) {
    setViewport(gid, { ...v, x: r.x + r.width / 2 - vw / 2, y: r.y + r.height / 2 - vh / 2 });
  } else {
    showRect(gid, r, v.zoom);
  }
}

/** Center of the visible area in diagram coordinates. */
export function viewCenter(gid: Id): Point {
  const v = getViewport(gid);
  return screenToDiagram(v, { x: canvasSize.width / 2, y: canvasSize.height / 2 });
}
