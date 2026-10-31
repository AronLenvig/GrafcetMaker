/** A drag changes the document at most once per animation frame: the latest pointer position. */
export interface FrameThrottle {
  /** Runs `run` on the next frame, in place of a step still waiting for it. */
  next: (run: () => void) => void;
  /** Applies the pending drag step now (the drag ends). */
  settle: () => void;
  /** Drops the pending drag step (the drag is cancelled). */
  cancel: () => void;
}

export function createFrameThrottle(): FrameThrottle {
  let frame: { id: number; run: () => void } | null = null;
  return {
    next(run) {
      if (frame) {
        frame.run = run;
        return;
      }
      const f = { id: 0, run };
      f.id = requestAnimationFrame(() => {
        frame = null;
        f.run();
      });
      frame = f;
    },
    settle() {
      const f = frame;
      if (!f) return;
      cancelAnimationFrame(f.id);
      frame = null;
      f.run();
    },
    cancel() {
      if (frame) cancelAnimationFrame(frame.id);
      frame = null;
    },
  };
}
