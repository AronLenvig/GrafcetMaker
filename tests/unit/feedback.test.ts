import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker';
import { handleFeedback, LIMITS, parseFeedback } from '../../worker/feedback';
import { SECURITY_HEADERS } from '../../worker/headers';

const env = { GITHUB_REPO: 'owner/feedback', GITHUB_TOKEN: 'secret' };
const SITE = 'https://grafcet.example';
const URL_ = `${SITE}/api/feedback`;

function post(body: unknown, origin = 'https://grafcet.example') {
  return new Request(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('feedback endpoint', () => {
  it('validates untrusted input', () => {
    const parse = (raw: unknown) => parseFeedback(raw, SITE);
    expect(parse({ kind: 'idea', message: '  More colours  ' })).toEqual({
      kind: 'idea',
      message: 'More colours',
      contact: '',
      details: '',
      link: '',
    });
    expect(parse(null)).toBe('expected an object');
    expect(parse({ kind: 'spam', message: 'x' })).toBe('unknown kind');
    expect(parse({ kind: 'idea', message: '   ' })).toBe('message missing or too long');
    expect(parse({ kind: 'idea', message: 'x'.repeat(5001) })).toBe('message missing or too long');
    expect(parse({ kind: 'idea', message: 'x', contact: 42 })).toBe('field too long');
  });

  it('accepts a project link only as a share link of this site', () => {
    const link = (l: unknown) => parseFeedback({ kind: 'problem', message: 'x', link: l }, SITE);
    expect(link(`${SITE}/fr/#share=q1_-Z`)).toMatchObject({ link: `${SITE}/fr/#share=q1_-Z` });
    // User info and query are dropped, so the issue links exactly the site's page.
    expect(link('https://me:pw@grafcet.example/en/?x=1#share=abc')).toMatchObject({
      link: `${SITE}/en/#share=abc`,
    });
    const refused = 'not a share link of this site';
    expect(link('https://evil.example/en/#share=abc')).toBe(refused);
    expect(link(`${SITE}/en/#live=abc`)).toBe(refused);
    expect(link(`${SITE}/en/#share=a)b`)).toBe(refused);
    expect(link('javascript:alert(1)//#share=abc')).toBe(refused);
    expect(link('not a url')).toBe(refused);
    expect(link(`${SITE}/#share=${'a'.repeat(LIMITS.link)}`)).toBe('field too long');
  });

  it('tells the app whether sending is available', async () => {
    expect(await (await handleFeedback(new Request(URL_), env)).json()).toEqual({ ok: true });
    expect(await (await handleFeedback(new Request(URL_), {})).json()).toEqual({
      ok: false,
    });
  });

  it('files an issue in the private repository', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleFeedback(
      post({ kind: 'problem', message: 'Undo lost\nsteps 3-4', contact: 'a@b.c' }),
      env,
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/owner/feedback/issues');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
    const issue = JSON.parse(init.body as string) as { title: string; body: string };
    expect(issue.title).toBe('[Problem] Undo lost');
    expect(issue.body).toContain('**Reply to:** a@b.c');
    expect(issue.body).not.toContain('**Project:**');
  });

  it('links the project in the issue, within the size GitHub accepts', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const prefix = `${SITE}/de/#share=`;
    const link = prefix + 'Ab9_-'.repeat(LIMITS.link).slice(0, LIMITS.link - prefix.length);
    const full = (n: keyof typeof LIMITS) => 'x'.repeat(LIMITS[n]);
    const res = await handleFeedback(
      post({
        kind: 'problem',
        message: full('message'),
        contact: full('contact'),
        details: full('details'),
        link,
      }),
      env,
    );
    expect(res.status).toBe(200);
    const { body } = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    ) as { body: string };
    expect(body).toContain(`**Project:** [open a copy in GrafcetMaker](<${link}>)`);
    expect(body.length).toBeLessThanOrEqual(65_536);
  });

  it('refuses other sites, bad bodies and an unconfigured endpoint without calling GitHub', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const ok = { kind: 'idea', message: 'x' };
    expect((await handleFeedback(post(ok, 'https://evil.example'), env)).status).toBe(403);
    expect((await handleFeedback(post('{nope'), env)).status).toBe(400);
    expect((await handleFeedback(post('x'.repeat(LIMITS.request + 1)), env)).status).toBe(413);
    expect((await handleFeedback(post(ok), {})).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes /api/feedback to the endpoint and everything else to the static app', async () => {
    const assets = vi.fn(async () => new Response('app'));
    const env2 = { ...env, ASSETS: { fetch: assets } };
    expect(await (await worker.fetch(new Request(URL_), env2)).json()).toEqual({ ok: true });
    expect(await (await worker.fetch(new Request('https://grafcet.example/'), env2)).text()).toBe(
      'app',
    );
    expect((await worker.fetch(new Request(URL_, { method: 'PUT' }), env2)).status).toBe(405);
  });

  it('sends the security headers, and keeps other sites from the endpoint and the relay', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const room = vi.fn(async () => new Response('room'));
    const env2 = {
      ...env,
      ASSETS: { fetch: async () => new Response('app') },
      ROOMS: { idFromName: (name: string) => name, get: () => ({ fetch: room }) },
    };
    const page = await worker.fetch(new Request('https://grafcet.example/'), env2 as never);
    for (const [name, value] of Object.entries(SECURITY_HEADERS))
      expect(page.headers.get(name)).toBe(value);
    const anonymous = new Request(URL_, { method: 'POST', body: '{"kind":"idea","message":"x"}' });
    expect((await handleFeedback(anonymous, env)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    const join = (origin: string) =>
      worker.fetch(
        new Request('https://grafcet.example/api/room/abcdefghij0123456789', {
          headers: { Origin: origin },
        }),
        env2 as never,
      );
    expect((await join('https://evil.example')).status).toBe(403);
    expect(await (await join('https://grafcet.example')).text()).toBe('room');
    expect(await (await join('http://localhost:5173')).text()).toBe('room');
    expect(room).toHaveBeenCalledTimes(2);
  });

  it('reports a failed delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 401 })),
    );
    const res = await handleFeedback(post({ kind: 'idea', message: 'x' }), env);
    expect(res.status).toBe(502);
  });
});
