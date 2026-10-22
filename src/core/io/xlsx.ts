/**
 * Minimal Office Open XML spreadsheet (.xlsx) writer and reader, enough to exchange tables with
 * Excel, LibreOffice and PLC tools. Pure TypeScript (zip via fflate): runs in workers and tests.
 * Reading supports shared strings, inline strings, numbers and booleans of the first sheet.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export type Cell = string | number | boolean | null;

export interface SheetOptions {
  name: string;
  /** Column widths in characters. */
  widths?: number[];
  /** Drop-down lists for whole columns (rows 2…n). */
  lists?: { column: number; values: string[] }[];
}

/** XML-escapes text and drops control characters XML 1.0 cannot carry. */
function esc(s: string): string {
  const printable = Array.from(s)
    .filter((c) => {
      const n = c.charCodeAt(0);
      return n >= 32 || n === 9 || n === 10 || n === 13;
    })
    .join('');
  return printable.replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!,
  );
}

/** A1-style column letters for a zero-based index. */
export function columnName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** One-sheet workbook; the first row is a bold, frozen header with an auto-filter. */
export function writeXlsx(rows: Cell[][], opts: SheetOptions): Uint8Array {
  const width = Math.max(1, ...rows.map((r) => r.length));
  const last = `${columnName(width - 1)}${Math.max(1, rows.length)}`;
  const cell = (v: Cell, r: number, c: number) => {
    const ref = `${columnName(c)}${r + 1}`;
    const style = r === 0 ? ' s="1"' : '';
    if (v === null || v === '') return '';
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
    if (typeof v === 'boolean') return `<c r="${ref}"${style} t="b"><v>${v ? 1 : 0}</v></c>`;
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
  };
  const sheetData = rows
    .map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, i, c)).join('')}</row>`)
    .join('');
  const cols = opts.widths?.length
    ? `<cols>${opts.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const lists = opts.lists?.length
    ? `<dataValidations count="${opts.lists.length}">${opts.lists
        .map(
          (l) =>
            `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${columnName(l.column)}2:${columnName(l.column)}1048576"><formula1>"${esc(l.values.join(','))}"</formula1></dataValidation>`,
        )
        .join('')}</dataValidations>`
    : '';
  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `${cols}<sheetData>${sheetData}</sheetData><autoFilter ref="A1:${last}"/>${lists}</worksheet>`;
  const files: Record<string, string> = {
    '[Content_Types].xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets><sheet name="${esc(opts.name.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>` +
      `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${esc(opts.name.slice(0, 31))}'!$A$1:$${columnName(width - 1)}$${Math.max(1, rows.length)}</definedName></definedNames></workbook>`,
    'xl/_rels/workbook.xml.rels':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
      `</styleSheet>`,
    'xl/worksheets/sheet1.xml': sheet,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), {
    level: 6,
  });
}

export class XlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XlsxError';
  }
}

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) => {
    if (e[0] === '#')
      return String.fromCodePoint(
        e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10),
      );
    return ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[e]!;
  });
}

/** Concatenated text of all <t> elements inside a fragment (rich-text runs included). */
function texts(fragment: string): string {
  let out = '';
  for (const m of fragment.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g))
    out += decode(m[1]!);
  return out;
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** Reads the first worksheet as rows of strings (empty cells as ''). */
export function readXlsx(bytes: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new XlsxError('not a zip archive');
  }
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : null);
  const workbook = read('xl/workbook.xml');
  if (!workbook) throw new XlsxError('no workbook');
  const firstSheet = /<(?:\w+:)?sheet\s[^>]*>/.exec(workbook)?.[0];
  const rid = firstSheet && (attr(firstSheet, 'r:id') ?? attr(firstSheet, 'id'));
  const rels = read('xl/_rels/workbook.xml.rels') ?? '';
  let target = 'worksheets/sheet1.xml';
  for (const m of rels.matchAll(/<(?:\w+:)?Relationship\s[^>]*>/g)) {
    if (attr(m[0], 'Id') === rid) target = attr(m[0], 'Target') ?? target;
  }
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheet = read(path);
  if (!sheet) throw new XlsxError('no worksheet');
  const shared: string[] = [];
  const sst = read('xl/sharedStrings.xml');
  if (sst)
    for (const m of sst.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g))
      shared.push(texts(m[1]!));

  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<(?:\w+:)?row(\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const rowNo = Number(attr(rm[1] ?? '', 'r') ?? rows.length + 1);
    const row: string[] = [];
    let next = 0;
    for (const cm of rm[2]!.matchAll(/<(?:\w+:)?c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const head = cm[1] ?? '';
      const body = cm[2] ?? '';
      const ref = attr(head, 'r');
      const col = ref ? columnIndex(ref) : next;
      next = col + 1;
      const type = attr(head, 't');
      const v = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = texts(body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (v !== undefined) value = decode(v);
      row[col] = value;
    }
    rows[rowNo - 1] = Array.from(row, (x) => x ?? '');
  }
  const filled = Array.from(rows, (r) => r ?? []).filter((r) => r.some((c) => c.trim() !== ''));
  // Trailing empty cells are not stored: pad every row to the widest one.
  const width = Math.max(0, ...filled.map((r) => r.length));
  return filled.map((r) => [...r, ...Array<string>(width - r.length).fill('')]);
}
