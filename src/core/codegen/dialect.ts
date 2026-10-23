/**
 * Vendor flavours of the generated Structured Text. The generators build an `StModule` (header,
 * declarations, body in IEC 61131-3) and use the dialect's hooks for the few constructs that differ
 * between PLC tools (durations, timers, edges, BOOL in arithmetic); `renderModule` writes the file
 * the vendor tool imports:
 *
 * - iec: a FUNCTION_BLOCK in plain IEC 61131-3 (CODESYS and most tools), `.st`.
 * - siemens: a TIA Portal SCL source for S7-1200/1500 (External source files → Generate blocks
 *   from source): `FUNCTION_BLOCK "name"` with optimized access, `#` before local names, TON_TIME
 *   and TOF_TIME timers, the header as block comment, `.scl`.
 * - twincat: a TwinCAT 3 POU (`.TcPOU`, Add → Existing Item), declaration and implementation in
 *   their own sections.
 * - rockwell: a Studio 5000 Logix Designer Structured Text routine: no block, the tags to create
 *   listed in the header, TONR/TOFR on FBD_TIMER (PRE in ms), OSRI/OSFI on FBD_ONESHOT, DINT for
 *   INT and TIME, 1/0 for TRUE/FALSE, initial values assigned on the first scan (S:FS), `.st`.
 */
import type { VariableType } from '../model/types';
import { cdata, timeLiteral } from './common';

export type StDialect = 'iec' | 'siemens' | 'twincat' | 'rockwell';

/** Closing sentence of the generators' headers; a Logix routine is not a function block. */
export const CALL_CYCLICALLY = 'Call this function block cyclically.';

export const ST_DIALECTS: StDialect[] = ['iec', 'siemens', 'twincat', 'rockwell'];

export type DeclType = VariableType | 'TON' | 'TOF' | 'R_TRIG' | 'F_TRIG';

/** A declared variable or function block instance of the generated code. */
export interface Decl {
  name: string;
  type: DeclType;
  /** Initial value: BOOL, number, or milliseconds for TIME. */
  init?: boolean | number;
  comment?: string;
}

export interface DeclBlock {
  kind: 'input' | 'output' | 'local';
  /** Shown next to the block keyword (`VAR // GRAFCET state`). */
  title?: string;
  decls: Decl[];
}

/** Generated code before its vendor packaging. */
export interface StModule {
  /** Function block name (a valid identifier). */
  name: string;
  /** Header comment lines, without comment delimiters. */
  header: string[];
  blocks: DeclBlock[];
  /** Body statements in IEC 61131-3 (built with the dialect's hooks). */
  body: string[];
  /** Formatting of the generator: indent of declarations, and `//` or `(* *)` comments. */
  indent: string;
  comments: 'line' | 'block';
}

/** How the constructs that differ between vendors are written in the body. */
export interface DialectHooks {
  time(ms: number): string;
  boolToInt(operand: string): string;
  /** Statements updating a timer instance, and its output. */
  timer(
    inst: string,
    kind: 'TON' | 'TOF',
    input: string,
    ms: number,
  ): { call: string[]; q: string };
  /** Statements updating an edge detector instance, and its output. */
  edge(inst: string, rising: boolean, clk: string): { call: string[]; q: string };
}

const IEC_HOOKS: DialectHooks = {
  time: timeLiteral,
  boolToInt: (x) => `BOOL_TO_INT(${x})`,
  timer: (inst, _kind, input, ms) => ({
    call: [`${inst}(IN := ${input}, PT := ${timeLiteral(ms)});`],
    q: `${inst}.Q`,
  }),
  edge: (inst, _rising, clk) => ({ call: [`${inst}(CLK := ${clk});`], q: `${inst}.Q` }),
};

const ROCKWELL_HOOKS: DialectHooks = {
  time: (ms) => String(Math.round(ms)),
  // Logix converts BOOL operands of arithmetic implicitly.
  boolToInt: (x) => x,
  timer: (inst, kind, input, ms) => ({
    call: [
      `${inst}.PRE := ${Math.round(ms)};`,
      `${inst}.TimerEnable := ${input};`,
      `${kind === 'TON' ? 'TONR' : 'TOFR'}(${inst});`,
    ],
    q: `${inst}.DN`,
  }),
  edge: (inst, rising, clk) => ({
    call: [`${inst}.InputBit := ${clk};`, `${rising ? 'OSRI' : 'OSFI'}(${inst});`],
    q: `${inst}.OutputBit`,
  }),
};

export function dialectHooks(d: StDialect): DialectHooks {
  return d === 'rockwell' ? ROCKWELL_HOOKS : IEC_HOOKS;
}

