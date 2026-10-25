import { describe, expect, it } from 'vitest';
import { createProject, createStep } from '@/core/model/factory';
import { SCHEMA_VERSION } from '@/core/model/schema';
import { MigrationError, migrate, type Migration } from '@/core/io/migrations';
import { ProjectFileError, parseProjectFile, serializeProject } from '@/core/io/projectFile';
import { strToU8, zipSync } from 'fflate';
import {
  applyVariableImport,
  planVariableImport,
  planVariableImportRows,
  variableRows,
  variablesToCsv,
  variablesToXlsx,
} from '@/core/io/csv';
import { readXlsx, XlsxError } from '@/core/io/xlsx';

function sampleProject() {
  const p = createProject('Sample', new Date('2026-01-01T00:00:00Z'));
  const g = p.grafcets[p.grafcetOrder[0]!]!;
  const s0 = Object.values(g.steps)[0]!;
  const s1 = createStep(1, { x: 200, y: 220 });
  g.steps[s1.id] = s1;
  g.transitions.t1 = {
    id: 't1',
    from: [s0.id],
    to: [s1.id],
    receptivity: 'a * /b',
    position: { x: 200, y: 160 },
  };
  g.transitions.t2 = {
    id: 't2',
    from: [s1.id],
    to: [s0.id],
    receptivity: '3s/X1',
    position: { x: 200, y: 280 },
    flow: 'left',
    routing: { sideX: 120, dropY: 400 },
  };
  g.actions.a1 = {
    id: 'a1',
    stepId: s1.id,
    order: 0,
    kind: 'continuous',
    text: 'M1',
    condition: 'c',
  };
  g.comments.c1 = { id: 'c1', text: 'Hello\nworld', position: { x: 400, y: 100 } };
  p.variables.v1 = { id: 'v1', name: 'a', type: 'BOOL', direction: 'input', address: '%I0.0' };
  p.variables.v2 = { id: 'v2', name: 'M1', type: 'BOOL', direction: 'output' };
  return p;
}

function errorOf(fn: () => unknown): ProjectFileError {
  try {
    fn();
  } catch (e) {
    if (e instanceof ProjectFileError) return e;
    throw e;
  }
  throw new Error('expected ProjectFileError');
}

describe('project file round-trip', () => {
  it('save → load → save is byte-identical and deep-equal', () => {
    const p = sampleProject();
    const text = serializeProject(p);
    const loaded = parseProjectFile(text);
    expect(loaded).toEqual(p);
    expect(serializeProject(loaded)).toBe(text);
  });

  it('opens version 2 files unchanged (version 3 added right-to-left transitions)', () => {
    const p = sampleProject();
    delete p.grafcets[p.grafcetOrder[0]!]!.transitions.t2!.flow;
    const old = JSON.parse(serializeProject(p)) as Record<string, unknown>;
    old.schemaVersion = 2;
    expect(parseProjectFile(JSON.stringify(old))).toEqual(p);
  });

  it('writes keys in canonical schema order regardless of in-memory order', () => {
    const p = sampleProject();
    const shuffled = Object.fromEntries(Object.entries(p).reverse()) as typeof p;
    expect(serializeProject(shuffled)).toBe(serializeProject(p));
  });
});

describe('invalid files are rejected with a clear code', () => {
  it('rejects non-JSON', () => {
    expect(errorOf(() => parseProjectFile('{nope')).code).toBe('notJson');
  });

  it('rejects JSON that is not a project', () => {
    expect(errorOf(() => parseProjectFile('[1,2]')).code).toBe('notProject');
    expect(errorOf(() => parseProjectFile('{"name":"x"}')).code).toBe('notProject');
  });

  it('rejects files from a newer version and reports it', () => {
    const doc = { ...sampleProject(), schemaVersion: SCHEMA_VERSION + 1 };
    const err = errorOf(() => parseProjectFile(JSON.stringify(doc)));
    expect(err.code).toBe('newerVersion');
    expect(err.version).toBe(SCHEMA_VERSION + 1);
  });

  it('rejects dangling references with a path to the problem', () => {
    const p = sampleProject();
    const g = p.grafcets[p.grafcetOrder[0]!]!;
    g.transitions.t1!.to = ['missing'];
    const err = errorOf(() => parseProjectFile(JSON.stringify(p)));
    expect(err.code).toBe('invalid');
    expect(err.details.join('\n')).toMatch(/unknown step "missing"/);
  });

  it('rejects ids that every object has (constructor, __proto__…), which would pass as present', () => {
    const tamper: ((p: ReturnType<typeof sampleProject>) => void)[] = [
      (p) => (p.grafcetOrder = ['constructor', ...p.grafcetOrder]),
      (p) => (p.grafcets[p.grafcetOrder[0]!]!.transitions.t1!.to = ['__proto__']),
      (p) => (p.grafcets[p.grafcetOrder[0]!]!.actions.a1!.stepId = 'toString'),
      (p) => {
        const s = Object.values(p.grafcets[p.grafcetOrder[0]!]!.steps)[0]!;
        s.kind = 'macro';
        s.refGrafcetId = 'hasOwnProperty';
      },
    ];
    for (const change of tamper) {
      const p = sampleProject();
      change(p);
      expect(errorOf(() => parseProjectFile(JSON.stringify(p))).code).toBe('invalid');
    }
  });

  it('rejects duplicate variable names case-insensitively', () => {
    const p = sampleProject();
    p.variables.v3 = { id: 'v3', name: 'A', type: 'BOOL', direction: 'input' };
    expect(errorOf(() => parseProjectFile(JSON.stringify(p))).code).toBe('invalid');
  });

  it('rejects invalid identifiers and oversize files', () => {
    const p = sampleProject();
    p.variables.v1!.name = '1abc';
    expect(errorOf(() => parseProjectFile(JSON.stringify(p))).code).toBe('invalid');
    expect(errorOf(() => parseProjectFile('{}', 11 * 1024 * 1024)).code).toBe('tooLarge');
  });
});

