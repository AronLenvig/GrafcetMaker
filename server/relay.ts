/**
 * Live collaboration relay for self-hosted and on-premise installs (the hosted site runs the same
 * protocol, worker/room.ts, as a Cloudflare Durable Object). It forwards each room's sealed
 * messages between the people in it and keeps the room's latest sealed snapshot. It never sees
 * project data: only the room link carries the key that opens it.
 *
 * Run with Node 22.18 or later (TypeScript runs as is) and the `ws` package:
 *   node server/relay.ts
 *   PORT            listening port (default 8081)
 *   RELAY_DATA_DIR  where snapshots are kept so rooms survive a restart (default: memory only)
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
import { createServer } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  CLOSE_REFUSED,
  forward,
  hello,
  newPeerId,
  parseIncoming,
  PONG,
  presenceEvent,
  PROBE_BODY,
  rateAllows,
  relayError,
  RELAY_LIMITS,
  roomOfPath,
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
  changedAt: number;
}

const port = Number(process.env.PORT ?? 8081);
const dataDir = process.env.RELAY_DATA_DIR || null;
if (dataDir) mkdirSync(dataDir, { recursive: true });

const rooms = new Map<string, Room>();
/** Room ids are 20 characters of [0-9a-z] (roomOfPath), safe as file names. */
const fileOf = (id: string) => join(dataDir!, `${id}.room`);

function openRoom(id: string): Room {
  let room = rooms.get(id);
  if (room) return room;
  room = { peers: new Map(), snapshot: null, changedAt: Date.now() };
  if (dataDir) {
    try {
      room.snapshot = readFileSync(fileOf(id), 'utf8');
      room.changedAt = statSync(fileOf(id)).mtimeMs;
    } catch {
      // A new room.
    }
  }
  rooms.set(id, room);
  return room;
}

function storeSnapshot(id: string, room: Room, snapshot: string): void {
  room.snapshot = snapshot;
  room.changedAt = Date.now();
  if (!dataDir) return;
  try {
    writeFileSync(`${fileOf(id)}.tmp`, snapshot);
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
  const peer: Peer = {
    id: newPeerId(),
    ws,
    rate: { windowStart: Date.now(), count: 0 },
    alive: true,
  };
  ws.send(hello(peer.id, [...room.peers.keys()], room.snapshot));
  for (const other of room.peers.values()) send(other, presenceEvent('join', peer.id));
  room.peers.set(peer.id, peer);

  ws.on('pong', () => {
    peer.alive = true;
  });
  ws.on('message', (data, isBinary) => {
    const frame = isBinary ? null : data.toString();
    if (frame === null || frame.length > RELAY_LIMITS.frameChars) {
      send(peer, relayError(frame === null ? 'bad' : 'tooLarge'));
      return;
    }
    if (!rateAllows(peer.rate, Date.now())) {
      if (peer.rate.count === RELAY_LIMITS.framesPerWindow + 1) send(peer, relayError('rate'));
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
        storeSnapshot(roomId, room, msg.d);
    }
  });
  ws.on('close', () => {
    room.peers.delete(peer.id);
    for (const other of room.peers.values()) send(other, presenceEvent('leave', peer.id));
    // With a data directory, an empty room lives on disk only.
    if (!room.peers.size && dataDir) rooms.delete(roomId);
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
  for (const [id, room] of rooms) if (!room.peers.size && room.changedAt < old) rooms.delete(id);
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