/** File name extension and media type of a dialect's file. */
export function dialectFile(d: StDialect): { extension: string; mime: string } {
  switch (d) {
    case 'siemens':
      return { extension: 'scl', mime: 'text/plain' };
    case 'twincat':
      return { extension: 'TcPOU', mime: 'application/xml' };
    default:
      return { extension: 'st', mime: 'text/plain' };
  }
}

// ---- Literals and types ------------------------------------------------------------------------

function typeName(t: DeclType, d: StDialect): string {
  if (d === 'siemens') return t === 'TON' ? 'TON_TIME' : t === 'TOF' ? 'TOF_TIME' : t;
  if (d !== 'rockwell') return t;
  switch (t) {
    case 'INT':
    case 'TIME':
      return 'DINT';
    case 'TON':
    case 'TOF':
      return 'FBD_TIMER';
    case 'R_TRIG':
    case 'F_TRIG':
      return 'FBD_ONESHOT';
    default:
      return t;
  }
}

const isBase = (t: DeclType): t is VariableType =>
  t === 'BOOL' || t === 'INT' || t === 'REAL' || t === 'TIME';

/** Value literal of a declaration's type (its default when `init` is undefined). */
function literal(t: VariableType, init: boolean | number | undefined, d: StDialect): string {
  const rockwell = d === 'rockwell';
  switch (t) {
    case 'BOOL': {
      const on = init === true || init === 1;
      return rockwell ? (on ? '1' : '0') : on ? 'TRUE' : 'FALSE';
    }
    case 'TIME':
      return rockwell ? String(Math.round(Number(init ?? 0))) : timeLiteral(Number(init ?? 0));
    case 'REAL': {
      const s = String(Number(init ?? 0));
      return /[.eE]/.test(s) ? s : `${s}.0`;
    }
    default:
      return String(Math.trunc(Number(init ?? 0)));
  }
}

/** Our own symbols in comments, for tools that may not read UTF-8 sources. */
const ASCII: Record<string, string> = {
  '↑': 'RE ',
  '↓': 'FE ',
  '→': '->',
  '–': '-',
  '·': '-',
  '…': '...',
};
const toAscii = (s: string) => s.replace(/[↑↓→–·…]/g, (c) => ASCII[c]!);

// ---- Code scanning -----------------------------------------------------------------------------

const IDENT_START = /[A-Za-z_]/;
const IDENT_PART = /[A-Za-z0-9_]/;

/**
 * Rewrites the identifiers of ST code, leaving comments and literals (`T#5s`, `16#FF`, `1.5E3`)
 * alone. `rewrite` gets the identifier, the previous non-blank character and the rest of the code.
 */
