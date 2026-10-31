/**
 * Anonymous feedback endpoint of the hosted site, served by the Cloudflare Worker (worker/index.ts)
 * at /api/feedback next to the static app (same origin, so the app's CSP stays
 * `connect-src 'self'`). Each message becomes an issue in a private GitHub repository: no email
 * address is published and senders need no account. Nothing is stored here and the sender's IP
 * address is not forwarded. A message may carry a share link to the sender's project (their choice
 * in the dialog), so the developers can open a copy of it.
 *
 * Settings:
 *   GITHUB_REPO       owner/name of the private repository that receives the issues (wrangler.jsonc)
 *   GITHUB_TOKEN      fine-grained token with "Issues: read and write" on that repository only
 *                     (secret: Worker › Settings › Variables and Secrets)
 *   FEEDBACK_LIMITER  messages per address and minute (wrangler.jsonc `ratelimits`; optional)
 *
 * What people type is shown as text, never as Markdown: no mentions, links or images reach the
 * issue (an image would be fetched by GitHub, a mention would notify someone).
 *
 * The app asks GET first and only offers "Send" when this answers { ok: true }; on any other host
 * (on-premise, air-gapped, plain static hosting) it falls back to email or copying.
 */

import { withinLimit, type RateLimiter } from './ratelimit';

export interface FeedbackEnv {
  GITHUB_REPO?: string;
  GITHUB_TOKEN?: string;
  FEEDBACK_LIMITER?: RateLimiter;
}

export const FEEDBACK_KINDS = ['idea', 'problem', 'question', 'praise'] as const;

const TITLES: Record<(typeof FEEDBACK_KINDS)[number], string> = {
  idea: 'Idea',
  problem: 'Problem',
  question: 'Question',
  praise: 'Praise',
};

/**
 * GitHub refuses issue bodies over 65 536 characters: the fields together stay below. `request`
 * counts bytes (UTF-8 JSON), the others characters.
 */
export const LIMITS = { request: 96_000, message: 5000, contact: 200, details: 1000, link: 56_000 };

export interface Feedback {
  kind: (typeof FEEDBACK_KINDS)[number];
  message: string;
  /** How to reply (usually an email address); empty = anonymous. */
  contact: string;
  /** App version and browser, when the sender ticked "include details". */
  details: string;
  /** Share link of the sender's project on this site (`#share=…`); empty = none. */
  link: string;
}

/** The share link as one URL of this site (no user info or query), or null if it is not one. */
function shareLinkOf(link: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.origin !== origin || !/^#share=[\w-]+$/.test(url.hash)) return null;
  return url.origin + url.pathname + url.hash;
}

/**
 * Validates an untrusted request body sent from `origin`; returns the feedback, or why it was
 * refused.
 */
export function parseFeedback(raw: unknown, origin: string): Feedback | string {
  if (typeof raw !== 'object' || raw === null) return 'expected an object';
  const r = raw as Record<string, unknown>;
  const text = (v: unknown, max: number): string | null =>
    v === undefined ? '' : typeof v === 'string' && v.length <= max ? v.trim() : null;
  const kind = FEEDBACK_KINDS.find((k) => k === r.kind);
  if (!kind) return 'unknown kind';
  const message = text(r.message, LIMITS.message);
  const contact = text(r.contact, LIMITS.contact);
  const details = text(r.details, LIMITS.details);
  const link = text(r.link, LIMITS.link);
  if (!message) return 'message missing or too long';
  if (contact === null || details === null || link === null) return 'field too long';
  const project = link && shareLinkOf(link, origin);
  if (project === null) return 'not a share link of this site';
  return { kind, message, contact, details, link: project };
}

/** Text as a fenced code block, fenced by more backticks than any run inside, so it stays closed. */
function fenced(text: string): string[] {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  return [fence, text, fence];
}

/**
 * The GitHub issue for a message: kind and first line as title (plain text on GitHub), and the
 * sender's text as code, which renders literally.
 */
export function issueFor(fb: Feedback): { title: string; body: string; labels: string[] } {
  const firstLine = fb.message.split('\n')[0]!.slice(0, 80);
  const contact = fb.contact.replace(/\s+/g, ' ').replaceAll('`', "'");
  const body = [
    ...fenced(fb.message),
    '',
    '---',
    `**Reply to:** ${contact ? `\`${contact}\`` : '_anonymous_'}`,
    ...(fb.link ? ['', `**Project:** [open a copy in GrafcetMaker](<${fb.link}>)`] : []),
    ...(fb.details ? ['', ...fenced(fb.details)] : []),
  ].join('\n');
  return { title: `[${TITLES[fb.kind]}] ${firstLine}`, body, labels: ['feedback', fb.kind] };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** GET tells the app whether sending is available here; POST files a message. */
export async function handleFeedback(request: Request, env: FeedbackEnv): Promise<Response> {
  if (request.method === 'GET') return json({ ok: Boolean(env.GITHUB_REPO && env.GITHUB_TOKEN) });
  if (request.method === 'POST') return post(request, env);
  return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
}

/**
 * The body as text, reading no more than `max` bytes of it: null when it is larger. Throws when
 * it is not UTF-8.
 */
export async function readCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

async function post(request: Request, env: FeedbackEnv): Promise<Response> {
  // Browsers name the page of every POST: only the app's own pages may send.
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return json({ error: 'forbidden' }, 403);
  if (!env.GITHUB_REPO || !env.GITHUB_TOKEN) return json({ error: 'not configured' }, 503);
  if (!(await withinLimit(env.FEEDBACK_LIMITER, request)))
    return json({ error: 'too many messages' }, 429);
  if (Number(request.headers.get('Content-Length') ?? 0) > LIMITS.request) {
    return json({ error: 'too large' }, 413);
  }
  let raw: unknown;
  try {
    const text = await readCapped(request, LIMITS.request);
    if (text === null) return json({ error: 'too large' }, 413);
    raw = JSON.parse(text);
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }
  const feedback = parseFeedback(raw, origin);
  if (typeof feedback === 'string') return json({ error: feedback }, 400);

  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'GrafcetMaker-feedback',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(issueFor(feedback)),
  }).catch(() => null);
  return res?.ok ? json({ ok: true }) : json({ error: 'delivery failed' }, 502);
}
