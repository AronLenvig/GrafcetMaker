/**
 * Stand-in for the Workers runtime module `cloudflare:workers` in unit tests (vitest.config.ts
 * aliases it here); its types come from worker/cloudflare.d.ts.
 */
export abstract class DurableObject<Env = unknown> {
  protected readonly ctx: unknown;
  protected readonly env: Env;

  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
