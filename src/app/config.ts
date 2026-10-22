/**
 * Deployment settings fixed at build time. Self-hosted builds can override them with environment
 * variables, e.g. `VITE_FEEDBACK_EMAIL=plc-team@example.com npm run build`.
 */

/**
 * Where "Send feedback" goes when the site has no feedback endpoint (see FEEDBACK_ENDPOINT): an
 * address opened in the user's own email app. Empty by default, which leaves only Copy.
 */
export const FEEDBACK_EMAIL: string =
  (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined) ?? '';

/**
 * The anonymous feedback endpoint (functions/api/feedback.ts on Cloudflare Pages), relative to the
 * page so it stays same-origin. Used only when it answers; other hosts fall back to FEEDBACK_EMAIL.
 */
export const FEEDBACK_ENDPOINT = 'api/feedback';
