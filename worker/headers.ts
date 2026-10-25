/**
 * Security headers of the hosted site: what a <meta> CSP cannot say (as deploy/security-headers.conf
 * does for nginx), plus HTTPS only. public/_headers sets the same on the static files; the Worker
 * (worker/index.ts) adds them to its own responses, which that file does not reach.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "frame-ancestors 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000',
};

/** The response with the security headers (a WebSocket upgrade is handed over as it is). */
export function secured(response: Response): Response {
  if (response.status === 101) return response;
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
  return out;
}
