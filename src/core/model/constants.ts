/** Format constants shared by the schema and by code that must not load Zod (workers). */

/** Current file format version. Bump together with a migration in core/io/migrations.ts. */
export const SCHEMA_VERSION = 2;

/** Identifiers (variables, grafcet names) follow IEC 61131-3: letter or underscore, then alphanumerics. */
export const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  elements: 50_000,
  idLength: 64,
  nameLength: 64,
  shortText: 256,
  longText: 4000,
  expression: 2000,
} as const;
