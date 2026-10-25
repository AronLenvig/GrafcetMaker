/**
 * Variables as CSV (RFC 4180) or Excel: export, and import that adds new variables and updates
 * existing ones by name. The delimiter is detected (comma, semicolon as written by Excel in many locales,
 * or tab), so spreadsheets round-trip.
 */
import { LIMITS } from '../model/constants';
import { newId } from '../model/factory';
import { writeXlsx } from './xlsx';
import type { Project, Variable, VariableDirection, VariableType } from '../model/types';
import { formatInitialValue, parseInitialValue, validateVariableName } from '../model/variables';

export const VARIABLE_COLUMNS = [
  'name',
  'type',
  'direction',
  'initial',
  'address',
  'comment',
] as const;

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const count = (c: string) => firstLine.split(c).length - 1;
  const delimiter = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0]!;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export function toCsv(rows: string[][]): string {
  const cell = (s: string) =>
    /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** The variable table as rows (header first), inputs then outputs then internals. */
export function variableRows(p: Pick<Project, 'variables'>): string[][] {
  const order: Record<VariableDirection, number> = { input: 0, output: 1, internal: 2 };
  const vars = Object.values(p.variables).sort(
    (a, b) => order[a.direction] - order[b.direction] || a.name.localeCompare(b.name),
  );
  return [
    [...VARIABLE_COLUMNS],
    ...vars.map((v) => [
      v.name,
      v.type,
      v.direction,
      formatInitialValue(v),
      v.address ?? '',
      v.comment ?? '',
    ]),
  ];
}

/**
 * Spreadsheets run a cell that starts with = + - @ (or a tab or CR) as a formula, and also what
 * follows a semicolon or tab when they split on those. Free text (address, comment) goes out with
 * a `'` before such a start, and a `'` there is doubled, so importing restores it exactly.
 */
export const escapeFormula = (s: string): string => s.replace(/(^|[;\t])(?=[=+\-@\t\r'])/g, "$1'");
export const unescapeFormula = (s: string): string =>
  s.replace(/(^|[;\t])'(?=[=+\-@\t\r'])/g, '$1');

const TEXT_COLUMNS = [VARIABLE_COLUMNS.indexOf('address'), VARIABLE_COLUMNS.indexOf('comment')];

export function variablesToCsv(p: Pick<Project, 'variables'>): string {
  const [header, ...rows] = variableRows(p);
  return toCsv([
    header!,
    ...rows.map((r) => r.map((s, i) => (TEXT_COLUMNS.includes(i) ? escapeFormula(s) : s))),
  ]);
}

/** The variable table as an Excel workbook, with drop-down lists for type and direction. */
export function variablesToXlsx(p: Pick<Project, 'variables'>): Uint8Array {
  return writeXlsx(variableRows(p), {
    name: 'Variables',
    widths: [24, 9, 11, 12, 14, 48],
    lists: [
      { column: 1, values: ['BOOL', 'INT', 'REAL', 'TIME'] },
      { column: 2, values: ['input', 'output', 'internal'] },
    ],
  });
}

/** Looked up with `aliasOf`: a cell like `constructor` must not find an inherited property. */
const aliasOf = <T>(table: Record<string, T>, key: string): T | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;

const TYPE_ALIASES: Record<string, VariableType> = {
  bool: 'BOOL',
  boolean: 'BOOL',
  int: 'INT',
  dint: 'INT',
  sint: 'INT',
  lint: 'INT',
  real: 'REAL',
  lreal: 'REAL',
  time: 'TIME',
};

const DIRECTION_ALIASES: Record<string, VariableDirection> = {
  input: 'input',
  in: 'input',
  i: 'input',
  output: 'output',
  out: 'output',
  q: 'output',
  internal: 'internal',
  local: 'internal',
  memory: 'internal',
  m: 'internal',
};

export type CsvErrorCode =
  | 'noHeader'
  | 'missingName'
  | 'invalidName'
  | 'badType'
  | 'badDirection'
  | 'badInitial'
  | 'duplicateInFile';

export interface CsvImportPlan {
  added: Variable[];
  updated: Variable[];
  unchanged: number;
  errors: { row: number; code: CsvErrorCode; value: string }[];
}

/** Validates a CSV file against the project; nothing is changed until the plan is applied. */
export function planVariableImport(p: Project, text: string): CsvImportPlan {
  return planVariableImportRows(p, parseCsv(text));
}

/** Validates rows (header first, from CSV or a spreadsheet) against the project. */
export function planVariableImportRows(p: Project, rows: string[][]): CsvImportPlan {
  const plan: CsvImportPlan = { added: [], updated: [], unchanged: 0, errors: [] };
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col('name') < 0 || col('type') < 0) {
    plan.errors.push({ row: 1, code: 'noHeader', value: header.join(', ') });
    return plan;
  }
  const byName = new Map(Object.values(p.variables).map((v) => [v.name.toLowerCase(), v]));
  const seen = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const rowNo = i + 2;
    const get = (name: string) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');
    const name = get('name');
    if (!name) return plan.errors.push({ row: rowNo, code: 'missingName', value: '' });
    const lower = name.toLowerCase();
    if (seen.has(lower))
      return plan.errors.push({ row: rowNo, code: 'duplicateInFile', value: name });
    seen.add(lower);
    const existing = byName.get(lower);
    if (validateVariableName(p, name, existing?.id))
      return plan.errors.push({ row: rowNo, code: 'invalidName', value: name });
    const type = aliasOf(TYPE_ALIASES, get('type').toLowerCase());
    if (!type) return plan.errors.push({ row: rowNo, code: 'badType', value: get('type') });
    const dirText = get('direction').toLowerCase();
    const direction = dirText
      ? aliasOf(DIRECTION_ALIASES, dirText)
      : (existing?.direction ?? 'internal');
    if (!direction)
      return plan.errors.push({ row: rowNo, code: 'badDirection', value: get('direction') });
    const init = parseInitialValue(type, get('initial'));
    if ('error' in init)
      return plan.errors.push({ row: rowNo, code: 'badInitial', value: get('initial') });
    const v: Variable = { id: existing?.id ?? newId(), name, type, direction };
    if (init.value !== undefined) v.initialValue = init.value;
    // Cut to what a project file may hold, so the project still loads after a reload.
    const address = unescapeFormula(get('address')).slice(0, LIMITS.shortText);
    const comment = unescapeFormula(get('comment')).slice(0, LIMITS.longText);
    if (address) v.address = address;
    if (comment) v.comment = comment;
    if (!existing) plan.added.push(v);
    else if (JSON.stringify({ ...existing }) !== JSON.stringify(v)) plan.updated.push(v);
    else plan.unchanged++;
    return undefined;
  });
  return plan;
}

/** Applies a plan to a project draft (one undoable step). Renames are not done by import. */
export function applyVariableImport(draft: Project, plan: CsvImportPlan): void {
  for (const v of [...plan.added, ...plan.updated]) draft.variables[v.id] = v;
}