describe('migration chain', () => {
  const chain: Record<number, Migration> = {
    1: (d) => ({ ...d, renamed: d.old, old: undefined }),
    2: (d) => ({ ...d, added: true }),
  };

  it('applies each step in order and stamps the version', () => {
    const out = migrate({ schemaVersion: 1, old: 'x' }, 1, 3, chain);
    expect(out).toMatchObject({ schemaVersion: 3, renamed: 'x', added: true });
  });

  it('is a no-op at the current version', () => {
    const doc = { schemaVersion: 3 };
    expect(migrate(doc, 3, 3, chain)).toBe(doc);
  });

  it('fails clearly when a step is missing', () => {
    expect(() => migrate({ schemaVersion: 0 }, 0, 3, chain)).toThrow(MigrationError);
  });
});

describe('variables CSV', () => {
  it('exports and re-imports without changes', () => {
    const p = sampleProject();
    p.variables.v3 = {
      id: 'v3',
      name: 'Count',
      type: 'INT',
      direction: 'internal',
      initialValue: 5,
      comment: 'Parts, "good" ones',
    };
    const csv = variablesToCsv(p);
    expect(csv.split('\r\n')[0]).toBe('name,type,direction,initial,address,comment');
    expect(csv).toContain('"Parts, ""good"" ones"');
    const plan = planVariableImport(p, csv);
    expect(plan).toMatchObject({ added: [], updated: [], unchanged: 3, errors: [] });
  });

  it('adds, updates and rejects rows with reasons (semicolon-separated, quoted, BOM)', () => {
    const p = sampleProject();
    const csv =
      '\uFEFFname;type;direction;initial;address;comment\r\n' +
      'a;BOOL;input;TRUE;%I0.1;\r\n' +
      'Level;REAL;in;2.5;;"tank; level"\r\n' +
      '1bad;BOOL;input;;;\r\n' +
      'y2;WORD;input;;;\r\n' +
      'level;REAL;input;;;\r\n' +
      'T1;TIME;;3s;;\r\n';
    const plan = planVariableImport(p, csv);
    expect(plan.added.map((v) => v.name)).toEqual(['Level', 'T1']);
    expect(plan.added[0]).toMatchObject({
      type: 'REAL',
      direction: 'input',
      initialValue: 2.5,
      comment: 'tank; level',
    });
    expect(plan.added[1]).toMatchObject({
      type: 'TIME',
      direction: 'internal',
      initialValue: 3000,
    });
    expect(plan.updated).toEqual([
      {
        id: 'v1',
        name: 'a',
        type: 'BOOL',
        direction: 'input',
        initialValue: true,
        address: '%I0.1',
      },
    ]);
    expect(plan.errors.map((e) => [e.row, e.code])).toEqual([
      [4, 'invalidName'],
      [5, 'badType'],
      [6, 'duplicateInFile'],
    ]);
    applyVariableImport(p, plan);
    expect(Object.keys(p.variables)).toHaveLength(4);
  });

  it('keeps spreadsheets from running free text as formulas, and reads it back exactly', () => {
    const p = sampleProject();
    const texts = ['=HYPERLINK("x")', '@SUM(1)', "'quoted", 'ok;=1+1', '-5 V', 'plain'];
    texts.forEach((comment, i) => {
      p.variables[`c${i}`] = {
        id: `c${i}`,
        name: `C${i}`,
        type: 'BOOL',
        direction: 'input',
        comment,
      };
    });
    const csv = variablesToCsv(p);
    for (const line of csv.split('\r\n').slice(1))
      expect(line.split(/[,;]/).every((cell) => !/^"?[=+\-@]/.test(cell))).toBe(true);
    expect(planVariableImport(p, csv)).toMatchObject({ added: [], updated: [], errors: [] });
  });

  it('refuses types and directions named like built-in properties, and cuts over-long text', () => {
    const p = sampleProject();
    const plan = planVariableImport(
      p,
      `name,type,direction,address\nV1,constructor,input,\nV2,BOOL,__proto__,\nV3,BOOL,input,${'x'.repeat(300)}\n`,
    );
    expect(plan.errors.map((e) => e.code)).toEqual(['badType', 'badDirection']);
    expect(plan.added[0]!.address).toHaveLength(256);
  });

  it('rejects files without a name/type header', () => {
    expect(planVariableImport(sampleProject(), 'foo,bar\n1,2\n').errors[0]!.code).toBe('noHeader');
  });
});

describe('variables Excel', () => {
  it('round-trips the variable table through .xlsx', () => {
    const p = sampleProject();
    p.variables.v3 = {
      id: 'v3',
      name: 'Count',
      type: 'INT',
      direction: 'internal',
      initialValue: 5,
      comment: 'Parts <ok> & "good"',
    };
    const bytes = variablesToXlsx(p);
    expect(readXlsx(bytes)).toEqual(variableRows(p));
    expect(planVariableImportRows(p, readXlsx(bytes))).toMatchObject({
      added: [],
      updated: [],
      unchanged: 3,
      errors: [],
    });
  });

  it('reads shared strings, numbers, booleans and sparse cells written by spreadsheet apps', () => {
    const sheet =
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="s"><v>2</v></c></row>' +
      '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3" t="s"><v>4</v></c><c r="D3"><v>2.5</v></c><c r="E3" t="b"><v>1</v></c></row>' +
      '</sheetData></worksheet>';
    const sst =
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<si><t>name</t></si><si><t>type</t></si><si><t>initial</t></si>' +
      '<si><r><t>Le</t></r><r><t xml:space="preserve">vel</t></r></si><si><t>REAL</t></si></sst>';
    const workbook =
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId7"/></sheets></workbook>';
    const rels =
      '<Relationships><Relationship Id="rId7" Type="worksheet" Target="worksheets/data.xml"/></Relationships>';
    const bytes = zipSync({
      'xl/workbook.xml': strToU8(workbook),
      'xl/_rels/workbook.xml.rels': strToU8(rels),
      'xl/worksheets/data.xml': strToU8(sheet),
      'xl/sharedStrings.xml': strToU8(sst),
    });
    expect(readXlsx(bytes)).toEqual([
      ['name', 'type', '', 'initial', ''],
      ['Level', 'REAL', '', '2.5', 'TRUE'],
    ]);
    expect(() => readXlsx(strToU8('not a zip'))).toThrow(XlsxError);
  });

  it('refuses hostile workbooks quickly: unclosed tags, huge parts, impossible cells', () => {
    const workbook = (sheet: string | Uint8Array, extra: Record<string, Uint8Array> = {}) =>
      zipSync({
        'xl/workbook.xml': strToU8(
          '<workbook><sheets><sheet name="S" r:id="rId1"/></sheets></workbook>',
        ),
        'xl/worksheets/sheet1.xml': typeof sheet === 'string' ? strToU8(sheet) : sheet,
        ...extra,
      });
    // Scanned once: a lazy regex took seconds here.
    expect(readXlsx(workbook('<sheetData>' + '<row r="1">'.repeat(100_000)))).toEqual([]);
    expect(
      readXlsx(
        workbook('<row r="1"/><row r="2"><c r="A2" t="inlineStr"><is><t>x</t></is></c></row>'),
      ),
    ).toEqual([['x']]);
    expect(() => readXlsx(workbook('<row r="4294967295"><c><v>1</v></c></row>'))).toThrow(
      XlsxError,
    );
    expect(() => readXlsx(workbook('<row r="1"><c r="AAAAA1"><v>1</v></c></row>'))).toThrow(
      XlsxError,
    );
    // Parts are unpacked into buffers of their declared size: too large is refused unread.
    const huge = new Uint8Array(33 * 1024 * 1024).fill(32);
    expect(() => readXlsx(workbook('<sheetData/>', { 'xl/sharedStrings.xml': huge }))).toThrow(
      'too large',
    );
  });
});
