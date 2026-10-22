import type { Variable, VariableDirection, VariableType } from '@/core/model/types';

export type DirectionFilter = 'all' | VariableDirection;
export type TypeFilter = 'all' | VariableType;
export type SortKey = 'name' | 'type' | 'direction' | 'address' | 'uses';

export interface VariableQuery {
  text: string;
  direction: DirectionFilter;
  type: TypeFilter;
  sort: SortKey;
  descending: boolean;
}

export const DEFAULT_QUERY: VariableQuery = {
  text: '',
  direction: 'all',
  type: 'all',
  sort: 'name',
  descending: false,
};

export const DIRECTIONS: VariableDirection[] = ['input', 'output', 'internal'];
export const TYPES: VariableType[] = ['BOOL', 'INT', 'REAL', 'TIME'];
const DIRECTION_ORDER: Record<VariableDirection, number> = { input: 0, output: 1, internal: 2 };

/** Natural order: "In2" before "In10". */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function matches(v: Variable, text: string): boolean {
  if (!text) return true;
  const t = text.toLowerCase();
  return (
    v.name.toLowerCase().includes(t) ||
    (v.address ?? '').toLowerCase().includes(t) ||
    (v.comment ?? '').toLowerCase().includes(t)
  );
}

/** Filters and sorts variables; ties keep inputs, outputs, internals together. */
export function queryVariables(
  vars: Variable[],
  usage: Map<string, number>,
  q: VariableQuery,
): Variable[] {
  const text = q.text.trim();
  const list = vars.filter(
    (v) =>
      (q.direction === 'all' || v.direction === q.direction) &&
      (q.type === 'all' || v.type === q.type) &&
      matches(v, text),
  );
  const uses = (v: Variable) => usage.get(v.name.toLowerCase()) ?? 0;
  const cmp: Record<SortKey, (a: Variable, b: Variable) => number> = {
    name: (a, b) => collator.compare(a.name, b.name),
    type: (a, b) => a.type.localeCompare(b.type) || collator.compare(a.name, b.name),
    direction: (a, b) =>
      DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction] ||
      collator.compare(a.name, b.name),
    address: (a, b) =>
      collator.compare(a.address ?? '\uffff', b.address ?? '\uffff') ||
      collator.compare(a.name, b.name),
    uses: (a, b) => uses(a) - uses(b) || collator.compare(a.name, b.name),
  };
  const sorted = [...list].sort(cmp[q.sort]);
  return q.descending ? sorted.reverse() : sorted;
}

export function countByDirection(vars: Variable[]): Record<DirectionFilter, number> {
  const c: Record<DirectionFilter, number> = { all: vars.length, input: 0, output: 0, internal: 0 };
  for (const v of vars) c[v.direction]++;
  return c;
}
