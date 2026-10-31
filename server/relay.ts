/**
 * Live collaboration relay for self-hosted and on-premise installs (the hosted site runs the same
 * protocol, worker/room.ts, as a Cloudflare Durable Object). It forwards each room's sealed
 * messages between the people in it and keeps the room's latest sealed snapshot. It never sees
 * project data: only the room link carries the key that opens it.
 *
 * Run with Node 22.18 or later (TypeScript runs as is) and the `ws` package:
 *   node server/relay.ts
 *   PORT                      listening port (default 8081)
 *   RELAY_DATA_DIR            where snapshots are kept so rooms survive a restart (default: memory
 *                             only)
 *   RELAY_ALLOWED_ORIGINS     comma-separated origins of the app pages that may connect, e.g.
 *                             `https://grafcet.example.com`, or `*` for any (default: pages of the
 *                             host the relay is reached at, any port)
 *   RELAY_MAX_ROOMS           rooms with people in them at once (default 1000)
 *   RELAY_MAX_CONNECTIONS     connections at once (default 2000)
 *   RELAY_MAX_PER_IP          connections at once from one address (default 100)
 *   RELAY_CLIENT_IP_HEADER    header with the client's address, set by the proxy in front (e.g.
 *                             `x-real-ip`, see deploy/relay-proxy.conf); set it only when the relay
 *                             is reachable through that proxy alone (default: the connection's
 *                             address)
 *   RELAY_SNAPSHOT_MEMORY_MB  memory for snapshots (default 256): beyond it, the empty rooms
 *                             changed least recently leave memory (and are lost without a data
 *                             directory); a snapshot that still does not fit is refused
 * Serve it at <app path>/api/room on the app's own origin (nginx: deploy/relay-proxy.conf). The app
 * offers live sessions only where `GET <app path>/api/room` answers.
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { join } from 'node:path';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  CLOSE_REFUSED,
  forward,
  hello,
  newPeerId,
  newRate,
  parseIncoming,
  PONG,
  presenceEvent,
  PROBE_BODY,
  rateCheck,
  relayError,
  RELAY_LIMITS,
  roomOfPath,
  snapshotWrite,
  type RateState,
} from '../worker/room.ts';

interface Peer {
  id: string;
  ws: WebSocket;
  rate: RateState;
  alive: boolean;
}

interface Room {
  peers: Map<string, Peer>;
  snapshot: string | null;
  /** Hash of the room's write token, once a snapshot brought one (worker/room.ts). */
  auth: string | null;
  changedAt: number;
  /** Snapshot frames are checked and stored one after the other. */
  writes: Promise<void>;
}

