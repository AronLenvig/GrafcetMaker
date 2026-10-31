import { SimSession, type SimRequest, type SimResponse } from '@/core/simulation/session';

export type SimReply =
  | { seq: number; res: SimResponse | null }
  /** The simulator threw: shown to the user (running it in the page would throw the same). */
  | { seq: number; error: string };

const session = new SimSession();

/** Runs the simulator off the main thread; every request gets exactly one reply. */
self.onmessage = (e: MessageEvent<{ seq: number; req: SimRequest }>) => {
  let reply: SimReply;
  try {
    reply = { seq: e.data.seq, res: session.handle(e.data.req) };
  } catch (err) {
    reply = { seq: e.data.seq, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(reply);
};
