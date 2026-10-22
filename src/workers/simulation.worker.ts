import { SimSession, type SimRequest } from '@/core/simulation/session';

const session = new SimSession();

/** Runs the simulator off the main thread; every request gets exactly one reply. */
self.onmessage = (e: MessageEvent<{ seq: number; req: SimRequest }>) => {
  self.postMessage({ seq: e.data.seq, res: session.handle(e.data.req) });
};
