/**
 * On-demand auto-layout.
 *
 * 1. Back-edges (loops) are found by a depth-first search from the initial steps (then from any
 *    node without predecessors, then from the topmost remaining node) and ignored.
 * 2. Rows: longest path from the roots, so a convergence is always below all of its branches.
 *    Steps and transitions alternate rows ROW apart (step pitch = 2 ROW).
 * 3. Columns: a structured walk. A sequence stays in its column; at a divergence each branch is
 *    laid out as a block up to the merge point (the nearest node reachable from all branches),
 *    blocks are placed side by side and centered under the divergence, and the merge node
 *    continues in the divergence's column. Without a merge point (e.g. "continue or loop back"),
 *    the longest branch stays in the column and the others go to its right.
 * Loop links are then routed automatically along the left side (routing overrides are cleared).
 */
import { indexGrafcet } from '../model/graph';
import type { Grafcet, Id, Point } from '../model/types';
import {
  ACTION_GAP,
  GRID,
  LABEL_FONT_SIZE,
  ROW,
  STEP_HALF,
  TRANSITION_WIDTH,
  expressionWidth,
  layoutActions,
  snap,
  textWidth,
} from './geometry';

const BRANCH_GAP = 40;
const ROOT_GAP = 80;

interface Block {
  items: { id: Id; dx: number }[];
  /** Extents relative to the block's axis. */
  left: number;
  right: number;
}

