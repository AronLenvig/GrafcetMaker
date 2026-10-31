/**
 * Live collaboration on the hosted site: one Durable Object per room relays the room's sealed
 * messages over WebSockets (protocol in worker/room.ts) and stores its latest sealed snapshot.
 * It uses WebSocket hibernation, so an idle room costs nothing while people stay connected, and
 * keep-alive pings are answered without waking it. A room's storage is deleted 30 days after
 * its last snapshot. Declared in wrangler.jsonc (binding ROOMS, SQLite storage).
 *
 * Storage: `snapshot` (the latest sealed snapshot), `auth` (hash of the room's write token, see
 * worker/room.ts) and `changedAt`. Snapshots are written at most every SNAPSHOT_WRITE_MS: a later
 * one waits (the newest wins) and is written by the alarm, or when someone leaves.
 */
import {
  DurableObject,
  type CfWebSocket,
  type DurableObjectNamespace,
  type WebSocketRequestResponsePair as Pair,
} from 'cloudflare:workers';
import {
  CLOSE_REFUSED,
  forward,
  hello,
  newPeerId,
  parseIncoming,
  PING,
  newRate,
  PONG,
  presenceEvent,
  rateCheck,
  relayError,
  RELAY_LIMITS,
  snapshotWrite,
  type RateState,
} from './room';

// Runtime globals of Workers.
declare const WebSocketPair: new () => { 0: CfWebSocket; 1: CfWebSocket };
declare const WebSocketRequestResponsePair: new (request: string, response: string) => Pair;

export interface CollabEnv {
  ROOMS?: DurableObjectNamespace;
}

const OPEN = 1;
/** Storage writes of a room's snapshot are at least this far apart. */
const SNAPSHOT_WRITE_MS = 5000;

/** The participant id kept with each socket (survives hibernation). */
const idOf = (ws: CfWebSocket): string => (ws.deserializeAttachment() as { id: string }).id;

function send(ws: CfWebSocket, frame: string): void {
  try {
    if (ws.readyState === OPEN) ws.send(frame);
  } catch {
    // Closing meanwhile: its close handler tells the others.
  }
}

export class CollabRoom extends DurableObject<CollabEnv> {
  /** Frame counts per socket; reset when the object hibernates, which only loosens the limit. */
  private readonly rates = new WeakMap<CfWebSocket, RateState>();
  /** The kept write token hash (undefined: not read from storage yet). */
  private auth: string | null | undefined;
  /** A snapshot waiting to be written, when the last write was less than SNAPSHOT_WRITE_MS ago. */
  private pending: string | null = null;
  private lastWrite = 0;
  /** Snapshot frames are checked and stored one after the other. */
  private writes: Promise<void> = Promise.resolve();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
      return new Response('Expected a WebSocket', { status: 426 });
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    const others = this.ctx.getWebSockets().filter((ws) => ws.readyState === OPEN);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const id = newPeerId();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id });
    if (others.length >= RELAY_LIMITS.peers) {
      server.send(relayError('full'));
      server.close(CLOSE_REFUSED, 'full');
    } else {
      const snapshot = (await this.ctx.storage.get<string>('snapshot')) ?? null;
      server.send(hello(id, others.map(idOf), snapshot));
      for (const ws of others) send(ws, presenceEvent('join', id));
    }
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  async webSocketMessage(ws: CfWebSocket, frame: string | ArrayBuffer): Promise<void> {
    if (typeof frame !== 'string' || frame.length > RELAY_LIMITS.frameChars) {
      send(ws, relayError('tooLarge'));
      return;
    }
    let rate = this.rates.get(ws);
    if (!rate) {
      rate = newRate(Date.now());
      this.rates.set(ws, rate);
    }
    const verdict = rateCheck(rate, Date.now(), frame.length);
    if (verdict !== 'ok') {
      if (verdict === 'refuse') send(ws, relayError('rate'));
      return;
    }
    const msg = parseIncoming(frame);
    if (!msg) {
      send(ws, relayError('bad'));
      return;
    }
    const from = idOf(ws);
    switch (msg.t) {
      case 'ping':
        send(ws, PONG);
        return;
      case 'm':
      case 'v': {
        const out = forward(msg.t, from, msg.d);
        for (const other of this.ctx.getWebSockets()) if (other !== ws) send(other, out);
        return;
      }
      case 'to': {
        const target = this.ctx.getWebSockets().find((other) => idOf(other) === msg.p);
        if (target) send(target, forward('m', from, msg.d));
        return;
      }
      case 's': {
        const { d, w } = msg;
        await this.queue(() => this.offerSnapshot(ws, d, w));
      }
    }
  }

  private queue(task: () => Promise<void>): Promise<void> {
    this.writes = this.writes.then(task).catch(() => undefined);
    return this.writes;
  }

  private async offerSnapshot(ws: CfWebSocket, snapshot: string, token?: string): Promise<void> {
    if (this.auth === undefined) this.auth = (await this.ctx.storage.get<string>('auth')) ?? null;
    const auth = await snapshotWrite(this.auth, token);
    if (auth === false) {
      send(ws, relayError('denied'));
      return;
    }
    this.auth = auth;
    const waiting = this.pending !== null;
    this.pending = snapshot;
    const wait = this.lastWrite + SNAPSHOT_WRITE_MS - Date.now();
    if (wait <= 0) await this.flush();
    else if (!waiting) await this.ctx.storage.setAlarm(Date.now() + wait);
  }

  /** Writes the waiting snapshot; the room is then kept for RELAY_LIMITS.keepMs. */
  private async flush(): Promise<void> {
    const snapshot = this.pending;
    if (snapshot === null) return;
    this.pending = null;
    this.lastWrite = Date.now();
    const entries: Record<string, unknown> = { snapshot, changedAt: this.lastWrite };
    if (this.auth) entries.auth = this.auth;
    await this.ctx.storage.put(entries);
    await this.ctx.storage.setAlarm(this.lastWrite + RELAY_LIMITS.keepMs);
  }

  async webSocketClose(ws: CfWebSocket, code: number): Promise<void> {
    this.leave(ws);
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closing');
    } catch {
      // Already closed.
    }
    await this.queue(() => this.flush());
  }

  async webSocketError(ws: CfWebSocket): Promise<void> {
    this.leave(ws);
    await this.queue(() => this.flush());
  }

  private leave(ws: CfWebSocket): void {
    const out = presenceEvent('leave', idOf(ws));
    for (const other of this.ctx.getWebSockets()) if (other !== ws) send(other, out);
  }

  /**
   * A waiting snapshot is written. Otherwise, 30 days without a new snapshot: the room is
   * forgotten (or checked again tomorrow if in use). A waiting snapshot lost when the object was
   * evicted (the others still hold the state) leaves the expiry to `changedAt`.
   */
  async alarm(): Promise<void> {
    await this.writes;
    if (this.pending !== null) {
      await this.queue(() => this.flush());
      return;
    }
    const changedAt = await this.ctx.storage.get<number>('changedAt');
    if (changedAt !== undefined && Date.now() < changedAt + RELAY_LIMITS.keepMs)
      await this.ctx.storage.setAlarm(changedAt + RELAY_LIMITS.keepMs);
    else if (this.ctx.getWebSockets().length)
      await this.ctx.storage.setAlarm(Date.now() + 86_400_000);
    else {
      await this.ctx.storage.deleteAll();
      this.auth = undefined;
    }
  }
}