/** A positive number from the environment, or `fallback`. */
function setting(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const port = Number(process.env.PORT ?? 8081);
const dataDir = process.env.RELAY_DATA_DIR || null;
if (dataDir) mkdirSync(dataDir, { recursive: true });
const limits = {
  rooms: setting('RELAY_MAX_ROOMS', 1000),
  connections: setting('RELAY_MAX_CONNECTIONS', 2000),
  perAddress: setting('RELAY_MAX_PER_IP', 100),
  snapshotChars: setting('RELAY_SNAPSHOT_MEMORY_MB', 256) * 1024 * 1024,
};
const addressHeader = process.env.RELAY_CLIENT_IP_HEADER?.trim().toLowerCase() || null;
/** Allowed page origins, normalized (`*`: any); none = pages of the request's own host. */
const allowedOrigins = (process.env.RELAY_ALLOWED_ORIGINS ?? '').split(',').flatMap((entry) => {
  const value = entry.trim();
  if (value === '*') return [value];
  try {
    return value ? [new URL(value).origin] : [];
  } catch {
    console.error(`RELAY_ALLOWED_ORIGINS: "${value}" is not an origin, ignored`);
    return [];
  }
});

const rooms = new Map<string, Room>();
/** Rooms with people in them, connections, and connections per address. */
let activeRooms = 0;
let connections = 0;
const perAddress = new Map<string, number>();
/** Characters of the snapshots held in memory (sealed snapshots are ASCII: one byte each). */
let snapshotChars = 0;

/** Room ids are 20 characters of [0-9a-z] (roomOfPath), safe as file names. */
const fileOf = (id: string) => join(dataDir!, `${id}.room`);

function setSnapshot(room: Room, snapshot: string | null): void {
  snapshotChars += (snapshot?.length ?? 0) - (room.snapshot?.length ?? 0);
  room.snapshot = snapshot;
}

function forget(id: string, room: Room): void {
  setSnapshot(room, null);
  if (rooms.get(id) === room) rooms.delete(id);
}

/**
 * Whether `more` characters of snapshot fit in memory, after letting go of the empty rooms other
 * than `keep` that changed least recently (with a data directory they stay on disk).
 */
function fits(more: number, keep: Room): boolean {
  if (snapshotChars + more <= limits.snapshotChars) return true;
  const idle = [...rooms]
    .filter(([, r]) => r !== keep && !r.peers.size && r.snapshot !== null)
    .sort(([, a], [, b]) => a.changedAt - b.changedAt);
  for (const [id, room] of idle) {
    forget(id, room);
    if (snapshotChars + more <= limits.snapshotChars) return true;
  }
  return false;
}

/** A room file: the token hash and a line break, then the snapshot (older files: the snapshot). */
function readRoomFile(id: string, room: Room): void {
  try {
    const text = readFileSync(fileOf(id), 'utf8');
    const lineEnd = text.indexOf('\n');
    room.auth = lineEnd > 0 ? text.slice(0, lineEnd) : null;
    setSnapshot(room, text.slice(lineEnd + 1));
    room.changedAt = statSync(fileOf(id)).mtimeMs;
  } catch {
    // A new room.
  }
}

function openRoom(id: string): Room {
  let room = rooms.get(id);
  if (room) return room;
  room = {
    peers: new Map(),
    snapshot: null,
    auth: null,
    changedAt: Date.now(),
    writes: Promise.resolve(),
  };
  rooms.set(id, room);
  if (dataDir) {
    readRoomFile(id, room);
    fits(0, room);
  }
  return room;
}

/** An empty room stays in memory only for its snapshot, and only without a data directory. */
function release(id: string, room: Room): void {
  if (!room.peers.size && (dataDir || room.snapshot === null)) forget(id, room);
}

async function offerSnapshot(
  id: string,
  room: Room,
  peer: Peer,
  snapshot: string,
  token: string | undefined,
): Promise<void> {
  const auth = await snapshotWrite(room.auth, token);
  // Let go of meanwhile to free memory: its snapshots go with it.
  if (rooms.get(id) !== room) return;
  if (auth === false) {
    send(peer, relayError('denied'));
    return;
  }
  if (!fits(snapshot.length - (room.snapshot?.length ?? 0), room)) {
    send(peer, relayError('busy'));
    return;
  }
  room.auth = auth;
  setSnapshot(room, snapshot);
  room.changedAt = Date.now();
  if (!dataDir) return;
  try {
    writeFileSync(`${fileOf(id)}.tmp`, auth ? `${auth}\n${snapshot}` : snapshot);
    renameSync(`${fileOf(id)}.tmp`, fileOf(id));
  } catch (e) {
    console.error(`Could not store room ${id}:`, e);
  }
}

function send(peer: Peer, frame: string): void {
  if (peer.ws.readyState === peer.ws.OPEN) peer.ws.send(frame);
}

function enter(roomId: string, ws: WebSocket): void {
  const room = openRoom(roomId);
  if (room.peers.size >= RELAY_LIMITS.peers) {
    ws.send(relayError('full'));
    ws.close(CLOSE_REFUSED, 'full');
    return;
  }
  if (!room.peers.size && activeRooms >= limits.rooms) {
    // Too many rooms in use: the browser tries again later.
    release(roomId, room);
    ws.close(1013, 'busy');
    return;
  }
  const peer: Peer = { id: newPeerId(), ws, rate: newRate(Date.now()), alive: true };
  ws.send(hello(peer.id, [...room.peers.keys()], room.snapshot));
  for (const other of room.peers.values()) send(other, presenceEvent('join', peer.id));
  room.peers.set(peer.id, peer);
  if (room.peers.size === 1) activeRooms++;

  ws.on('pong', () => {
    peer.alive = true;
  });
  ws.on('message', (data, isBinary) => {
    const frame = isBinary ? null : data.toString();
    if (frame === null || frame.length > RELAY_LIMITS.frameChars) {
      send(peer, relayError(frame === null ? 'bad' : 'tooLarge'));
      return;
    }
    const rate = rateCheck(peer.rate, Date.now(), frame.length);
    if (rate !== 'ok') {
      if (rate === 'refuse') send(peer, relayError('rate'));
      return;
    }
    const msg = parseIncoming(frame);
    if (!msg) {
      send(peer, relayError('bad'));
      return;
    }
    switch (msg.t) {
      case 'ping':
        send(peer, PONG);
        return;
      case 'm':
      case 'v': {
        const out = forward(msg.t, peer.id, msg.d);
        for (const other of room.peers.values()) if (other !== peer) send(other, out);
        return;
      }
      case 'to': {
        const target = room.peers.get(msg.p);
        if (target) send(target, forward('m', peer.id, msg.d));
        return;
      }
      case 's':
        room.writes = room.writes
          .then(() => offerSnapshot(roomId, room, peer, msg.d, msg.w))
          .catch((e: unknown) => console.error(`Could not store room ${roomId}:`, e));
    }
  });
  ws.on('close', () => {
    room.peers.delete(peer.id);
    for (const other of room.peers.values()) send(other, presenceEvent('leave', peer.id));
    if (room.peers.size) return;
    activeRooms--;
    // Once its last snapshot is stored.
    void room.writes.then(() => {
      if (rooms.get(roomId) === room) release(roomId, room);
    });
  });
  ws.on('error', () => ws.terminate());
}

/** The path of a request; '' when its target is not a valid path (`//[` makes `new URL` throw). */
function pathOf(target: string | undefined): string {
  try {
    return new URL(target ?? '/', 'http://relay').pathname;
  } catch {
    return '';
  }
}

/**
 * Browsers name the page that opens a WebSocket: only the app's pages may connect (see
 * RELAY_ALLOWED_ORIGINS above). Clients without the header are not browsers.
 */
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    if (allowedOrigins.length)
      return allowedOrigins.includes('*') || allowedOrigins.includes(new URL(origin).origin);
    return new URL(origin).hostname === new URL(`http://${req.headers.host ?? ''}`).hostname;
  } catch {
    return false;
  }
}

