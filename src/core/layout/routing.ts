/**
 * Link routing: link, bar and stub shapes, link keys, and the routing of upward links (loops)
 * around their own sequence, with the per-grafcet structure cache it keeps.
 */
import type { GrafcetIndex } from '../model/graph';
import type { Grafcet, Id, Point, Transition } from '../model/types';
import {
  LABEL_FONT_SIZE,
  LOOP_DROP,
  LOOP_LANE,
  LOOP_MARGIN,
  OR_LINE_OFFSET,
  STEP_HALF,
  STUB,
} from './constants';
import { ACTION_MARK_RISE, layoutActions, snap, snapUp, textWidth, transitionBox } from './shapes';

export interface LinkGeom {
  /** `${transitionId}:${side}:${stepId}` */
  key: string;
  transitionId: Id;
  stepId: Id;
  /** 'in' = step → transition (upstream of the transition); 'out' = transition → step. */
  side: 'in' | 'out';
  points: Point[];
  /** Links flowing upward (loops): x of their side lane (`points` go source, below it, lane foot, lane top, above the target, target). */
  loop?: { sideX: number };
  /** Middle of the upward segment, drawn with an arrow (once per lane shared by loops to one target). */
  arrow?: Point;
  /**
   * Arrow showing the direction of a link into or out of a transition flowing right to left (IEC
   * 60848: links not drawn top to bottom carry an arrow).
   */
  flowArrow?: Point & { dir: ArrowDir };
}

export type ArrowDir = 'up' | 'down' | 'left' | 'right';

/** Filled arrowhead centred on `p`, pointing `dir`. */
export function arrowPath(p: Point, dir: ArrowDir): string {
  const { x, y } = p;
  switch (dir) {
    case 'up':
      return `M${x} ${y - 6}L${x - 4.5} ${y + 3}L${x + 4.5} ${y + 3}Z`;
    case 'down':
      return `M${x} ${y + 6}L${x - 4.5} ${y - 3}L${x + 4.5} ${y - 3}Z`;
    case 'left':
      return `M${x - 6} ${y}L${x + 3} ${y - 4.5}L${x + 3} ${y + 4.5}Z`;
    case 'right':
      return `M${x + 6} ${y}L${x - 3} ${y - 4.5}L${x - 3} ${y + 4.5}Z`;
  }
}

/** The direction arrow of a link, if it has one: loops point up, links of right-to-left transitions left. */
export function linkArrow(l: LinkGeom): string | undefined {
  if (l.flowArrow) return arrowPath(l.flowArrow, l.flowArrow.dir);
  return l.arrow ? arrowPath(l.arrow, 'up') : undefined;
}

/** A polyline without repeated points or points in the middle of a straight run. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    const prev = out[out.length - 2];
    if (
      prev &&
      last &&
      ((prev.x === last.x && last.x === p.x) || (prev.y === last.y && last.y === p.y))
    )
      out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

/**
 * Step → transition flowing right to left: the link enters the bar from the right, straight from
 * a step above on its right (down, then left), otherwise below the step (on its OR line), along
 * a lane STUB right of the bar and into it.
 */
export function leftwardIn(
  start: Point,
  t: Transition,
  divY: number,
): Pick<LinkGeom, 'points' | 'flowArrow'> {
  const end = { ...t.position };
  const lane = end.x + STUB;
  const points = simplify(
    start.x >= lane && start.y + OR_LINE_OFFSET <= end.y
      ? [start, { x: start.x, y: end.y }, end]
      : [start, { x: start.x, y: divY }, { x: lane, y: divY }, { x: lane, y: end.y }, end],
  );
  const from = points[points.length - 2]!;
  return { points, flowArrow: { x: (from.x + end.x) / 2, y: end.y, dir: 'left' } };
}

/**
 * Transition flowing right to left → step: the link leaves the bar on the left, straight to a
 * step below on its left (left, then down), otherwise along a lane STUB left of the bar to the
 * step's OR line and into its top.
 */
