/**
 * Live session links and messages. A room link is `#room=<id>,<key>`: the key exists only in the
 * fragment, which browsers never send to a server. Every message is JSON, compressed when large,
 * then sealed with AES-GCM (128-bit key, random 96-bit IV per message), so the relay forwards and
 * stores ciphertext only. Opened messages are untrusted: they are size-capped and checked here,
 * and their records again field by field when merged (records.ts).
 */
import { z } from 'zod';
import { LIMITS, SCHEMA_VERSION } from '../model/constants';
import { fromBase64Url, pipeBytes, toBase64Url } from '../io/bytes';

export { formatRoomHash, parseRoomHash, ROOM_PREFIX, type RoomLink } from './link';

/** Version of the message format below; peers ignore messages of a newer one. */
export const PROTOCOL = 1;

/** Largest sealed message (the relays refuse anything bigger). */
export const MAX_SEALED_CHARS = 1024 * 1024;
/** Largest opened message: a full state is about twice its project file. */
const MAX_OPEN_BYTES = 4 * LIMITS.fileBytes;
/** Messages longer than this are compressed before sealing. */
const COMPRESS_FROM = 1024;

/** 20 random characters of [0-9a-z] (103 bits). */
export function newRoomId(): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  let id = '';
  while (id.length < 20) {
    for (const b of crypto.getRandomValues(new Uint8Array(24))) {
      // 252 = 7 × 36: dropping 252–255 keeps every character equally likely.
      if (b < 252 && id.length < 20) id += alphabet[b % 36];
    }
  }
  return id;
}

export async function newRoomKey(): Promise<string> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, true, [
    'encrypt',
    'decrypt',
  ]);
  return toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export function importRoomKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64Url(key), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

/** JSON → (deflate when large) → AES-GCM → base64url of IV and ciphertext. */
export async function seal(key: CryptoKey, message: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(message));
  const compress = json.length >= COMPRESS_FROM;
  const body = compress ? await pipeBytes(json, new CompressionStream('deflate-raw')) : json;
  const plain = new Uint8Array(body.length + 1);
  plain[0] = compress ? 1 : 0;
  plain.set(body, 1);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(12 + sealed.length);
  out.set(iv);
  out.set(sealed, 12);
  return toBase64Url(out);
}

/** The message sealed in `data`; throws when it was altered, sealed with another key or too big. */
export async function unseal(key: CryptoKey, data: string): Promise<unknown> {
  if (data.length > MAX_SEALED_CHARS) throw new Error('message too large');
  const bytes = fromBase64Url(data);
  if (bytes.length < 13) throw new Error('message too short');
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.subarray(0, 12) },
      key,
      bytes.subarray(12),
    ),
  );
  const body = plain.subarray(1);
  const json =
    plain[0] === 1
      ? await pipeBytes(body, new DecompressionStream('deflate-raw'), MAX_OPEN_BYTES)
      : body;
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json)) as unknown;
}

const id = z.string().min(1).max(LIMITS.idLength);
const point = z.object({ x: z.number(), y: z.number() });
/** Records are checked one by one when merged; here only their number is capped. */
const records = z.array(z.unknown()).max(500_000);

/** What each participant shows the others (sent often, may be dropped). */
export const presenceSchema = z.object({
  /** Stable per device: picks the participant's color. */
  cid: z.string().min(1).max(64),
  name: z.string().max(40),
  /** Grafcet on screen, the pointer on it (diagram units), selection and element being edited. */
  g: id.nullable(),
  c: point.nullable(),
  sel: z.array(id).max(500),
  ed: id.nullable(),
  /** Simulating (they do not see changes until they restart). */
  sim: z.boolean(),
});

export type Presence = z.infer<typeof presenceSchema>;

const header = { p: z.literal(PROTOCOL), s: z.int() };

/**
 * sync: a full state (project id and every record; none and a null id from someone joining).
 * `want` asks the others for theirs: sent on joining and reconnecting. The stored snapshot is a
 * sync too. changes: records edited since.
 * presence: see presenceSchema.
 */
export const messageSchema = z.discriminatedUnion('type', [
  z.object({ ...header, type: z.literal('sync'), pid: id.nullable(), records, want: z.boolean() }),
  z.object({ ...header, type: z.literal('changes'), records }),
  z.object({ ...header, type: z.literal('presence'), presence: presenceSchema }),
]);

export type Message = z.infer<typeof messageSchema>;

/** A message without its version header (added by `message`). */
export type MessageBody<M = Message> = M extends Message ? Omit<M, 'p' | 's'> : never;

export function message(body: MessageBody): Message {
  return { p: PROTOCOL, s: SCHEMA_VERSION, ...body } as Message;
}

/**
 * Checks an opened message. `newer` means the sender runs a newer GrafcetMaker (file format or
 * message format), whose data this version must not merge.
 */
export function readMessage(raw: unknown): Message | 'newer' | null {
  if (typeof raw === 'object' && raw !== null) {
    const { p, s } = raw as { p?: unknown; s?: unknown };
    if ((typeof p === 'number' && p > PROTOCOL) || (typeof s === 'number' && s > SCHEMA_VERSION))
      return 'newer';
  }
  const parsed = messageSchema.safeParse(raw);
  return parsed.success && parsed.data.s === SCHEMA_VERSION ? parsed.data : null;
}
