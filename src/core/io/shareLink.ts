/**
 * Share links: a whole project in the URL fragment, `#share=<data>`, where data is the compact
 * project JSON compressed with raw DEFLATE and encoded as base64url. The fragment never reaches
 * the server, so links work on any host, offline and on-premise. A link is untrusted input like
 * any file: it is size-capped while inflating and goes through parseProjectFile (migrations, Zod).
 */
import { LIMITS } from '../model/constants';
import type { Project } from '../model/types';
import { BytesLimitError, fromBase64Url, pipeBytes, toBase64Url } from './bytes';
import { ProjectFileError, parseProjectFile, serializeProject } from './projectFile';

export const SHARE_PREFIX = '#share=';

/** Longest fragment accepted (browsers cap URLs at about 2 MB anyway). */
const MAX_LINK_CHARS = 2 * 1024 * 1024;

/** The `#share=…` fragment holding the project. */
export async function encodeShareHash(project: Project): Promise<string> {
  const json = new TextEncoder().encode(serializeProject(project, { compact: true }));
  return SHARE_PREFIX + toBase64Url(await pipeBytes(json, new CompressionStream('deflate-raw')));
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
    const json = await pipeBytes(
      fromBase64Url(data),
      new DecompressionStream('deflate-raw'),
      LIMITS.fileBytes,
    );
    text = new TextDecoder('utf-8', { fatal: true }).decode(json);
  } catch (e) {
    if (e instanceof BytesLimitError)
      throw new ProjectFileError('tooLarge', `Project is larger than ${LIMITS.fileBytes} bytes`);
    // The decoder's own message ("atob failed", "incorrect header") would not help the user.
    throw new ProjectFileError('brokenLink', 'Share link is damaged or incomplete');
  }
  return parseProjectFile(text);
}
