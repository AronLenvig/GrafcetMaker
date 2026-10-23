/**
 * Live collaboration state as the UI shows it (always loaded, no dependencies on the editor's
 * commands). Actions are in liveStore.ts; the session itself in session.ts.
 */
import { create } from 'zustand';
import type { RoomLink } from '@/core/collab/link';
import type { Presence } from '@/core/collab/wire';
import type { Id, Point } from '@/core/model/types';
import { setPrefs, usePrefs } from '../prefs';

export type LiveStatus = 'off' | 'connecting' | 'connected' | 'reconnecting';

export interface LiveState {
  status: LiveStatus;
  /** The link to share, while in a session. */
  link: string | null;
  /** The others in the session by relay id; null until they said who they are. */
  peers: Record<string, Presence | null>;
  /** While simulating: who changed the diagram since (their changes wait for a restart). */
  held: string[] | null;
  /** The local pointer on the diagram, shown to the others. */
  cursor: { g: Id; at: Point } | null;
  /** A room link opened and not joined yet (the join dialog asks first). */
  invite: RoomLink | null;
}

export const useLive = create<LiveState>(() => ({
  status: 'off',
  link: null,
  peers: {},
  held: null,
  cursor: null,
  invite: null,
}));

/** This device's id in live sessions (stable: it picks the color the others see). */
export function clientId(): string {
  let id = usePrefs.getState().liveId;
  if (!id) {
    id = crypto.randomUUID();
    setPrefs({ liveId: id });
  }
  return id;
}

/** Number of participant colors (`--peer-0` … in the theme tokens). */
export const PEER_COLORS = 8;

/** A participant's color, from their device id. */
export function peerColor(cid: string): string {
  let h = 0;
  for (let i = 0; i < cid.length; i++) h = (h * 31 + cid.charCodeAt(i)) >>> 0;
  return `var(--peer-${h % PEER_COLORS})`;
}

/** Up to two initials of a participant's name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words.length > 1 ? words[0]![0]! + words[1]![0]! : words[0]!.slice(0, 2)).toUpperCase();
}

const TAB_ROOM_KEY = 'grafcetmaker.liveRoom';

/**
 * The room this tab is in, kept in sessionStorage (written at once, kept across a reload of the
 * same tab): a reload rejoins without asking even before the session's records were saved.
 */
export function rememberTabRoom(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(TAB_ROOM_KEY, id);
    else sessionStorage.removeItem(TAB_ROOM_KEY);
  } catch {
    // Storage unavailable: a reload asks again before rejoining.
  }
}

export function tabRoom(): string | null {
  try {
    return sessionStorage.getItem(TAB_ROOM_KEY);
  } catch {
    return null;
  }
}
