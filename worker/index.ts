/**
 * Cloudflare Worker of the public site (wrangler.jsonc): serves the static app from dist/, the
 * anonymous feedback endpoint and the live collaboration relay. Only /api/* runs this script
 * (run_worker_first); every other request is answered directly from the static files.
 * On-premise installs do not use it (server/relay.ts is their relay).
 */
import { CollabRoom, type CollabEnv } from './collab';
import { handleFeedback, type FeedbackEnv } from './feedback';
import { PROBE_BODY, roomOfPath } from './room';

export { CollabRoom };

interface Env extends FeedbackEnv, CollabEnv {
  /** The static files of dist/ (assets binding). */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
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
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
