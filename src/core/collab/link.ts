/**
 * Live session links: `#room=<id>,<key>`. The key exists only in the fragment, which browsers
 * never send to a server (see wire.ts for what it seals).
 */
export const ROOM_PREFIX = '#room=';

export interface RoomLink {
  id: string;
  key: string;
}

const ROOM_ID = /^[0-9a-z]{20}$/;
const ROOM_KEY = /^[\w-]{22}$/;

export function formatRoomHash(link: RoomLink): string {
  return `${ROOM_PREFIX}${link.id},${link.key}`;
}

/** The room of a `#room=<id>,<key>` fragment, or null for anything else. */
export function parseRoomHash(hash: string): RoomLink | null {
  if (!hash.startsWith(ROOM_PREFIX)) return null;
  const [id, key, ...rest] = hash.slice(ROOM_PREFIX.length).split(',');
  if (rest.length || !id || !key || !ROOM_ID.test(id) || !ROOM_KEY.test(key)) return null;
  return { id, key };
}
