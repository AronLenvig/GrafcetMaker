import { LIMITS, SCHEMA_VERSION, projectSchema } from '../model/schema';
import type { Project } from '../model/types';
import { MigrationError, migrate, type RawDocument } from './migrations';

export const FILE_EXTENSION = '.grafcet.json';

export type ProjectFileErrorCode =
  'tooLarge' | 'notJson' | 'notProject' | 'newerVersion' | 'invalid' | 'brokenLink';

/** Load failure with a stable code (translated by the UI) and human-readable details. */
export class ProjectFileError extends Error {
  constructor(
    readonly code: ProjectFileErrorCode,
    message: string,
    readonly details: string[] = [],
    readonly version?: number,
  ) {
    super(message);
    this.name = 'ProjectFileError';
  }
}

/**
 * Pretty-printed, canonical JSON (keys in schema order), so save → load → save is byte-identical;
 * `compact` leaves out the whitespace (share links). Never throws: if the in-memory project somehow
 * fails validation, the raw object is written so the user's work is never lost.
 */
export function serializeProject(project: Project, { compact = false } = {}): string {
  const parsed = projectSchema.safeParse(project);
  const data = parsed.success ? parsed.data : project;
  return compact ? JSON.stringify(data) : JSON.stringify(data, null, 2) + '\n';
}

export function suggestedFileName(project: Project): string {
  const printable = Array.from(project.name)
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('');
  const base = printable.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'project';
  return base + FILE_EXTENSION;
}

/** Parses untrusted file content into a validated, migrated project. Throws ProjectFileError. */
export function parseProjectFile(text: string, byteLength: number = text.length): Project {
  if (byteLength > LIMITS.fileBytes) {
    throw new ProjectFileError(
      'tooLarge',
      `File is larger than ${LIMITS.fileBytes / 1024 / 1024} MB`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ProjectFileError('notJson', 'File is not valid JSON', [String((e as Error).message)]);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ProjectFileError('notProject', 'File is not a GrafcetMaker project');
  }
  const doc = raw as RawDocument;
  const version = doc.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new ProjectFileError(
      'notProject',
      'File is not a GrafcetMaker project (no schemaVersion)',
    );
  }
  if (version > SCHEMA_VERSION) {
    throw new ProjectFileError(
      'newerVersion',
      `File was created by a newer GrafcetMaker (format ${version}, this version reads up to ${SCHEMA_VERSION})`,
      [],
      version,
    );
  }
  let migrated: RawDocument;
  try {
    migrated = migrate(doc, version);
  } catch (e) {
    if (e instanceof MigrationError) throw new ProjectFileError('invalid', e.message, [], version);
    throw e;
  }
  const result = projectSchema.safeParse(migrated);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 8)
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message));
    throw new ProjectFileError('invalid', 'File content is invalid or corrupted', details, version);
  }
  return result.data;
}
