/**
 * Per-address limits of the hosted site, with the Workers Rate Limiting bindings declared in
 * wrangler.jsonc (`ratelimits`): the feedback endpoint and the opening of live room connections.
 */

/** A Workers Rate Limiting binding. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Whether the sender of `request` is within `limiter`'s limit, keyed by the client address that
 * Cloudflare reports. Without the binding (local development, another host) or when it fails, the
 * request passes: the limit protects the site, the site does not depend on it.
 */
export async function withinLimit(
  limiter: RateLimiter | undefined,
  request: Request,
): Promise<boolean> {
  if (!limiter) return true;
  const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return true;
  }
}
