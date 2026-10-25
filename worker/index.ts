/**
 * Cloudflare Worker of the public site (wrangler.jsonc): serves the static app from dist/, the
 * anonymous feedback endpoint, the live collaboration relay and the root page with the visitor's
 * country. Only /api/* and / run this script (run_worker_first); every other request is answered
 * directly from the static files.
 * On-premise installs do not use it (server/relay.ts is their relay).
 */
import { CollabRoom, type CollabEnv } from './collab';
import { withCountry } from './country';
import { handleFeedback, type FeedbackEnv } from './feedback';
import { secured } from './headers';
import { PROBE_BODY, roomOfPath } from './room';

export { CollabRoom };

interface Env extends FeedbackEnv, CollabEnv {
  /** The static files of dist/ (assets binding). */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/**
 * Browsers name the page that opens a WebSocket: only the app's own pages, or a development
 * server on this computer, may use the relay. Clients without the header are not browsers.
 */
function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin || origin === new URL(request.url).origin) return true;
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/feedback') return handleFeedback(request, env);
  const room = roomOfPath(pathname);
  if (room !== null && env.ROOMS) {
    // GET api/room: the app asks whether live collaboration is available here.
    if (room === '')
      return Promise.resolve(
        new Response(PROBE_BODY, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }),
      );
    if (!allowedOrigin(request)) return Promise.resolve(new Response(null, { status: 403 }));
    return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
  }
  if (pathname === '/') {
    const { cf } = request as Request & { cf?: { country?: unknown } };
    return env.ASSETS.fetch(request).then((response) => withCountry(response, cf?.country));
  }
  return env.ASSETS.fetch(request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env).then(secured);
  },
};