export function autoLayout(g: Grafcet, only?: ReadonlySet<Id>): Map<Id, Point> {
  const index = indexGrafcet(g);
  const inScope = (id: Id) => !only || only.has(id);
  const steps = Object.values(g.steps).filter((s) => inScope(s.id));
  const transitions = Object.values(g.transitions).filter((t) => inScope(t.id));
  const ids = [...steps.map((s) => s.id), ...transitions.map((t) => t.id)];
  if (!ids.length) return new Map();

  const pos = (id: Id): Point => (g.steps[id] ?? g.transitions[id])!.position;
  const byX = (a: Id, b: Id) => pos(a).x - pos(b).x || pos(a).y - pos(b).y;

  // Raw successor lists, left to right.
  const rawSucc = new Map<Id, Id[]>();
  for (const s of steps)
    rawSucc.set(s.id, (index.outgoing.get(s.id) ?? []).map((t) => t.id).filter(inScope));
  for (const t of transitions) rawSucc.set(t.id, t.to.filter(inScope).sort(byX));
  const rawPredCount = new Map<Id, number>(ids.map((id) => [id, 0]));
  for (const list of rawSucc.values())
    for (const n of list) rawPredCount.set(n, (rawPredCount.get(n) ?? 0) + 1);

  // Roots: initial steps, then nodes nobody leads to, then whatever is left (topmost first).
  const topFirst = (a: Id, b: Id) => pos(a).y - pos(b).y || pos(a).x - pos(b).x;
  const initial = steps
    .filter((s) => s.kind === 'initial')
    .map((s) => s.id)
    .sort(byX);
  const orphans = ids.filter((id) => rawPredCount.get(id) === 0).sort(topFirst);
  const rootCandidates = [...initial, ...orphans, ...[...ids].sort(topFirst)];

  // Depth-first search classifying back-edges (edges into a node on the current path).
  const back = new Set<string>();
  const state = new Map<Id, 1 | 2>();
  const roots: Id[] = [];
  for (const root of rootCandidates) {
    if (state.has(root)) continue;
    roots.push(root);
    const stack: { id: Id; i: number }[] = [{ id: root, i: 0 }];
    state.set(root, 1);
    while (stack.length) {
      const top = stack[stack.length - 1]!;
      const succ = rawSucc.get(top.id) ?? [];
      if (top.i >= succ.length) {
        state.set(top.id, 2);
        stack.pop();
        continue;
      }
      const n = succ[top.i++]!;
      const st = state.get(n);
      if (st === 1) back.add(`${top.id}>${n}`);
      else if (st === undefined) {
        state.set(n, 1);
        stack.push({ id: n, i: 0 });
      }
    }
  }

  const succ = new Map<Id, Id[]>();
  const pred = new Map<Id, Id[]>(ids.map((id) => [id, []]));
  for (const [a, list] of rawSucc) {
    const kept = list.filter((b) => !back.has(`${a}>${b}`));
    succ.set(a, kept);
    for (const b of kept) pred.get(b)!.push(a);
  }

  // Longest-path rows (Kahn's algorithm on the acyclic remainder).
  const rank = new Map<Id, number>(ids.map((id) => [id, 0]));
  const indeg = new Map<Id, number>(ids.map((id) => [id, pred.get(id)!.length]));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  while (queue.length) {
    const a = queue.shift()!;
    for (const b of succ.get(a) ?? []) {
      rank.set(b, Math.max(rank.get(b)!, rank.get(a)! + 1));
      indeg.set(b, indeg.get(b)! - 1);
      if (indeg.get(b) === 0) queue.push(b);
    }
  }

  // Horizontal extents of each node, including labels, actions and receptivity text.
  const extent = (id: Id): { left: number; right: number } => {
    const s = g.steps[id];
    if (s) {
      const boxes = layoutActions(s, index.actions.get(id) ?? []);
      const actions = boxes.reduce((w, b) => w + b.width, 0);
      return {
        left: STEP_HALF + (s.label ? textWidth(s.label, LABEL_FONT_SIZE) + 8 : 0),
        right: STEP_HALF + (actions ? ACTION_GAP + actions : 0),
      };
    }
    const t = g.transitions[id]!;
    return {
      left: TRANSITION_WIDTH / 2 + (t.number !== undefined ? textWidth(`(${t.number})`) + 6 : 0),
      right: TRANSITION_WIDTH / 2 + 8 + Math.max(GRID, expressionWidth(t.receptivity)),
    };
  };

  const reachable = (start: Id): Set<Id> => {
    const seen = new Set<Id>();
    const stack = [start];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const m of succ.get(n) ?? []) stack.push(m);
    }
    return seen;
  };

  const mergePoint = (branches: Id[]): Id | null => {
    const sets = branches.map(reachable);
    let best: Id | null = null;
    for (const n of sets[0]!) {
      if (!sets.every((s) => s.has(n))) continue;
      if (best === null || rank.get(n)! < rank.get(best)!) best = n;
    }
    return best;
  };

  const placed = new Set<Id>();
  const addItem = (b: Block, id: Id, dx: number, e = extent(id)) => {
    b.items.push({ id, dx });
    b.left = Math.max(b.left, e.left - dx);
    b.right = Math.max(b.right, dx + e.right);
  };

  const walk = (start: Id, stop: Id | null): Block => {
    const block: Block = { items: [], left: 0, right: 0 };
    let cur: Id | null = start;
    let entering = true;
    while (cur !== null && cur !== stop && !placed.has(cur)) {
      // A convergence reached from inside a branch is placed by the enclosing divergence.
      if (!entering && pred.get(cur)!.length > 1) break;
      entering = false;
      placed.add(cur);
      addItem(block, cur, 0);
      const next: Id[] = (succ.get(cur) ?? []).filter((n) => !placed.has(n));
      if (next.length === 0) break;
      if (next.length === 1) {
        cur = next[0]!;
        continue;
      }
      const merge = mergePoint(next);
      const blocks = next.map((n) => walk(n, merge));
      const offsets: number[] = [];
      if (merge === null) {
        // Keep the longest branch in this column, the others to its right.
        const main = blocks.reduce(
          (m, b, i) => (b.items.length > blocks[m]!.items.length ? i : m),
          0,
        );
        let cursor = blocks[main]!.right + BRANCH_GAP;
        blocks.forEach((b, i) => {
          if (i === main) offsets[i] = 0;
          else {
            offsets[i] = cursor + b.left;
            cursor = offsets[i]! + b.right + BRANCH_GAP;
          }
        });
      } else {
        let cursor = 0;
        blocks.forEach((b, i) => {
          offsets[i] = cursor + b.left;
          cursor = offsets[i]! + b.right + BRANCH_GAP;
        });
        const shift = -(offsets[0]! + offsets[offsets.length - 1]!) / 2;
        offsets.forEach((o, i) => (offsets[i] = o + shift));
      }
      blocks.forEach((b, i) => {
        for (const it of b.items) addItem(block, it.id, it.dx + offsets[i]!);
      });
      if (merge === null || placed.has(merge)) break;
      cur = merge;
      entering = true;
    }
    return block;
  };

  const blocks: Block[] = [];
  for (const r of roots) if (!placed.has(r)) blocks.push(walk(r, null));
  for (const id of [...ids].sort(topFirst)) if (!placed.has(id)) blocks.push(walk(id, null));

  const originX = Math.min(...ids.map((id) => pos(id).x));
  const originY = Math.min(...ids.map((id) => pos(id).y));
  const out = new Map<Id, Point>();
  let axis = originX;
  blocks.forEach((b, i) => {
    if (i > 0) axis += b.left;
    for (const it of b.items)
      out.set(it.id, { x: snap(axis + it.dx), y: snap(originY + rank.get(it.id)! * ROW) });
    axis += b.right + ROOT_GAP;
  });
  return out;
}