/** The client's address: from the proxy's header when configured (its last entry). */
function addressOf(req: IncomingMessage): string {
  const header = addressHeader ? req.headers[addressHeader] : undefined;
  const value = Array.isArray(header) ? header[header.length - 1] : header;
  return value?.split(',').pop()?.trim() || req.socket.remoteAddress || 'unknown';
}

function refuse(socket: Duplex, status: string): void {
  socket.once('finish', () => socket.destroy());
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

const server = createServer((req, res) => {
  const pathname = pathOf(req.url);
  if (req.method === 'GET' && roomOfPath(pathname) === '') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(PROBE_BODY);
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true, maxPayload: RELAY_LIMITS.frameChars + 1024 });
server.on('upgrade', (req, socket, head) => {
  const id = roomOfPath(pathOf(req.url));
  if (!id) {
    socket.destroy();
    return;
  }
  if (!originAllowed(req)) {
    refuse(socket, '403 Forbidden');
    return;
  }
  const address = addressOf(req);
  const fromAddress = perAddress.get(address) ?? 0;
  if (connections >= limits.connections || fromAddress >= limits.perAddress) {
    // The browser tries again later.
    refuse(socket, '503 Service Unavailable');
    return;
  }
  // Counted for as long as the connection lasts, handshake included.
  connections++;
  perAddress.set(address, fromAddress + 1);
  socket.once('close', () => {
    connections--;
    const left = (perAddress.get(address) ?? 1) - 1;
    if (left) perAddress.set(address, left);
    else perAddress.delete(address);
  });
  wss.handleUpgrade(req, socket, head, (ws) => enter(id, ws));
});

// Connections that stop answering pings are dropped, so the others see them leave.
setInterval(() => {
  for (const room of rooms.values()) {
    for (const peer of room.peers.values()) {
      if (!peer.alive) {
        peer.ws.terminate();
        continue;
      }
      peer.alive = false;
      peer.ws.ping();
    }
  }
}, 30_000).unref();

/** Rooms unchanged for 30 days and empty are deleted. */
function sweep(): void {
  const old = Date.now() - RELAY_LIMITS.keepMs;
  for (const [id, room] of rooms) if (!room.peers.size && room.changedAt < old) forget(id, room);
  if (!dataDir) return;
  for (const name of readdirSync(dataDir)) {
    const path = join(dataDir, name);
    try {
      if (!rooms.has(name.replace(/\.room$/, '')) && statSync(path).mtimeMs < old) rmSync(path);
    } catch {
      // Removed meanwhile.
    }
  }
}
sweep();
setInterval(sweep, 3_600_000).unref();

server.listen(port, () => console.log(`GrafcetMaker live relay on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    wss.clients.forEach((ws) => ws.close(1001, 'relay stopping'));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
