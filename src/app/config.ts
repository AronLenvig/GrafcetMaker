/**
 * Deployment settings fixed at build time. Self-hosted builds can override them with environment
 * variables, e.g. `VITE_FEEDBACK_EMAIL=plc-team@example.com npm run build`.
 */

/** Where "Send feedback" addresses its email (opened in the user's own email app). */
export const FEEDBACK_EMAIL: string =
  (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined) || 'aronlenvigg@gmail.com';
