/**
 * A live session in this browser: keeps the open project in step with the others in the room.
 * Loaded on demand (see liveStore.ts).
 *
 * Edits: local changes are diffed against the project the records last described and sent as new
 * register versions (core/collab/records.ts), at most every 50 ms so that drags stream. Incoming
 * records are merged, and the project they describe replaces the document without touching the
 * undo history. While simulating, incoming changes wait, so the diagram keeps matching the
 * simulation, until it stops or restarts with them.
 *
 * Presence (pointer, selection, grafcet on screen, element edited, simulating) goes out at most
 * every 80 ms as droppable messages, and again when someone joins.
 *
 * Connection: a WebSocket to the relay at api/room/<id> (worker/room.ts), reconnecting with
 * backoff. On (re)connecting, this side sends its full state asking for theirs, and one of the
 * others answers, so changes made offline merge both ways. The participant with the lowest relay
 * id stores the sealed room snapshot for latecomers, 2 s after changes settle. The records are
 * also kept in IndexedDB, so a reload rejoins with offline edits intact.
 */
import i18next from 'i18next';
import { RecordStore } from '@/core/collab/records';
import { formatRoomHash, ROOM_PREFIX, type RoomLink } from '@/core/collab/link';
import {
  importRoomKey,
  MAX_SEALED_CHARS,
  message,
  newRoomId,
  newRoomKey,
  readMessage,
  seal,
  unseal,
  type Message,
  type Presence,
} from '@/core/collab/wire';
import { SCHEMA_VERSION } from '@/core/model/constants';
import type { Project } from '@/core/model/types';
import { reloadSimulation, useSim } from '@/editor/simulation/simStore';
import { doc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { CLOSE_REFUSED, PING } from '../../../worker/room';
import { showDialog } from '../dialogs/dialogStore';
import { db, safely } from '../persistence/db';
import { openLiveProject } from '../persistence/session';
import { usePrefs } from '../prefs';
import { toast } from '../toasts';
import { clientId, rememberTabRoom, useLive } from './liveState';

const t = i18next.t.bind(i18next);

const FLUSH_MS = 50;
const PRESENCE_MS = 80;
const SNAPSHOT_MS = 2000;
const PERSIST_MS = 1000;
const PING_MS = 25_000;
const JOIN_TIMEOUT_MS = 10_000;
/** Presence waits while this much is still queued on the connection. */
const BUSY_BYTES = 256 * 1024;

export type LiveError = 'brokenLink' | 'notFound' | 'failed' | 'newer' | 'full' | 'tooLarge';

export function showLiveError(code: LiveError): void {
  void showDialog({
    title: t('live.errors.title'),
    message: t(`live.errors.${code}`),
    actions: [{ id: 'ok', label: t('common.ok'), variant: 'primary' }],
    cancelId: 'ok',
  });
}

/** The room in the address bar (a reload rejoins) and in this tab's memory. */
function setRoomHash(link: RoomLink | null): void {
  rememberTabRoom(link?.id ?? null);
  const base = location.pathname + location.search;
  if (link) history.replaceState(null, '', base + formatRoomHash(link));
  else if (location.hash.startsWith(ROOM_PREFIX)) history.replaceState(null, '', base);
}

let active: LiveSession | null = null;

class LiveSession {
  readonly link: RoomLink;
  private readonly key: CryptoKey;
  private readonly store: RecordStore;
  /** The room's project id (null until known when joining). */
  private pid: string | null;
  private ws: WebSocket | null = null;
  /** This participant's relay id, while connected. */
  private me: string | null = null;
  private readonly peers = new Set<string>();
  /** The project the records last described (null until attached to the document). */
  private synced: Project | null = null;
  private generation = 0;
  private closed = false;
  /** Simulating: incoming changes wait. */
  private holding = false;
  private readonly heldFrom = new Set<string>();
  private applying = false;
  connectedOnce = false;
  private retries = 0;
  /** Incoming frames are handled one after the other (opening them is asynchronous). */
  private frames: Promise<void> = Promise.resolve();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private applyFrame: number | null = null;
  private lastPresence = '';
  private warnedLarge = false;
  private readonly cleanups: (() => void)[] = [];
  /** Why joining failed, when it did. */
  failure: LiveError | null = null;
  /** Resolves when the room's state is in (true), or when there is none (false). */
  readonly initial: Promise<boolean>;
  private settle!: (ok: boolean) => void;
  /** Joined with records kept from an earlier visit (they may hold edits made offline). */
  private readonly rejoining: boolean;

  constructor(link: RoomLink, key: CryptoKey, store: RecordStore, pid: string | null) {
    this.link = link;
    this.key = key;
    this.store = store;
    this.pid = pid;
    this.rejoining = store.size > 0;
    this.initial = new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  // ---- Timers: `later` runs once within `ms` (throttle), `restart` after `ms` of quiet. ----

  private later(name: string, ms: number, fn: () => void): void {
    if (this.timers.has(name)) return;
    this.timers.set(
      name,
      setTimeout(() => {
        this.timers.delete(name);
        fn();
      }, ms),
    );
  }

  private restart(name: string, ms: number, fn: () => void): void {
    this.clear(name);
    this.later(name, ms, fn);
  }

  private clear(name: string): void {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
  }

  // ---- Connection ----

  connect(): void {
    if (this.closed || this.ws) return;
    this.clear('connect');
    useLive.setState({ status: this.connectedOnce ? 'reconnecting' : 'connecting' });
    const url = new URL(`api/room/${this.link.id}`, document.baseURI);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.retry();
      return;
    }
    this.ws = ws;
    ws.onmessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      const frame = e.data;
      this.frames = this.frames.then(() => this.onFrame(frame)).catch(() => undefined);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.me = null;
      this.peers.clear();
      clearInterval(this.pingTimer);
      useLive.setState({ peers: {} });
      // Refused (room full): the error frame before said why.
      if (!this.closed && e.code !== CLOSE_REFUSED) this.retry();
    };
  }

  private retry(): void {
    if (this.closed) return;
    useLive.setState({ status: this.connectedOnce ? 'reconnecting' : 'connecting' });
    const delay = Math.min(30_000, 1000 * 2 ** this.retries) * (0.5 + Math.random() / 2);
    this.retries++;
    this.restart('connect', delay, () => this.connect());
  }

  private readonly onOnline = () => {
    if (!this.ws) this.connect();
  };

  private readonly onHide = () => {
    this.flushLocal();
    void this.persist();
  };

  /** Seals and sends; changes too large for one message are split. */
  private async send(kind: 'm' | 'v' | 'to', msg: Message, to?: string): Promise<void> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || !this.me) return;
    if (kind === 'v' && ws.bufferedAmount > BUSY_BYTES) return;
    const d = await seal(this.key, msg);
    if (d.length > MAX_SEALED_CHARS) {
      if (msg.type !== 'presence' && msg.records.length > 1) {
        const half = Math.ceil(msg.records.length / 2);
        const part = (records: unknown[]): Message => ({ ...msg, records });
        await this.send(kind, part(msg.records.slice(0, half)), to);
        await this.send(kind, part(msg.records.slice(half)), to);
      }
      return;
    }
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify(kind === 'to' ? { t: 'to', p: to, d } : { t: kind, d }));
  }

  private async onFrame(frame: string): Promise<void> {
    if (this.closed) return;
    let f: Record<string, unknown>;
    try {
      f = JSON.parse(frame) as Record<string, unknown>;
    } catch {
      return;
    }
    const id = typeof f.id === 'string' ? f.id : null;
    switch (f.t) {
      case 'hello': {
        this.me = id;
        this.peers.clear();
        if (Array.isArray(f.peers))
          for (const p of f.peers) if (typeof p === 'string') this.peers.add(p);
        this.retries = 0;
        this.connectedOnce = true;
        useLive.setState({
          status: 'connected',
          peers: Object.fromEntries([...this.peers].map((p) => [p, null])),
        });
        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(PING);
        }, PING_MS);
        // The stored snapshot first: whatever this side stores later includes it.
        if (typeof f.snapshot === 'string') await this.receive(f.snapshot, null);
        // Our own state (edits made offline included) and a request for theirs.
        const own = this.synced !== null || this.rejoining;
        await this.send(
          'm',
          message({
            type: 'sync',
            pid: this.pid,
            records: own ? this.store.all() : [],
            want: true,
          }),
        );
        if (this.synced) this.pushPresence(true);
        const hasState = this.pid !== null && this.store.size > 0;
        if (!this.peers.size) {
          // Alone: the room's state is ours (a new room, or everyone else is away).
          this.settle(hasState);
          if (hasState) void this.writeSnapshot();
        } else if (hasState) this.settle(true);
        return;
      }
      case 'join':
        if (!id) return;
        this.peers.add(id);
        useLive.setState((s) => ({ peers: { ...s.peers, [id]: null } }));
        if (this.synced) this.pushPresence(true);
        return;
      case 'leave':
        if (!id) return;
        this.peers.delete(id);
        this.heldFrom.delete(id);
        useLive.setState((s) => {
          const peers = { ...s.peers };
          delete peers[id];
          return { peers };
        });
        if (this.isLeader()) this.scheduleSnapshot();
        return;
      case 'm':
      case 'v':
        if (typeof f.d === 'string')
          await this.receive(f.d, typeof f.from === 'string' ? f.from : null);
        return;
      case 'error':
        if (f.code === 'full') this.fail('full');
        else if (f.code === 'rate')
          // Some messages were dropped: everyone gets our whole state again in a moment.
          this.restart('resync', 10_000, () => {
            void this.send(
              'm',
              message({ type: 'sync', pid: this.pid, records: this.store.all(), want: false }),
            );
          });
    }
  }

  /** An opened message from `from` (null: the stored snapshot). */
  private async receive(data: string, from: string | null): Promise<void> {
    let msg: Message | 'newer' | null;
    try {
      msg = readMessage(await unseal(this.key, data));
    } catch {
      // Not sealed with this room's key, or altered: ignored.
      return;
    }
    if (msg === 'newer') {
      this.fail('newer');
      return;
    }
    if (!msg || this.closed) return;
    switch (msg.type) {
      case 'presence':
        if (from && this.peers.has(from))
          useLive.setState((s) => ({ peers: { ...s.peers, [from]: msg.presence } }));
        return;
      case 'changes':
        this.mergeRemote(msg.records, from);
        return;
      case 'sync':
        if (msg.pid && (this.pid === null || msg.pid === this.pid)) {
          this.pid ??= msg.pid;
          this.mergeRemote(msg.records, from);
          if (this.store.size) this.settle(true);
        }
        if (from && msg.want && this.answers(from))
          await this.send(
            'to',
            message({ type: 'sync', pid: this.pid, records: this.store.all(), want: false }),
            from,
          );
    }
  }

  /**
   * The lowest relay id among those in the session (not those still joining, who have not shown
   * their presence yet): answers requests for the state and stores the snapshot. Two leaders at
   * once (a presence message lost) only send the same state twice.
   */
  private leads(except?: string): boolean {
    if (!this.synced || !this.me) return false;
    const known = useLive.getState().peers;
    return [...this.peers].every((p) => p === except || !known[p] || this.me! < p);
  }

  private answers(from: string): boolean {
    return this.leads(from);
  }

  private isLeader(): boolean {
    return this.leads();
  }

  private fail(code: LiveError): void {
    if (!this.synced) {
      this.failure = code;
      this.settle(false);
      return;
    }
    void this.leave('failed');
    showLiveError(code);
  }

  // ---- Records ----

  private mergeRemote(records: unknown[], from: string | null): void {
    if (this.synced) this.flushLocal();
    if (!this.store.merge(records)) return;
    this.restart('persist', PERSIST_MS, () => void this.persist());
    if (this.isLeader()) this.scheduleSnapshot();
    if (!this.synced) return;
    if (this.holding) {
      if (from) this.heldFrom.add(from);
      const peers = useLive.getState().peers;
      const names = [...new Set([...this.heldFrom].map((p) => peers[p]?.name || t('live.guest')))];
      useLive.setState({ held: names.length ? names : [t('live.guest')] });
      return;
    }
    if (this.applyFrame === null)
      this.applyFrame = requestAnimationFrame(() => {
        this.applyFrame = null;
        this.applyNow();
      });
  }

  /** Shows the merged project (local edits are sent first, so none is overwritten). */
  private applyNow(): void {
    if (!this.synced || this.holding || this.closed) return;
    this.flushLocal();
    this.show(this.store.derive(doc.store.getState().project));
  }

  private show(next: Project): void {
    this.synced = next;
    if (next === doc.store.getState().project) return;
    this.applying = true;
    try {
      doc.applyRemote(next);
    } finally {
      this.applying = false;
    }
  }

  /** Sends the local edits made since the last call. */
  private flushLocal(): Promise<void> {
    this.clear('flush');
    if (!this.synced || this.closed) return Promise.resolve();
    const current = doc.store.getState().project;
    if (current === this.synced) return Promise.resolve();
    const changes = this.store.commitLocal(this.synced, current);
    this.synced = current;
    if (!changes.length) return Promise.resolve();
    this.restart('persist', PERSIST_MS, () => void this.persist());
    if (this.isLeader()) this.scheduleSnapshot();
    // The records may show a little more than the edit (e.g. a name it freed was taken by
    // someone else's variable, hidden until now).
    if (!this.holding) this.show(this.store.derive(current));
    return this.send('m', message({ type: 'changes', records: changes }));
  }

  private scheduleSnapshot(): void {
    this.restart('snapshot', SNAPSHOT_MS, () => void this.writeSnapshot());
  }

  /** Stores the sealed room state on the relay for whoever joins next. */
  private async writeSnapshot(): Promise<void> {
    const ws = this.ws;
    if (!ws || !this.isLeader() || this.pid === null || !this.store.size) return;
    const d = await seal(
      this.key,
      message({ type: 'sync', pid: this.pid, records: this.store.all(), want: false }),
    );
    if (d.length > MAX_SEALED_CHARS) {
      if (!this.warnedLarge) toast(t('live.snapshotTooLarge'), 'warning', 10_000);
      this.warnedLarge = true;
      return;
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 's', d }));
  }

  async persist(): Promise<void> {
    if (this.closed || this.pid === null) return;
    const pid = this.pid;
    await safely(() =>
      db.rooms.put({ id: this.link.id, pid, records: this.store.all(), savedAt: Date.now() }),
    );
  }

  /** The room's project, as the records describe it (joining). */
  project(): Project {
    const base: Project = {
      schemaVersion: SCHEMA_VERSION,
      id: this.pid!,
      name: t('file.untitled'),
      meta: { author: '', company: '', revision: '', createdAt: '', updatedAt: '' },
      variables: {},
      grafcets: {},
      grafcetOrder: [],
    };
    return this.store.derive(base);
  }

  // ---- Presence ----

  private presence(): Presence {
    const ui = useUi.getState();
    const cursor = useLive.getState().cursor;
    return {
      cid: clientId(),
      name: usePrefs.getState().liveName.trim().slice(0, 40),
      g: ui.activeGrafcetId,
      c: cursor && cursor.g === ui.activeGrafcetId ? cursor.at : null,
      sel: Object.keys(ui.selection).slice(0, 500),
      ed: ui.editing?.id ?? null,
      sim: useSim.getState().on,
    };
  }

  private queuePresence(): void {
    this.later('presence', PRESENCE_MS, () => this.pushPresence(false));
  }

  /** Sends the presence when it changed, or always (someone joined). */
  private pushPresence(always: boolean): void {
    const p = this.presence();
    const key = JSON.stringify(p);
    if (!always && key === this.lastPresence) return;
    this.lastPresence = key;
    void this.send('v', message({ type: 'presence', presence: p }));
  }

  // ---- Life cycle ----

  /** Starts following the open document (which must be the room's project). */
  attach(): void {
    const state = doc.store.getState();
    this.synced = state.project;
    this.generation = state.generation;
    this.holding = useSim.getState().on;
    this.cleanups.push(
      doc.store.subscribe((s, prev) => {
        // Another project was opened: the session ends, the room goes on without us.
        if (s.generation !== this.generation) void this.leave('replaced');
        else if (s.project !== prev.project && !this.applying)
          this.later('flush', FLUSH_MS, () => void this.flushLocal());
      }),
      useSim.subscribe((s, prev) => {
        if (s.on === prev.on) return;
        this.holding = s.on;
        if (!s.on) this.release();
        this.queuePresence();
      }),
      useUi.subscribe((s, prev) => {
        if (
          s.activeGrafcetId !== prev.activeGrafcetId ||
          s.selection !== prev.selection ||
          s.editing !== prev.editing
        )
          this.queuePresence();
      }),
      useLive.subscribe((s, prev) => {
        if (s.cursor !== prev.cursor) this.queuePresence();
      }),
      usePrefs.subscribe((s, prev) => {
        if (s.liveName !== prev.liveName) this.queuePresence();
      }),
    );
    window.addEventListener('online', this.onOnline);
    window.addEventListener('pagehide', this.onHide);
    this.applyNow();
    this.queuePresence();
  }

  /** The simulation stopped (or restarts): the others' changes come in. */
  private release(): void {
    this.heldFrom.clear();
    useLive.setState({ held: null });
    this.applyNow();
  }

  async restartWithChanges(): Promise<void> {
    this.holding = false;
    this.release();
    this.holding = useSim.getState().on;
    await reloadSimulation();
  }

  async leave(reason: 'user' | 'replaced' | 'failed'): Promise<void> {
    if (this.closed) return;
    // The last edits go out first.
    if (reason !== 'replaced') await this.flushLocal();
    this.closed = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    clearInterval(this.pingTimer);
    if (this.applyFrame !== null) cancelAnimationFrame(this.applyFrame);
    for (const off of this.cleanups.splice(0)) off();
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('pagehide', this.onHide);
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000, 'left');
    this.settle(false);
    if (active === this) active = null;
    // Leaving on purpose forgets the room on this device; the project stays open as a copy.
    if (reason !== 'failed') await safely(() => db.rooms.delete(this.link.id));
    setRoomHash(null);
    useLive.setState({ status: 'off', link: null, peers: {}, held: null });
    if (reason === 'replaced') toast(t('live.left'), 'info', 6000);
  }
}