export function leftwardOut(
  t: Transition,
  end: Point,
  convY: number,
): Pick<LinkGeom, 'points' | 'flowArrow'> {
  const start = { ...t.position };
  const lane = start.x - STUB;
  const points = simplify(
    end.x <= lane && start.y <= convY
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: lane, y: start.y }, { x: lane, y: convY }, { x: end.x, y: convY }, end],
  );
  const to = points[1]!;
  return { points, flowArrow: { x: (start.x + to.x) / 2, y: start.y, dir: 'left' } };
}

export interface BarGeom {
  key: string;
  transitionId: Id;
  /** join = AND convergence (above the transition); split = AND divergence (below). */
  kind: 'join' | 'split';
  x1: number;
  x2: number;
  y: number;
  stem: [Point, Point];
}

export interface StubGeom {
  key: string;
  transitionId: Id;
  kind: 'source' | 'sink';
  points: [Point, Point];
}

export const linkKey = (transitionId: Id, side: 'in' | 'out', stepId: Id) =>
  `${transitionId}:${side}:${stepId}`;

export const barKey = (transitionId: Id, kind: BarGeom['kind']) => `${transitionId}:${kind}`;

/** What a link key names (see linkKey, barKey): one link, or an AND bar and the links it joins. */
export type LinkRef =
  | { kind: 'link'; transitionId: Id; side: 'in' | 'out'; stepId: Id }
  | { kind: 'bar'; transitionId: Id; bar: BarGeom['kind'] };

export function parseLinkKey(key: string): LinkRef | null {
  const [transitionId, part, stepId, rest] = key.split(':');
  if (!transitionId || rest !== undefined) return null;
  if ((part === 'join' || part === 'split') && stepId === undefined)
    return { kind: 'bar', transitionId, bar: part };
  if ((part === 'in' || part === 'out') && stepId)
    return { kind: 'link', transitionId, side: part, stepId };
  return null;
}

/** An upward link (loop) waiting to be routed once every other wire is known. */
export interface PendingUpward {
  link: LinkGeom;
  start: Point;
  dropY: number;
  junctionY: number;
  end: Point;
  target: Id;
  /** Where the loop starts: the step under a transition it goes back up to, or the transition. */
  source: Id;
  /** The transition whose routing applies (and whose sequence the loop belongs to). */
  owner: Id;
  override?: number;
  dropOverride?: number;
  /** x of its side lane: first just left of its body, then clear of what is in the way. */
  laneX: number;
}

/** Room kept between a loop's bottom line and what it passes under. */
const CLEARANCE = 6;

/** An area a loop's bottom line must not cross (an element, its texts, or a wire). */
interface Box {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * Connected sequences: each step and transition mapped to a representative of the steps and
 * transitions linked to it. Loops are routed around their own sequence only, not around a
 * separate sequence drawn next to it.
 */
function sequences(g: Grafcet): Map<Id, Id> {
  const parent = new Map<Id, Id>();
  for (const id of Object.keys(g.steps)) parent.set(id, id);
  for (const id of Object.keys(g.transitions)) parent.set(id, id);
  const find = (id: Id): Id => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    for (let x = id; x !== root;) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  for (const t of Object.values(g.transitions)) {
    for (const id of [...t.from, ...t.to]) {
      if (!parent.has(id)) continue;
      const a = find(t.id);
      const b = find(id);
      if (a !== b) parent.set(a, b);
    }
  }
  const out = new Map<Id, Id>();
  for (const id of parent.keys()) out.set(id, find(id));
  return out;
}

/**
 * The body of a loop: what lies on the way down from its target to its source, following only the
 * links that go down (other loops do not count). Its lane runs just left of it, so a loop inside a
 * branch stays beside that branch.
 */
function loopBody(down: Map<Id, Id[]>, up: Map<Id, Id[]>, target: Id, source: Id): Set<Id> {
  const reach = (from: Id, next: Map<Id, Id[]>) => {
    const seen = new Set<Id>();
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const m of next.get(n) ?? []) stack.push(m);
    }
    return seen;
  };
  const above = reach(source, up);
  const body = new Set([...reach(target, down)].filter((id) => above.has(id)));
  body.add(target);
  body.add(source);
  return body;
}