export function mapIdentifiers(
  code: string,
  rewrite: (ident: string, before: string, after: string) => string,
): string {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    if (code.startsWith('//', i)) {
      const end = code.indexOf('\n', i);
      const stop = end < 0 ? n : end;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    if (code.startsWith('(*', i)) {
      const end = code.indexOf('*)', i + 2);
      const stop = end < 0 ? n : end + 2;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    const c = code[i]!;
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.#]/.test(code[j]!)) j++;
      out += code.slice(i, j);
      i = j;
      continue;
    }
    if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < n && IDENT_PART.test(code[j]!)) j++;
      if (code[j] === '#') {
        // A typed literal such as T#1s or DINT#5.
        while (j < n && /[A-Za-z0-9_.#]/.test(code[j]!)) j++;
        out += code.slice(i, j);
      } else {
        const before = out.trimEnd().slice(-1);
        out += rewrite(code.slice(i, j), before, code.slice(j));
      }
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Siemens SCL: `#` before every local name, except formal parameters of calls (`IN := x`). */
function prefixLocals(code: string, locals: Set<string>): string {
  return mapIdentifiers(code, (ident, before, after) => {
    if (!locals.has(ident.toUpperCase()) || before === '.' || before === '#') return ident;
    if ((before === '(' || before === ',') && /^\s*:=/.test(after)) return ident;
    return `#${ident}`;
  });
}

/** Rockwell: 1 and 0 for TRUE and FALSE. */
function logixLiterals(code: string): string {
  return mapIdentifiers(code, (ident) => {
    const u = ident.toUpperCase();
    return u === 'TRUE' ? '1' : u === 'FALSE' ? '0' : ident;
  });
}

// ---- Rendering ---------------------------------------------------------------------------------

const BLOCK_KEYWORD = { input: 'VAR_INPUT', output: 'VAR_OUTPUT', local: 'VAR' } as const;

function declarations(m: StModule, d: StDialect): string[] {
  const note = (c: string) => (m.comments === 'line' ? `\t// ${c}` : `   (* ${c} *)`);
  const lines: string[] = [];
  for (const b of m.blocks) {
    if (!b.decls.length) continue;
    const head = BLOCK_KEYWORD[b.kind];
    lines.push(
      b.title
        ? m.comments === 'line'
          ? `${head}\t// ${b.title}`
          : `${head} (* ${b.title} *)`
        : head,
    );
    for (const v of b.decls) {
      const init =
        v.init !== undefined && isBase(v.type) ? ` := ${literal(v.type, v.init, d)}` : '';
      lines.push(
        `${m.indent}${v.name} : ${typeName(v.type, d)}${init};${v.comment ? note(v.comment) : ''}`,
      );
    }
    lines.push('END_VAR');
  }
  return lines;
}

/** Deterministic GUID for the TwinCAT POU (same project and block → same id). */
function guidOf(seed: string): string {
  let hex = '';
  for (let round = 0; hex.length < 32; round++) {
    let h = 0x811c9dc5 ^ round;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
    hex += (h >>> 0).toString(16).padStart(8, '0');
  }
  const v = `4${hex.slice(13, 16)}`;
  const r = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${v}-${r}-${hex.slice(20, 32)}}`;
}

/** Drops the blank line the generators put before the first section. */
const bodyText = (body: string[]) => body.join('\n').replace(/^\n+/, '');

/**
 * Writes a generated module as the file of a dialect. `seed` identifies the project (stable ids).
 */
export function renderModule(m: StModule, d: StDialect, seed = m.name): string {
  const headerBlock = ['(*', ...m.header, '*)'];
  switch (d) {
    case 'iec':
      return [
        ...headerBlock,
        `FUNCTION_BLOCK ${m.name}`,
        ...declarations(m, d),
        ...m.body,
        '',
        'END_FUNCTION_BLOCK',
        '',
      ].join('\n');

    case 'twincat': {
      const decl = [`FUNCTION_BLOCK ${m.name}`, ...headerBlock, ...declarations(m, d)].join('\n');
      return [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<TcPlcObject Version="1.1.0.1" ProductVersion="3.1.4024.0">',
        `  <POU Name="${m.name}" Id="${guidOf(`${seed}/${m.name}`)}" SpecialFunc="None">`,
        `    <Declaration>${cdata(`${decl}\n`)}</Declaration>`,
        '    <Implementation>',
        `      <ST>${cdata(bodyText(m.body))}</ST>`,
        '    </Implementation>',
        '  </POU>',
        '</TcPlcObject>',
        '',
      ].join('\n');
    }

    case 'siemens': {
      const locals = new Set(m.blocks.flatMap((b) => b.decls.map((v) => v.name.toUpperCase())));
      const header = m.header.map((l) => `//${l.replace(/^ {0,2}/, ' ').trimEnd()}`);
      return toAscii(
        [
          `FUNCTION_BLOCK "${m.name}"`,
          "{ S7_Optimized_Access := 'TRUE' }",
          'VERSION : 0.1',
          ...header,
          ...declarations(m, d),
          '',
          'BEGIN',
          prefixLocals(bodyText(m.body), locals),
          '',
          'END_FUNCTION_BLOCK',
          '',
        ].join('\n'),
      );
    }

    case 'rockwell': {
      const all = m.blocks.flatMap((b) => b.decls.map((v) => ({ ...v, kind: b.kind })));
      const width = Math.max(4, ...all.map((v) => v.name.length)) + 2;
      const typeWidth = Math.max(9, ...all.map((v) => typeName(v.type, d).length)) + 2;
      const use = { input: 'input', output: 'output', local: 'local' } as const;
      const tags = all.map((v) =>
        `  ${v.name.padEnd(width)}${typeName(v.type, d).padEnd(typeWidth)}${use[v.kind].padEnd(8)}${v.comment ?? ''}`.trimEnd(),
      );
      // Logix keeps tag values over a restart: the first scan sets every initial value again.
      const init = all
        .filter((v) => v.kind !== 'input' && isBase(v.type))
        .map((v) => `${m.indent}${v.name} := ${literal(v.type as VariableType, v.init, d)};`);
      return toAscii(
        [
          '(*',
          ...m.header.map((l) => l.replace(CALL_CYCLICALLY, 'Call this routine every scan.')),
          '',
          '  Studio 5000 Logix Designer: create these tags (program scope), then paste the code',
          '  below into a Structured Text routine called every scan.',
          '',
          `  ${'Name'.padEnd(width)}${'Data type'.padEnd(typeWidth)}${'Use'.padEnd(8)}Comment`,
          ...tags,
          '*)',
          '',
          '// First scan: initial values',
          'IF S:FS THEN',
          ...init,
          'END_IF;',
          logixLiterals(m.body.join('\n')),
          '',
        ].join('\n'),
      );
    }
  }
}
