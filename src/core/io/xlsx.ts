/**
 * Minimal Office Open XML spreadsheet (.xlsx) writer and reader, enough to exchange tables with
 * Excel, LibreOffice and PLC tools. Pure TypeScript (zip via fflate): runs in workers and tests.
 * Reading supports shared strings, inline strings, numbers and booleans of the first sheet.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { xmlChars } from './xml';

export type Cell = string | number | boolean | null;

export interface SheetOptions {
  name: string;
  /** Column widths in characters. */
  widths?: number[];
  /** Drop-down lists for whole columns (rows 2…n). */
  lists?: { column: number; values: string[] }[];
}

/** XML-escapes text and drops characters XML 1.0 cannot carry. */
function esc(s: string): string {
  return xmlChars(s).replace(
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

/**
 * The elements `<name …>…</name>` and `<name …/>` (any namespace prefix) of `xml` in order, as
 * attributes and content. Linear in the length of `xml`: a lazy regex would rescan the rest of
 * the text for every element that is never closed.
 */
function* elements(
  xml: string,
  name: string,
): Generator<{ attrs: string; body: string }, undefined> {
  const open = new RegExp(`<(\\w+:)?${name}(?=[\\s/>])`, 'y');
  for (let at = xml.indexOf('<'); at >= 0;) {
    open.lastIndex = at;
    const m = open.exec(xml);
    if (!m) {
      at = xml.indexOf('<', at + 1);
      continue;
    }
    const gt = xml.indexOf('>', open.lastIndex);
    if (gt < 0) return;
    const attrs = xml.slice(open.lastIndex, gt);
    if (attrs.endsWith('/')) {
      yield { attrs: attrs.slice(0, -1), body: '' };
      at = xml.indexOf('<', gt + 1);
      continue;
    }
    const close = `</${m[1] ?? ''}${name}>`;
    const end = xml.indexOf(close, gt + 1);
    if (end < 0) return;
    yield { attrs, body: xml.slice(gt + 1, end) };
    at = xml.indexOf('<', end + close.length);
  }
}

/** Concatenated text of all <t> elements inside a fragment (rich-text runs included). */
function texts(fragment: string): string {
  let out = '';
  for (const t of elements(fragment, 't')) out += decode(t.body);
  return out;
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** The parts read from a workbook, and how much they may hold once unpacked (a zip of 1 MB can). */
const XLSX_PART = /^xl\/(?:_rels\/workbook\.xml\.rels|.+\.xml)$/;
const MAX_UNPACKED = 32 * 1024 * 1024;
/** The largest sheet Excel writes, and how many cells a read may produce. */
const MAX_ROWS = 1_048_576;
const MAX_COLUMNS = 16_384;
const MAX_CELLS = 10_000_000;

/** Reads the first worksheet as rows of strings (empty cells as ''). */
export function readXlsx(bytes: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  let unpacked = 0;
  try {
    files = unzipSync(bytes, {
      // Only XML parts are unpacked (into buffers of their declared size, which bounds memory).
      filter: (f) => XLSX_PART.test(f.name) && (unpacked += f.originalSize) <= MAX_UNPACKED,
    });
  } catch {
    throw new XlsxError('not a zip archive');
  }
  if (unpacked > MAX_UNPACKED) throw new XlsxError('too large');
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : null);
  const workbook = read('xl/workbook.xml');
  if (!workbook) throw new XlsxError('no workbook');
  const firstSheet = elements(workbook, 'sheet').next().value?.attrs;
  const rid = firstSheet && (attr(firstSheet, 'r:id') ?? attr(firstSheet, 'id'));
  const rels = read('xl/_rels/workbook.xml.rels') ?? '';
  let target = 'worksheets/sheet1.xml';
  for (const rel of elements(rels, 'Relationship')) {
    if (attr(rel.attrs, 'Id') === rid) target = attr(rel.attrs, 'Target') ?? target;
  }
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheet = read(path);
  if (!sheet) throw new XlsxError('no worksheet');
  const shared: string[] = [];
  const sst = read('xl/sharedStrings.xml');
  if (sst) for (const si of elements(sst, 'si')) shared.push(texts(si.body));

  const rows: string[][] = [];
  let cells = 0;
  for (const rm of elements(sheet, 'row')) {
    const rowNo = Number(attr(rm.attrs, 'r') ?? rows.length + 1);
    if (!Number.isInteger(rowNo) || rowNo < 1 || rowNo > MAX_ROWS)
      throw new XlsxError('bad row number');
    const row: string[] = [];
    let next = 0;
    for (const cm of elements(rm.body, 'c')) {
      const ref = attr(cm.attrs, 'r');
      const col = ref ? columnIndex(ref) : next;
      if (col >= MAX_COLUMNS) throw new XlsxError('bad cell reference');
      next = col + 1;
      const type = attr(cm.attrs, 't');
      const v = elements(cm.body, 'v').next().value?.body;
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = texts(cm.body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (v !== undefined) value = decode(v);
      row[col] = value;
    }
    cells += row.length;
    if (cells > MAX_CELLS) throw new XlsxError('too large');
    rows[rowNo - 1] = Array.from(row, (x) => x ?? '');
  }
  const filled = Array.from(rows, (r) => r ?? []).filter((r) => r.some((c) => c.trim() !== ''));
  // Trailing empty cells are not stored: pad every row to the widest one.
  const width = filled.reduce((w, r) => Math.max(w, r.length), 0);
  if (filled.length * width > MAX_CELLS) throw new XlsxError('too large');
  return filled.map((r) => [...r, ...Array<string>(width - r.length).fill('')]);
}