/**
 * What loop routing derives from the structure alone (which steps and transitions there are and
 * how they are linked, not where they are), kept per grafcet: it stays the same while elements are
 * dragged. Compared by content, since grafcets outside the store may be changed in place.
 */
interface Structure {
  steps: Id[];
  transitions: { id: Id; from: Id[]; to: Id[]; jump: boolean }[];
  seq: Map<Id, Id> | null;
  /** The upward links (keys) the bodies were found for: they decide which links go down. */
  upward: string;
  /** Loop bodies by `target>source`. */
  bodies: Map<string, Set<Id>>;
}

const structures = new Map<Id, Structure>();
const MAX_STRUCTURES = 256;

const sameIds = (a: readonly Id[], b: readonly Id[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

function structureOf(g: Grafcet): Structure {
  const steps = Object.keys(g.steps);
  const transitions = Object.values(g.transitions);
  const known = structures.get(g.id);
  if (
    known &&
    sameIds(known.steps, steps) &&
    known.transitions.length === transitions.length &&
    transitions.every((t, i) => {
      const k = known.transitions[i]!;
      return (
        k.id === t.id &&
        k.jump === (t.jump === true) &&
        sameIds(k.from, t.from) &&
        sameIds(k.to, t.to)
      );
    })
  )
    return known;
  const s: Structure = {
    steps,
    transitions: transitions.map((t) => ({
      id: t.id,
      from: [...t.from],
      to: [...t.to],
      jump: t.jump === true,
    })),
    seq: null,
    upward: '',
    bodies: new Map(),
  };
  // Grafcets of projects closed meanwhile are not tracked: start over past a bound instead.
  if (structures.size >= MAX_STRUCTURES) structures.clear();
  structures.set(g.id, s);
  return s;
}

/** The body of each loop (see loopBody), found again only when other links go up. */
function bodyOf(
  s: Structure,
  upward: readonly PendingUpward[],
  down: Map<Id, Id[]>,
  up: Map<Id, Id[]>,
): (p: PendingUpward) => Set<Id> {
  const key = upward
    .map((p) => p.link.key)
    .sort()
    .join(' ');
  if (s.upward !== key) {
    s.upward = key;
    s.bodies = new Map();
  }
  return (p) => {
    const k = `${p.target}>${p.source}`;
    let body = s.bodies.get(k);
    if (!body) s.bodies.set(k, (body = loopBody(down, up, p.target, p.source)));
    return body;
  };
}

/** Leftmost x of the elements of a loop's body (step labels and transition numbers included). */
function bodyLeft(g: Grafcet, body: ReadonlySet<Id>): number {
  let min = Infinity;
  for (const id of body) {
    const s = g.steps[id];
    if (s) {
      const label = s.label ? textWidth(s.label, LABEL_FONT_SIZE) + 8 : 0;
      min = Math.min(min, s.position.x - STEP_HALF - label);
    }
    const t = g.transitions[id];
    if (t) min = Math.min(min, transitionBox(t).x);
  }
  return min;
}

/** The area covered by a polyline segment. */
function segmentBox(a: Point, b: Point): Box {
  return {
    x1: Math.min(a.x, b.x),
    x2: Math.max(a.x, b.x),
    y1: Math.min(a.y, b.y),
    y2: Math.max(a.y, b.y),
  };
}

/**
 * Everything a loop's bottom line could run into, by sequence: steps with their labels and
 * actions, transitions with their number and receptivity, and the wires drawn so far.
 */
function obstaclesBySequence(
  g: Grafcet,
  index: GrafcetIndex,
  seq: Map<Id, Id>,
  wires: { transitionId: Id; points: readonly Point[] }[],
): Map<Id, Box[]> {
  const out = new Map<Id, Box[]>();
  const add = (id: Id, b: Box) => {
    const root = seq.get(id);
    if (root === undefined) return;
    const list = out.get(root);
    if (list) list.push(b);
    else out.set(root, [b]);
  };
  for (const s of Object.values(g.steps)) {
    const { x, y } = s.position;
    const label = s.label ? textWidth(s.label, LABEL_FONT_SIZE) + 8 : 0;
    add(s.id, {
      x1: x - STEP_HALF - label,
      x2: x + STEP_HALF,
      y1: y - STEP_HALF,
      y2: y + STEP_HALF,
    });
    for (const box of layoutActions(s, index.actions.get(s.id) ?? [])) {
      // Arrows and flags of stored actions stand out above and below the box.
      add(s.id, {
        x1: box.x,
        x2: box.x + box.width,
        y1: box.y - ACTION_MARK_RISE,
        y2: box.y + box.height + ACTION_MARK_RISE,
      });
    }
  }
  for (const t of Object.values(g.transitions)) {
    const r = transitionBox(t);
    add(t.id, { x1: r.x, x2: r.x + r.width, y1: r.y, y2: r.y + r.height });
  }
  for (const w of wires)
    for (let i = 1; i < w.points.length; i++)
      add(w.transitionId, segmentBox(w.points[i - 1]!, w.points[i]!));
  return out;
}

/**
 * Where a loop's bottom line runs: the first y from `yStart` down at which a line from x0 left to
 * its lane at `laneX` crosses nothing of its sequence. A loop from a branch on the right thus
 * passes below the elements and wires on its way instead of through them.
 */
function freeDropY(boxes: readonly Box[], x0: number, yStart: number, laneX: number): number {
  const left = boxes
    .filter((b) => b.x1 < x0 - 1 && b.x2 >= laneX - CLEARANCE)
    .sort((a, b) => a.y1 - b.y1);
  let y = yStart;
  for (const b of left) {
    if (b.y1 - CLEARANCE > y) break;
    if (b.y2 + CLEARANCE >= y) y = snapUp(b.y2 + LOOP_DROP);
  }
  return y;
}

/** The links that go down (successors and predecessors), for the bodies of loops. */
export interface DownLinks {
  down: Map<Id, Id[]>;
  up: Map<Id, Id[]>;
}

export function addDownLink(d: DownLinks, from: Id, to: Id): void {
  const next = d.down.get(from);
  if (next) next.push(to);
  else d.down.set(from, [to]);
  const prev = d.up.get(to);
  if (prev) prev.push(from);
  else d.up.set(to, [from]);
}

function upwardPoints(p: PendingUpward, sideX: number): Point[] {
  const pts: Point[] = [p.start];
  pts.push({ x: p.start.x, y: p.dropY });
  pts.push({ x: sideX, y: p.dropY });
  pts.push({ x: sideX, y: p.junctionY });
  pts.push({ x: p.end.x, y: p.junctionY });
  pts.push(p.end);
  return pts;
}

/** The areas of the loop's sequence in `map` (an empty list kept there when first asked for). */
function listOf(map: Map<Id, Box[]>, seq: Map<Id, Id>, p: PendingUpward): Box[] {
  const root = seq.get(p.owner);
  if (root === undefined) return [];
  let list = map.get(root);
  if (!list) map.set(root, (list = []));
  return list;
}

/**
 * 1. Bottom lines, sources from left to right: each drops below its source until its line to its
 * lane (just left of the loop's body) crosses nothing of its own sequence (wires, elements, the
 * bottom lines of loops further left), or stays where it was dragged.
 */
function placeBottomLines(
  g: Grafcet,
  upward: readonly PendingUpward[],
  seq: Map<Id, Id>,
  obstacles: Map<Id, Box[]>,
  body: (p: PendingUpward) => Set<Id>,
): void {
  const loopLines = new Map<Id, Box[]>();
  for (const p of [...upward].sort((a, b) => a.start.x - b.start.x || b.start.y - a.start.y)) {
    p.laneX = p.override ?? snap(bodyLeft(g, body(p)) - LOOP_MARGIN);
    const lines = listOf(loopLines, seq, p);
    p.dropY =
      p.dropOverride !== undefined
        ? Math.max(p.dropOverride, p.start.y + OR_LINE_OFFSET)
        : freeDropY([...listOf(obstacles, seq, p), ...lines], p.start.x, p.dropY, p.laneX);
    lines.push(segmentBox(p.start, { x: p.start.x, y: p.dropY }));
    lines.push({ x1: p.laneX, x2: p.start.x, y1: p.dropY, y2: p.dropY });
  }
}

/**
 * 2. Side lanes, higher bottom lines first (inside) and lower ones outside, so nested loops do
 * not cross. A lane moves left from beside its body past whatever is in its way: an element or
 * a wire of its sequence, another loop's lane or the lines into it. Loops to one target share
 * the leftmost of their lanes.
 */
function placeLanes(upward: PendingUpward[], seq: Map<Id, Id>, obstacles: Map<Id, Box[]>): void {
  upward.sort((a, b) => a.dropY - b.dropY || a.dropY - a.junctionY - (b.dropY - b.junctionY));
  const lanes: {
    root: Id | undefined;
    target: Id;
    x: number;
    yMin: number;
    yMax: number;
    sourceX: number;
    endX: number;
  }[] = [];
  for (const p of upward) {
    const root = seq.get(p.owner);
    const yMin = p.junctionY;
    const yMax = p.dropY;
    let x = p.laneX;
    if (p.override === undefined) {
      const boxes = listOf(obstacles, seq, p);
      const near = lanes.filter((l) => l.root === root && l.yMin <= yMax && yMin <= l.yMax);
      // A line of another loop at height y from x1 to x2, crossed by this lane at `at`.
      const crosses = (at: number, x1: number, x2: number, y: number) =>
        y >= yMin &&
        y <= yMax &&
        at > Math.min(x1, x2) - CLEARANCE &&
        at < Math.max(x1, x2) + CLEARANCE;
      for (let moved = true; moved;) {
        let next = x;
        for (const l of near) {
          if (l.target === p.target) next = Math.min(next, l.x);
          else if (
            Math.abs(l.x - next) < LOOP_LANE ||
            crosses(next, l.x, l.sourceX, l.yMax) ||
            crosses(next, l.x, l.endX, l.yMin)
          )
            next = Math.min(next, l.x - LOOP_LANE);
        }
        for (const b of boxes)
          if (b.x1 - CLEARANCE <= next && next <= b.x2 + CLEARANCE && b.y1 <= yMax && yMin <= b.y2)
            next = Math.min(next, snap(b.x1 - LOOP_MARGIN));
        moved = next !== x;
        x = next;
      }
    }
    lanes.push({ root, target: p.target, x, yMin, yMax, sourceX: p.start.x, endX: p.end.x });
    p.link.points = upwardPoints(p, x);
    p.link.loop = { sideX: x };
    p.link.arrow = { x, y: (p.dropY + p.junctionY) / 2 };
  }
}

/** 3. Loops to one target sharing a lane draw one line: one arrow, on the longest of them. */
function shareArrows(upward: readonly PendingUpward[]): void {
  const shared = new Map<string, PendingUpward>();
  for (const p of upward) {
    const key = `${p.target}:${p.link.loop!.sideX}`;
    const kept = shared.get(key);
    if (!kept) shared.set(key, p);
    else if (p.dropY > kept.dropY) {
      delete kept.link.arrow;
      shared.set(key, p);
    } else delete p.link.arrow;
  }
}

/**
 * Routes the upward links (loops) once every other wire is drawn: each drops below its source (far
 * enough not to cross its own sequence), runs up a side lane left of that sequence and enters its
 * target from above, with an arrow on the upward segment.
 */
export function routeLoops(
  g: Grafcet,
  index: GrafcetIndex,
  upward: PendingUpward[],
  drawn: { links: readonly LinkGeom[]; bars: readonly BarGeom[]; stubs: readonly StubGeom[] },
  downLinks: DownLinks,
): void {
  if (!upward.length) return;
  const structure = structureOf(g);
  const seq = (structure.seq ??= sequences(g));
  const obstacles = obstaclesBySequence(g, index, seq, [
    ...drawn.links.filter((l) => l.points.length),
    ...drawn.bars.map((b) => ({
      transitionId: b.transitionId,
      points: [{ x: b.x1, y: b.y }, { x: b.x2, y: b.y }, ...b.stem],
    })),
    ...drawn.stubs,
  ]);
  const body = bodyOf(structure, upward, downLinks.down, downLinks.up);
  placeBottomLines(g, upward, seq, obstacles, body);
  placeLanes(upward, seq, obstacles);
  shareArrows(upward);
}
