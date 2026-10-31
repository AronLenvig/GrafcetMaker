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
 *   { t: 'to', p, d }  to one participant
 *   { t: 's', d, w }   store as the room snapshot; `w` is the room's write token (protocol 2)
 *   { t: 'ping' }      keep-alive, answered { t: 'pong' }
 * Relay → browser:
 *   { t: 'hello', id, peers, snapshot }  on connecting: own id, the others' ids, snapshot or null
 *   { t: 'join', id } / { t: 'leave', id }
 *   { t: 'm' | 'v', from, d }
 *   { t: 'error', code: 'full' | 'rate' | 'tooLarge' | 'bad' | 'denied' | 'busy' }
 *     (denied: a snapshot with the wrong write token; busy: the relay has no room for a snapshot)
 *
 * Write token: only the holders of the room key may replace the snapshot. Browsers derive the
 * token from the key (src/core/collab/wire.ts, `roomWriteToken`); the relay keeps its SHA-256 hash
 * from the first snapshot that carries one (trust on first write: the browser starting a room
 * stores its snapshot as soon as it connects) and refuses later snapshots with another token.
 * Rooms from before tokens (no hash kept) accept snapshots without one until one comes with a
 * token. Someone who only knows the room id (relay operator, access logs) can still read the
 * sealed snapshot, which they cannot open, but no longer replace it.
 */

export const RELAY_LIMITS = {
  /** People in one room. */
  peers: 20,
  /** Largest frame (the browsers cap sealed messages at 1 MiB). */
  frameChars: 1024 * 1024 + 256,
  /** At most this many frames per participant within each window… */
  framesPerWindow: 600,
  /**
   * …and this many characters: 8 snapshots or full states of the largest size, while every frame
   * of an `m` goes to up to 19 others.
   */
  charsPerWindow: 8 * 1024 * 1024,
  windowMs: 10_000,
  /** A room's snapshot is deleted this long after its last change. */
  keepMs: 30 * 24 * 60 * 60 * 1000,
};

/** Close code sent with an error that ends the connection. */
export const CLOSE_REFUSED = 4000;

/**
 * Answer of `GET api/room`: tells the app that live collaboration is available here. Protocol 2
 * checks snapshot write tokens.
 */
export const PROBE_BODY = JSON.stringify({ ok: true, protocol: 2 });

/** Longest write token accepted (browsers send 43 characters: 32 bytes in base64url). */
const TOKEN_CHARS = 64;

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
  | { t: 'm' | 'v'; d: string }
  | { t: 's'; d: string; w?: string }
  | { t: 'to'; p: string; d: string }
  | { t: 'ping' };

/** A browser's frame, or null when malformed. */
export function parseIncoming(frame: string): Incoming | null {
  let raw: unknown;
  try {
    raw = JSON.parse(frame);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const { t, d, p, w } = raw as Record<string, unknown>;
  if (t === 'ping') return { t };
  if (typeof d !== 'string') return null;
  if (t === 'm' || t === 'v') return { t, d };
  if (t === 's') {
    if (w === undefined) return { t, d };
    return typeof w === 'string' && w.length > 0 && w.length <= TOKEN_CHARS ? { t, d, w } : null;
  }
  if (t === 'to' && typeof p === 'string' && p.length <= 32) return { t, p, d };
  return null;
}

export interface RateState {
  windowStart: number;
  count: number;
  chars: number;
  /** A frame of the current window was refused (the participant has been told). */
  refused: boolean;
}

export const newRate = (now: number): RateState => ({
  windowStart: now,
  count: 0,
  chars: 0,
  refused: false,
});

/**
 * Counts a frame of `chars` characters: 'ok', or, when the participant sent too many frames or
 * characters in the current window, 'refuse' for the first frame refused (answered with a rate
 * error) and 'drop' for the next ones.
 */
export function rateCheck(state: RateState, now: number, chars: number): 'ok' | 'refuse' | 'drop' {
  if (now - state.windowStart >= RELAY_LIMITS.windowMs) Object.assign(state, newRate(now));
  if (
    state.count < RELAY_LIMITS.framesPerWindow &&
    state.chars + chars <= RELAY_LIMITS.charsPerWindow
  ) {
    state.count++;
    state.chars += chars;
    return 'ok';
  }
  if (state.refused) return 'drop';
  state.refused = true;
  return 'refuse';
}

/** The hash a relay keeps of a room's write token: SHA-256, in hex. */
export async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Whether a snapshot frame with write token `token` may replace the snapshot of a room whose
 * kept token hash is `kept` (null: none yet). Returns the hash to keep from now on, or false
 * when the frame is refused (see "Write token" above).
 */
export async function snapshotWrite(
  kept: string | null,
  token: string | undefined,
): Promise<string | null | false> {
  if (token === undefined) return kept === null ? null : false;
  const hash = await tokenHash(token);
  if (kept === null) return hash;
  return hash === kept ? kept : false;
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

export type RelayErrorCode = 'full' | 'rate' | 'tooLarge' | 'bad' | 'denied' | 'busy';

export const relayError = (code: RelayErrorCode): string => JSON.stringify({ t: 'error', code });
