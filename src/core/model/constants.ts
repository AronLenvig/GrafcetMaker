/** Format constants shared by the schema and by code that must not load Zod (workers). */

/** Current file format version. Bump together with a migration in core/io/migrations.ts. */
export const SCHEMA_VERSION = 3;

/** Identifiers (variables, grafcet names) follow IEC 61131-3: letter or underscore, then alphanumerics. */
export const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Whether a string can serve as an id, a key of the project's maps: not a property every object
 * inherits (`constructor`, `toString`, `__proto__`…), which a lookup like `steps[id]` finds on
 * any map. Files, links and live-session peers are untrusted and could otherwise pass ids that
 * look present everywhere.
 */
export const isSafeKey = (s: string): boolean => !Object.hasOwn(Object.prototype, s);

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  elements: 50_000,
  idLength: 64,
  nameLength: 64,
  shortText: 256,
  longText: 4000,
  expression: 2000,
} as const;