/** Starts a room with the open project. */
export async function startSession(): Promise<void> {
  if (active) return;
  const link: RoomLink = { id: newRoomId(), key: await newRoomKey() };
  const project = doc.store.getState().project;
  const s = new LiveSession(
    link,
    await importRoomKey(link.key),
    RecordStore.fromProject(project),
    project.id,
  );
  active = s;
  setRoomHash(link);
  useLive.setState({ link: location.href, status: 'connecting', invite: null });
  s.attach();
  s.connect();
  await s.persist();
}

export async function joinSession(link: RoomLink): Promise<void> {
  if (active?.link.id === link.id) return;
  if (active) await active.leave('user');
  let key: CryptoKey;
  try {
    key = await importRoomKey(link.key);
  } catch {
    showLiveError('brokenLink');
    return;
  }
  // Records kept from an earlier visit (a reload): edits made offline are not lost.
  const saved = await safely(() => db.rooms.get(link.id));
  const store = new RecordStore();
  if (saved) store.merge(saved.records);
  const s = new LiveSession(link, key, store, saved?.pid ?? null);
  active = s;
  setRoomHash(link);
  useLive.setState({ link: location.href, status: 'connecting', invite: null });
  s.connect();
  const timeout = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), JOIN_TIMEOUT_MS),
  );
  const ok = await Promise.race([s.initial, timeout]);
  if (!ok || active !== s) {
    if (active !== s) return;
    const code = s.failure ?? (s.connectedOnce ? 'notFound' : 'failed');
    await s.leave('failed');
    showLiveError(code);
    return;
  }
  if (!(await openLiveProject(s.project()))) {
    await s.leave('user');
    return;
  }
  if (active !== s) return;
  s.attach();
  await s.persist();
}

export async function leaveSession(): Promise<void> {
  await active?.leave('user');
}

export async function restartWithChanges(): Promise<void> {
  await active?.restartWithChanges();
}
