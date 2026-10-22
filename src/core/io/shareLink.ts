/**
 * Share links: a whole project in the URL fragment, `#share=<data>`, where data is the compact
 * project JSON compressed with raw DEFLATE and encoded as base64url. The fragment never reaches
 * the server, so links work on any host, offline and on-premise. A link is untrusted input like
 * any file: it is size-capped while inflating and goes through parseProjectFile (migrations, Zod).
 */
import { LIMITS } from '../model/constants';
import type { Project } from '../model/types';
import { ProjectFileError, parseProjectFile, serializeProject } from './projectFile';

export const SHARE_PREFIX = '#share=';

/** Longest fragment accepted (browsers cap URLs at about 2 MB anyway). */
const MAX_LINK_CHARS = 2 * 1024 * 1024;

/** Runs bytes through a (de)compression stream; stops with tooLarge beyond `max` output bytes. */
async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  max = Infinity,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Errors surface on the reading side; the writer's copy must not become an unhandled rejection.
  writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new ProjectFileError('tooLarge', `Project is larger than ${max} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  if (!/^[\w-]+$/.test(text)) throw new Error('not base64url');
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** The `#share=…` fragment holding the project. */
export async function encodeShareHash(project: Project): Promise<string> {
  const json = new TextEncoder().encode(serializeProject(project, { compact: true }));
  return SHARE_PREFIX + toBase64Url(await transform(json, new CompressionStream('deflate-raw')));
}

/**
 * The project in a `#share=…` fragment. Throws ProjectFileError: brokenLink when the data was
 * cut off or altered, otherwise the codes of parseProjectFile (newerVersion, invalid, …).
 */
export async function decodeShareHash(hash: string): Promise<Project> {
  const data = hash.startsWith(SHARE_PREFIX) ? hash.slice(SHARE_PREFIX.length) : '';
  if (!data || data.length > MAX_LINK_CHARS) {
    throw new ProjectFileError('brokenLink', 'Share link is empty or too long');
  }
  let text: string;
  try {
    const json = await transform(
      fromBase64Url(data),
      new DecompressionStream('deflate-raw'),
      LIMITS.fileBytes,
    );
    text = new TextDecoder('utf-8', { fatal: true }).decode(json);
  } catch (e) {
    if (e instanceof ProjectFileError) throw e;
    // The decoder's own message ("atob failed", "incorrect header") would not help the user.
    throw new ProjectFileError('brokenLink', 'Share link is damaged or incomplete');
  }
  return parseProjectFile(text);
}
