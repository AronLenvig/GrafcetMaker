/**
 * Live collaboration on the hosted site: one Durable Object per room relays the room's sealed
 * messages over WebSockets (protocol in worker/room.ts) and stores its latest sealed snapshot.
 * It uses WebSocket hibernation, so an idle room costs nothing while people stay connected, and
 * keep-alive pings are answered without waking it. A room's storage is deleted 30 days after
 * its last snapshot. Declared in wrangler.jsonc (binding ROOMS, SQLite storage).
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
  PONG,
  presenceEvent,
  rateAllows,
  relayError,
  RELAY_LIMITS,
  type RateState,
} from './room';

// Runtime globals of Workers.
declare const WebSocketPair: new () => { 0: CfWebSocket; 1: CfWebSocket };
declare const WebSocketRequestResponsePair: new (request: string, response: string) => Pair;

export interface CollabEnv {
  ROOMS?: DurableObjectNamespace;
}

const OPEN = 1;

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
      rate = { windowStart: Date.now(), count: 0 };
      this.rates.set(ws, rate);
    }
    if (!rateAllows(rate, Date.now())) {
      if (rate.count === RELAY_LIMITS.framesPerWindow + 1) send(ws, relayError('rate'));
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
      case 's':
        await this.ctx.storage.put('snapshot', msg.d);
        await this.ctx.storage.setAlarm(Date.now() + RELAY_LIMITS.keepMs);
    }
  }

  webSocketClose(ws: CfWebSocket, code: number): void {
    this.leave(ws);
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closing');
    } catch {
      // Already closed.
    }
  }

  webSocketError(ws: CfWebSocket): void {
    this.leave(ws);
  }

  private leave(ws: CfWebSocket): void {
    const out = presenceEvent('leave', idOf(ws));
    for (const other of this.ctx.getWebSockets()) if (other !== ws) send(other, out);
  }

  /** 30 days without a new snapshot: the room is forgotten (or checked again tomorrow if in use). */
  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length) await this.ctx.storage.setAlarm(Date.now() + 86_400_000);
    else await this.ctx.storage.deleteAll();
  }
}
