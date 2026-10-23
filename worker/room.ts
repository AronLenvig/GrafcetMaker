/**
 * The live collaboration relay protocol, shared by the Cloudflare Durable Object of the hosted
 * site (worker/collab.ts) and the Node relay for self-hosted installs (server/relay.ts). Kept free
 * of imports so Node can run it directly.
 *
 * A relay knows nothing about projects: messages are sealed by the browsers with a key that only
 * the room link carries (src/core/collab/wire.ts). It forwards them between the people in a room
 * and keeps the latest sealed snapshot for whoever joins next.
 *
 * Browser → relay (JSON text frames):
 *   { t: 'm', d }      to everyone else (reliable)    { t: 'v', d }  to everyone else (droppable)
 *   { t: 'to', p, d }  to one participant             { t: 's', d }  store as the room snapshot
 *   { t: 'ping' }      keep-alive, answered { t: 'pong' }
 * Relay → browser:
 *   { t: 'hello', id, peers, snapshot }  on connecting: own id, the others' ids, snapshot or null
 *   { t: 'join', id } / { t: 'leave', id }
 *   { t: 'm' | 'v', from, d }
 *   { t: 'error', code: 'full' | 'rate' | 'tooLarge' | 'bad' }
 */

export const RELAY_LIMITS = {
  /** People in one room. */
  peers: 20,
  /** Largest frame (the browsers cap sealed messages at 1 MiB). */
  frameChars: 1024 * 1024 + 256,
  /** At most this many frames per participant within each window. */
  framesPerWindow: 600,
  windowMs: 10_000,
  /** A room's snapshot is deleted this long after its last change. */
  keepMs: 30 * 24 * 60 * 60 * 1000,
};

/** Close code sent with an error that ends the connection. */
export const CLOSE_REFUSED = 4000;

/** Answer of `GET api/room`: tells the app that live collaboration is available here. */
export const PROBE_BODY = JSON.stringify({ ok: true, protocol: 1 });

export const PING = JSON.stringify({ t: 'ping' });
export const PONG = JSON.stringify({ t: 'pong' });

/**
 * For a request path: null when it is not the relay's, '' for the availability probe
 * (`…/api/room`), otherwise the room id (`…/api/room/<id>`). Any prefix is accepted, so the app
 * can live under a sub-path.
 */
export function roomOfPath(pathname: string): string | null {
  const m = /(?:^|\/)api\/room(?:\/([0-9a-z]{20}))?\/?$/.exec(pathname);
  return m ? (m[1] ?? '') : null;
}

export type Incoming =
  { t: 'm' | 'v' | 's'; d: string } | { t: 'to'; p: string; d: string } | { t: 'ping' };

/** A browser's frame, or null when malformed. */
export function parseIncoming(frame: string): Incoming | null {
  let raw: unknown;
  try {
    raw = JSON.parse(frame);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const { t, d, p } = raw as Record<string, unknown>;
  if (t === 'ping') return { t };
  if (typeof d !== 'string') return null;
  if (t === 'm' || t === 'v' || t === 's') return { t, d };
  if (t === 'to' && typeof p === 'string' && p.length <= 32) return { t, p, d };
  return null;
}

export interface RateState {
  windowStart: number;
  count: number;
}

/** Counts a frame; false when the participant sent too many in the current window. */
export function rateAllows(state: RateState, now: number): boolean {
  if (now - state.windowStart >= RELAY_LIMITS.windowMs) {
    state.windowStart = now;
    state.count = 0;
  }
  state.count++;
  return state.count <= RELAY_LIMITS.framesPerWindow;
}

export function newPeerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const hello = (id: string, peers: string[], snapshot: string | null): string =>
  JSON.stringify({ t: 'hello', id, peers, snapshot });

export const presenceEvent = (t: 'join' | 'leave', id: string): string => JSON.stringify({ t, id });

export const forward = (t: 'm' | 'v', from: string, d: string): string =>
  JSON.stringify({ t, from, d });

export const relayError = (code: 'full' | 'rate' | 'tooLarge' | 'bad'): string =>
  JSON.stringify({ t: 'error', code });
