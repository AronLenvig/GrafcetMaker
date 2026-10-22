/**
 * Cloudflare Worker of the public site (wrangler.jsonc): serves the static app from dist/ and
 * the anonymous feedback endpoint. Only /api/* runs this script (run_worker_first); every other
 * request is answered directly from the static files. On-premise installs do not use it.
 */
import { handleFeedback, type FeedbackEnv } from './feedback';

interface Env extends FeedbackEnv {
  /** The static files of dist/ (assets binding). */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === '/api/feedback') return handleFeedback(request, env);
    return env.ASSETS.fetch(request);
  },
};
