import { SCHEMA_VERSION } from '../model/constants';

export type RawDocument = Record<string, unknown>;

/** Upgrades a raw document by exactly one version (n → n+1). Must not mutate its input. */
export type Migration = (doc: RawDocument) => RawDocument;

/** MIGRATIONS[n] upgrades a document from schemaVersion n to n+1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // 2: actions may be unattached (stepId null, with a position). Every version 1 file is valid.
  1: (doc) => doc,
  // 3: transitions may flow right to left (`flow: 'left'`). Every version 2 file is valid.
  2: (doc) => doc,
  // 4: a transition's link to its step may be drawn as a jump (`jump: true`). Every version 3 file
  // is valid.
  3: (doc) => doc,
};

export class MigrationError extends Error {
  constructor(readonly fromVersion: number) {
    super(`No migration available from file format version ${fromVersion}`);
    this.name = 'MigrationError';
  }
}

/** Applies the migration chain from the document's version up to `target`. */
export function migrate(
  doc: RawDocument,
  fromVersion: number,
  target: number = SCHEMA_VERSION,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): RawDocument {
  let current = doc;
  for (let v = fromVersion; v < target; v++) {
    const step = migrations[v];
    if (!step) throw new MigrationError(v);
    current = { ...step(current), schemaVersion: v + 1 };
  }
  return current;
}
