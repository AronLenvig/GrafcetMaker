import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, EXAMPLES } from '@/app/examples/examples';
import { ProjectFileError } from '@/core/io/projectFile';
import { decodeShareHash, encodeShareHash, SHARE_PREFIX } from '@/core/io/shareLink';
import { SCHEMA_VERSION } from '@/core/model/schema';

/** A share fragment holding arbitrary text (what a hand-made or hostile link could contain). */
async function linkFor(text: string | Uint8Array<ArrayBuffer>): Promise<string> {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const deflated = new Uint8Array(await new Response(stream).arrayBuffer());
  const b64 = btoa(String.fromCharCode(...deflated));
  return SHARE_PREFIX + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function failure(hash: string): Promise<ProjectFileError> {
  const e: unknown = await decodeShareHash(hash).then(
    () => null,
    (err: unknown) => err,
  );
  expect(e).toBeInstanceOf(ProjectFileError);
  return e as ProjectFileError;
}

describe('share links', () => {
  it.each(EXAMPLE_IDS)('%s survives a link round trip unchanged', async (id) => {
    const p = EXAMPLES[id]();
    const hash = await encodeShareHash(p);
    expect(hash).toMatch(/^#share=[\w-]+$/);
    expect(await decodeShareHash(hash)).toEqual(p);
  });

  it('rejects cut-off, altered and empty links', async () => {
    const hash = await encodeShareHash(EXAMPLES.trafficLight());
    expect((await failure(hash.slice(0, hash.length / 2))).code).toBe('brokenLink');
    expect((await failure(`${hash.slice(0, 40)}%20${hash.slice(40)}`)).code).toBe('brokenLink');
    expect((await failure(SHARE_PREFIX)).code).toBe('brokenLink');
    expect((await failure('#help/index')).code).toBe('brokenLink');
  });

  it('checks the content like a file', async () => {
    expect((await failure(await linkFor('{"hello":1}'))).code).toBe('notProject');
    const newer = { ...EXAMPLES.trafficLight(), schemaVersion: SCHEMA_VERSION + 1 };
    expect((await failure(await linkFor(JSON.stringify(newer)))).code).toBe('newerVersion');
  });

  it('stops inflating a link bomb at the file size limit', async () => {
    const bomb = await linkFor(new Uint8Array(11 * 1024 * 1024));
    expect(bomb.length).toBeLessThan(30_000);
    expect((await failure(bomb)).code).toBe('tooLarge');
  });
});
