/**
 * Live collaboration actions for the UI (always loaded, small). The session itself (records,
 * encryption, relay connection: ./session.ts) is loaded only when a session starts or is joined.
 */
import { useEffect, useState } from 'react';
import { parseRoomHash, ROOM_PREFIX, type RoomLink } from '@/core/collab/link';
import { centerOn, revealElements } from '@/editor/canvas/viewport';
import { setActiveGrafcet } from '@/editor/commands/edit';
import { openAppDialog } from '@/editor/commands/registry';
import { getProject } from '@/editor/store/document';
import { db, safely } from '../persistence/db';
import { tabRoom, useLive } from './liveState';

const session = () => import('./session');

let probe: Promise<boolean> | null = null;

/**
 * Whether this site has a live collaboration relay (asked once per page). Static hosts answer
 * the request with index.html, hence the JSON check; network errors are not remembered.
 */
export function liveAvailable(): Promise<boolean> {
  probe ??= fetch('api/room', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(async (r) => {
      if (!r.ok || !r.headers.get('Content-Type')?.includes('application/json')) return false;
      return ((await r.json()) as { ok?: unknown }).ok === true;
    })
    .catch(() => {
      probe = null;
      return false;
    });
  return probe;
}

export function useLiveAvailable(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    void liveAvailable().then((v) => alive && setOk(v));
    return () => {
      alive = false;
    };
  }, []);
  return ok;
}

/** Starts a session with the open project; the link to share appears in the dialog. */
export async function startLive(): Promise<void> {
  await (await session()).startSession();
}

export async function joinLive(link: RoomLink): Promise<void> {
  useLive.setState({ invite: null });
  await (await session()).joinSession(link);
}

/** Leaves the session; the project stays open as a local copy. */
export async function leaveLive(): Promise<void> {
  useLive.setState({ invite: null });
  if (useLive.getState().status !== 'off') await (await session()).leaveSession();
}

/** While simulating: takes in the others' changes and starts the simulation over. */
export async function restartWithChanges(): Promise<void> {
  await (await session()).restartWithChanges();
}

/** Declines a room link that was opened (removes it from the address bar). */
export function declineInvite(): void {
  useLive.setState({ invite: null });
  if (location.hash.startsWith(ROOM_PREFIX) && useLive.getState().status === 'off')
    history.replaceState(null, '', location.pathname + location.search);
}

/**
 * Handles a room link in the address bar (on launch, or pasted into an open tab). A room this tab
 * or device was in is rejoined right away; a new invitation asks first, since joining replaces
 * the open project. Returns false when the URL holds no room link.
 */
export async function openRoomLink(): Promise<boolean> {
  if (!location.hash.startsWith(ROOM_PREFIX)) return false;
  const link = parseRoomHash(location.hash);
  if (!link) {
    history.replaceState(null, '', location.pathname + location.search);
    useLive.setState({ invite: null });
    (await session()).showLiveError('brokenLink');
    return true;
  }
  const current = useLive.getState().link;
  if (current && parseRoomHash(new URL(current).hash)?.id === link.id) return true;
  // This tab was in the room (a reload), or this device kept its records: rejoin.
  const known = tabRoom() === link.id || !!(await safely(() => db.rooms.get(link.id)));
  if (known) {
    void joinLive(link);
    return true;
  }
  useLive.setState({ invite: link });
  openAppDialog('live');
  return true;
}

/** Shows what a participant is looking at: their grafcet, centered on their pointer or selection. */
export function followPeer(id: string): void {
  const p = useLive.getState().peers[id];
  if (!p?.g || !Object.hasOwn(getProject().grafcets, p.g)) return;
  const gid = p.g;
  setActiveGrafcet(gid);
  requestAnimationFrame(() => {
    if (p.c) centerOn(gid, p.c);
    else if (p.sel.length) revealElements(gid, p.sel);
  });
}
