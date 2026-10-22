import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker';
import { handleFeedback, parseFeedback } from '../../worker/feedback';

const env = { GITHUB_REPO: 'owner/feedback', GITHUB_TOKEN: 'secret' };
const URL_ = 'https://grafcet.example/api/feedback';

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
    expect(parseFeedback({ kind: 'idea', message: '  More colours  ' })).toEqual({
      kind: 'idea',
      message: 'More colours',
      contact: '',
      details: '',
    });
    expect(parseFeedback(null)).toBe('expected an object');
    expect(parseFeedback({ kind: 'spam', message: 'x' })).toBe('unknown kind');
    expect(parseFeedback({ kind: 'idea', message: '   ' })).toBe('message missing or too long');
    expect(parseFeedback({ kind: 'idea', message: 'x'.repeat(5001) })).toBe(
      'message missing or too long',
    );
    expect(parseFeedback({ kind: 'idea', message: 'x', contact: 42 })).toBe('field too long');
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
  });

  it('refuses other sites, bad bodies and an unconfigured endpoint without calling GitHub', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const ok = { kind: 'idea', message: 'x' };
    expect((await handleFeedback(post(ok, 'https://evil.example'), env)).status).toBe(403);
    expect((await handleFeedback(post('{nope'), env)).status).toBe(400);
    expect((await handleFeedback(post('x'.repeat(20_000)), env)).status).toBe(413);
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

  it('reports a failed delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 401 })),
    );
    const res = await handleFeedback(post({ kind: 'idea', message: 'x' }), env);
    expect(res.status).toBe(502);
  });
});
