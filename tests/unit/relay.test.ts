import { afterEach, describe, expect, it, vi } from 'vitest';
import { roomWriteToken, newRoomKey } from '@/core/collab/wire';
import { CollabRoom } from '../../worker/collab';
import { newRate, parseIncoming, rateCheck, RELAY_LIMITS } from '../../worker/room';

afterEach(() => vi.useRealTimers());

describe('relay limits', () => {
  it('limit frames and characters per window, and say so once', () => {
    const rate = newRate(0);
    expect(rateCheck(rate, 0, RELAY_LIMITS.charsPerWindow - 10)).toBe('ok');
    expect(rateCheck(rate, 1, 20)).toBe('refuse');
    expect(rateCheck(rate, 2, 1)).toBe('ok');
    expect(rateCheck(rate, 3, 20)).toBe('drop');
    // A new window starts afresh.
    expect(rateCheck(rate, RELAY_LIMITS.windowMs, 1000)).toBe('ok');
    for (let i = 1; i < RELAY_LIMITS.framesPerWindow; i++)
      rateCheck(rate, RELAY_LIMITS.windowMs, 1);
    expect(rateCheck(rate, RELAY_LIMITS.windowMs, 1)).toBe('refuse');
  });

  it('read the write token of snapshot frames', () => {
    expect(parseIncoming('{"t":"s","d":"abc","w":"tok"}')).toEqual({ t: 's', d: 'abc', w: 'tok' });
    expect(parseIncoming('{"t":"s","d":"abc"}')).toEqual({ t: 's', d: 'abc' });
    expect(parseIncoming(JSON.stringify({ t: 's', d: 'abc', w: 'x'.repeat(65) }))).toBeNull();
    expect(parseIncoming('{"t":"s","d":"abc","w":5}')).toBeNull();
  });
});

/** A Durable Object room over in-memory storage, with sockets that record what they are sent. */
function fakeRoom() {
  const data = new Map<string, unknown>();
  const puts: Record<string, unknown>[] = [];
  let alarm: number | null = null;
  const sockets: ReturnType<typeof socket>[] = [];
  const socket = (id: string) => ({
    readyState: 1,
    sent: [] as string[],
    send(frame: string) {
      this.sent.push(frame);
    },
    close: () => undefined,
    serializeAttachment: () => undefined,
    deserializeAttachment: () => ({ id }),
  });
  const ctx = {
    storage: {
      get: async (key: string) => data.get(key),
      put: async (entries: Record<string, unknown>) => {
        puts.push(entries);
        for (const [k, v] of Object.entries(entries)) data.set(k, v);
      },
      deleteAll: async () => data.clear(),
      setAlarm: async (at: number) => {
        alarm = at;
      },
    },
    getWebSockets: () => sockets,
  };
  const room = new CollabRoom(ctx as never, {});
  const join = (id: string) => {
    const ws = socket(id);
    sockets.push(ws);
    return ws;
  };
  const leave = (ws: ReturnType<typeof socket>) => sockets.splice(sockets.indexOf(ws), 1);
  return { room, data, puts, join, leave, alarm: () => alarm };
}

describe('Durable Object room snapshots', () => {
  it('are kept only for the holders of the write token, and written at most every 5 s', async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const { room, data, puts, join, alarm } = fakeRoom();
    const ws = join('a');
    const token = await roomWriteToken(await newRoomKey());
    const snapshot = (d: string, w?: string) =>
      room.webSocketMessage(ws as never, JSON.stringify({ t: 's', d, w }));

    await snapshot('one', token);
    expect(data.get('snapshot')).toBe('one');
    expect(typeof data.get('auth')).toBe('string');
    // Another token, or none, is refused.
    await snapshot('forged', await roomWriteToken(await newRoomKey()));
    await snapshot('forged');
    expect(ws.sent.filter((f) => f.includes('denied'))).toHaveLength(2);
    // Within 5 s, the newest waits for the alarm.
    await snapshot('two', token);
    await snapshot('three', token);
    expect(puts).toHaveLength(1);
    expect(alarm()).toBe(1_000_000 + 5000);
    vi.setSystemTime(1_000_000 + 5000);
    await room.alarm();
    expect(puts).toHaveLength(2);
    expect(data.get('snapshot')).toBe('three');
    expect(alarm()).toBe(1_005_000 + RELAY_LIMITS.keepMs);
    // Someone leaving writes what waits.
    vi.setSystemTime(1_006_000);
    await snapshot('four', token);
    await room.webSocketClose(ws as never, 1000);
    expect(data.get('snapshot')).toBe('four');
  });

  it('keep rooms from before write tokens open until a token claims them', async () => {
    const { room, data, join } = fakeRoom();
    data.set('snapshot', 'old');
    const ws = join('a');
    await room.webSocketMessage(ws as never, JSON.stringify({ t: 's', d: 'plain' }));
    expect(data.get('snapshot')).toBe('plain');
    expect(data.has('auth')).toBe(false);
  });

  it('forget a room 30 days after its last snapshot', async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const { room, data, join, leave, alarm } = fakeRoom();
    const ws = join('a');
    await room.webSocketMessage(ws as never, '{"t":"s","d":"x"}');
    leave(ws);
    // An earlier alarm (set for a waiting write, lost when the object was evicted) keeps it.
    await room.alarm();
    expect(data.get('snapshot')).toBe('x');
    expect(alarm()).toBe(1_000_000 + RELAY_LIMITS.keepMs);
    vi.setSystemTime(1_000_000 + RELAY_LIMITS.keepMs);
    await room.alarm();
    expect(data.size).toBe(0);
  });
});
