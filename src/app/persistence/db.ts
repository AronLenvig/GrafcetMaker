import Dexie, { type Table } from 'dexie';
import type { Change } from '@/core/collab/records';
import type { Project } from '@/core/model/types';

export interface StoredProject {
  /** = project.id */
  id: string;
  name: string;
  project: Project;
  updatedAt: number;
  /** Has changes not written to a file. */
  dirty: boolean;
  fileName?: string;
}

export type SnapshotReason = 'auto' | 'save' | 'beforeReplace';

export interface Snapshot {
  id?: number;
  projectId: string;
  name: string;
  takenAt: number;
  reason: SnapshotReason;
  project: Project;
}

export interface RecentEntry {
  /** = project.id */
  id: string;
  name: string;
  fileName?: string;
  openedAt: number;
  /** Chromium: reopen the same file directly (permission is re-requested). */
  handle?: FileSystemFileHandle;
}

/** A live session's records on this device, so a reload rejoins with offline edits (src/app/collab). */
export interface StoredRoom {
  /** = room id */
  id: string;
  /** The room's project id. */
  pid: string;
  records: Change[];
  savedAt: number;
}

class GrafcetDb extends Dexie {
  projects!: Table<StoredProject, string>;
  snapshots!: Table<Snapshot, number>;
  recent!: Table<RecentEntry, string>;
  rooms!: Table<StoredRoom, string>;

  constructor() {
    super('grafcetmaker');
    this.version(1).stores({
      projects: 'id, updatedAt',
      snapshots: '++id, projectId, takenAt',
      recent: 'id, openedAt',
    });
    this.version(2).stores({ rooms: 'id' });
  }
}

export const db = new GrafcetDb();

export const MAX_SNAPSHOTS_PER_PROJECT = 30;
export const MAX_RECENT = 12;

/** Runs a storage operation; storage can be blocked or full, which must never break editing. */
export async function safely<T>(op: () => Promise<T>): Promise<T | undefined> {
  try {
    return await op();
  } catch (e) {
    storageErrorListener?.(e);
    return undefined;
  }
}

let storageErrorListener: ((e: unknown) => void) | null = null;
export function onStorageError(listener: (e: unknown) => void): void {
  storageErrorListener = listener;
}

export async function addSnapshot(project: Project, reason: SnapshotReason): Promise<void> {
  await safely(async () => {
    await db.snapshots.add({
      projectId: project.id,
      name: project.name,
      takenAt: Date.now(),
      reason,
      project,
    });
    const keys = await db.snapshots.where('projectId').equals(project.id).sortBy('takenAt');
    const excess = keys.length - MAX_SNAPSHOTS_PER_PROJECT;
    if (excess > 0) await db.snapshots.bulkDelete(keys.slice(0, excess).map((s) => s.id!));
  });
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const list = await safely(() =>
    db.snapshots.where('projectId').equals(projectId).reverse().sortBy('takenAt'),
  );
  return list ?? [];
}

export async function touchRecent(entry: RecentEntry): Promise<void> {
  await safely(async () => {
    await db.recent.put(entry);
    const all = await db.recent.orderBy('openedAt').reverse().toArray();
    if (all.length > MAX_RECENT) await db.recent.bulkDelete(all.slice(MAX_RECENT).map((r) => r.id));
  });
}

export async function listRecent(): Promise<RecentEntry[]> {
  return (await safely(() => db.recent.orderBy('openedAt').reverse().toArray())) ?? [];
}
