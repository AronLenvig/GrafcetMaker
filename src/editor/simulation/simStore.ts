/**
 * Simulation mode on the main thread: owns the virtual clock (real time × speed, or jumping from
 * timer to timer in fast mode), forwards inputs to the simulator worker, records scenarios and
 * keeps the cycle history used by the log, the chronogram and time-travel.
 */
import i18next from 'i18next';
import { create } from 'zustand';
import { setPrefs, usePrefs } from '@/ui/prefs';
import { showBottomTab } from '../store/sheet';
import { toast } from '@/ui/toasts';
import { newId } from '@/core/model/factory';
import type { Id, Project, Scenario, ScenarioEvent } from '@/core/model/types';
import type { SimSnapshot, Value } from '@/core/simulation/engine';
import { framesOf, type Frame } from '@/core/simulation/frames';
import type { CompileProblem } from '@/core/simulation/program';
import type { CycleRecord, SimRequest, SimResponse, SimSession } from '@/core/simulation/session';
import type { SimReply } from '@/workers/simulation.worker';
import { doc, getProject } from '../store/document';
import { useUi } from '../store/uiStore';

export type Speed = 0.25 | 0.5 | 1 | 2 | 5 | 10 | 'fast';
export const SPEEDS: Speed[] = [0.25, 0.5, 1, 2, 5, 10, 'fast'];

/** The speed remembered in preferences (as text), falling back to real time. */
export function preferredSpeed(): Speed {
  const v = usePrefs.getState().simSpeed;
  return SPEEDS.find((x) => String(x) === v) ?? 1;
}
const MAX_CYCLES = 20_000;
const FAST_INTERVAL_MS = 250;
/** Each situation stays on the diagram at least this long, so every step can be seen. */
const MIN_STEP_MS = 100;
/** Situations waiting to be shown: older ones are skipped, so the diagram lags at most ~1 s. */
const MAX_QUEUED = 10;

export interface Baseline {
  time: number;
  active: Id[];
  values: Record<string, Value>;
}

interface SimState {
  /** Simulation mode is on (editing locked). */
  on: boolean;
  playing: boolean;
  speed: Speed;
  snapshot: SimSnapshot | null;
  /** State after the start cycle, then every later cycle (for log, chronogram, time travel). */
  baseline: Baseline | null;
  cycles: CycleRecord[];
  /** Transitions cleared to reach the situation shown (flashed on the diagram). */
  flash: { ids: Id[]; at: number } | null;
  /**
   * The situation the diagram shows while it catches up with the simulation, each evolution held
   * MIN_STEP_MS (unstable situations included); null when it shows `snapshot.active`.
   */
  shown: Id[] | null;
  problems: CompileProblem[];
  recording: ScenarioEvent[] | null;
  replay: { name: string; events: ScenarioEvent[]; index: number } | null;
  /** Chronogram scrub time; null = live. */
  cursor: number | null;
}

export const useSim = create<SimState>(() => ({
  on: false,
  playing: false,
  speed: 1,
  snapshot: null,
  baseline: null,
  cycles: [],
  flash: null,
  shown: null,
  problems: [],
  recording: null,
  replay: null,
  cursor: null,
}));

// --------------------------------------------------------------------------------------------
// Transport: worker with an in-thread fallback.

let worker: Worker | null = null;
/** The simulator in this thread (no worker, or it failed), loaded only then. */
let inline: Promise<SimSession> | null = null;
let seq = 0;
const waiting = new Map<number, (res: SimResponse | null) => void>();

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** The simulator threw: what it was asked would throw again, so the clock stops and says why. */
function failed(message: string): void {
  pause();
  toast(i18next.t('simulation.failed', { message }), 'error', 8000);
}

function startInline(): Promise<SimSession> {
  inline ??= import('@/core/simulation/session').then((m) => new m.SimSession());
  return inline;
}

function transport(): void {
  if (worker || inline) return;
  try {
    worker = new Worker(new URL('../../workers/simulation.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<SimReply>) => {
      const resolve = waiting.get(e.data.seq);
      waiting.delete(e.data.seq);
      if ('error' in e.data) {
        failed(e.data.error);
        resolve?.(null);
      } else resolve?.(e.data.res);
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      void startInline();
      for (const [, resolve] of waiting) resolve(null);
      waiting.clear();
      // The simulator in this thread starts from the diagram again: the state is lost.
      if (useSim.getState().on) {
        toast(i18next.t('simulation.restarted'), 'warning', 8000);
        void reloadSimulation();
      }
    };
  } catch {
    void startInline();
  }
}

/** Requests are strictly sequential: the clock waits for each reply before sending the next. */
let chain: Promise<unknown> = Promise.resolve();

/** Never rejects: a failure is shown (see failed) and answered with null. */
function send(req: SimRequest): Promise<SimResponse | null> {
  const run = () =>
    new Promise<SimResponse | null>((resolve) => {
      if (inline) {
        inline.then(
          (session) => {
            try {
              resolve(session.handle(req));
            } catch (err) {
              failed(errorText(err));
              resolve(null);
            }
          },
          (err: unknown) => {
            failed(errorText(err));
            resolve(null);
          },
        );
        return;
      }
      const n = ++seq;
      waiting.set(n, resolve);
      worker!.postMessage({ seq: n, req });
    });
  const p = chain.then(run, run);
  chain = p;
  return p;
}

// --------------------------------------------------------------------------------------------
// Pacing: the diagram shows each evolution for at least MIN_STEP_MS.

let queue: Frame[] = [];
let shownAt = 0;
let paceTimer: ReturnType<typeof setTimeout> | undefined;

function stopPacing(): void {
  if (paceTimer !== undefined) clearTimeout(paceTimer);
  paceTimer = undefined;
  queue = [];
  shownAt = 0;
}

function showNext(): void {
  paceTimer = undefined;
  const wait = shownAt + MIN_STEP_MS - performance.now();
  if (wait > 0) {
    paceTimer = setTimeout(showNext, wait);
    return;
  }
  const frame = queue.shift();
  if (!frame) {
    useSim.setState({ shown: null });
    return;
  }
  shownAt = performance.now();
  useSim.setState((s) => ({
    shown: frame.active,
    flash: frame.cleared.length ? { ids: frame.cleared, at: Date.now() } : s.flash,
  }));
  paceTimer = setTimeout(showNext, MIN_STEP_MS);
}

function pace(frames: Frame[]): void {
  if (!frames.length) return;
  queue = [...queue, ...frames].slice(-MAX_QUEUED);
  if (paceTimer === undefined) showNext();
}

const sameIds = (a: readonly Id[], b: readonly Id[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

function sameRecord<T>(a: Record<string, T>, b: Record<string, T>): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && a[k] === b[k])
  );
}

/**
 * The snapshot to keep: the clock moves on every frame, the rest seldom does. Fields that did not
 * change stay the previous objects, and so does the whole snapshot when nothing changed.
 */
function settle(prev: SimSnapshot | null, next: SimSnapshot): SimSnapshot {
  if (!prev || prev.error || next.error) return next;
  const kept: SimSnapshot = {
    ...next,
    active: sameIds(prev.active, next.active) ? prev.active : next.active,
    enabled: sameIds(prev.enabled, next.enabled) ? prev.enabled : next.enabled,
    executing: sameIds(prev.executing, next.executing) ? prev.executing : next.executing,
    values: sameRecord(prev.values, next.values) ? prev.values : next.values,
    activatedAt: sameRecord(prev.activatedAt, next.activatedAt)
      ? prev.activatedAt
      : next.activatedAt,
  };
  const same = (Object.keys(kept) as (keyof SimSnapshot)[]).every((k) => kept[k] === prev[k]);
  return same ? prev : kept;
}

function apply(res: SimResponse | null, opts: { restart?: boolean } = {}): void {
  if (!res) return;
  const before = useSim.getState().snapshot?.active;
  if (opts.restart) {
    stopPacing();
    useSim.setState({ shown: null, flash: null });
  } else if (before && !res.snapshot.error) pace(framesOf(before, res.cycles));
  useSim.setState((s) => {
    const snapshot = opts.restart ? res.snapshot : settle(s.snapshot, res.snapshot);
    // Compile problems change only when a program is loaded (load and reset restart).
    if (!opts.restart && snapshot === s.snapshot && !res.cycles.length) return s;
    let cycles = opts.restart ? [] : s.cycles;
    let baseline = opts.restart ? null : s.baseline;
    let incoming = res.cycles;
    if (!baseline && incoming.length) {
      // load/reset reply with exactly the start cycle: the snapshot is the state after it.
      const first = incoming[0]!;
      baseline = { time: first.time, active: first.active, values: { ...res.snapshot.values } };
      incoming = incoming.slice(1);
    }
    if (incoming.length) cycles = cycles.concat(incoming);
    if (cycles.length > MAX_CYCLES && baseline) {
      const drop = cycles.length - MAX_CYCLES / 2;
      baseline = { time: cycles[drop - 1]!.time, ...replay(baseline, cycles, 0, drop) };
      cycles = cycles.slice(drop);
    }
    const problems = opts.restart ? res.problems : s.problems;
    return { snapshot, problems, baseline, cycles };
  });
  if (res.snapshot.error) {
    pause();
    toast(i18next.t('simulation.transientLoop'), 'error', 6000);
  }
}

interface Situation {
  active: Id[];
  values: Record<string, Value>;
}

/** The situation after cycles[start..end) from `from` (not changed). */
function replay(
  from: Situation,
  cycles: readonly CycleRecord[],
  start: number,
  end: number,
): Situation {
  const values = { ...from.values };
  let active = from.active;
  for (let i = start; i < end; i++) {
    const c = cycles[i]!;
    for (const ch of c.inputs) values[ch.name] = ch.value;
    for (const ch of c.changes) values[ch.name] = ch.value;
    active = c.active;
  }
  return { active, values };
}

/** Time travel replays at most this many cycles from the nearest checkpoint. */
const CHECKPOINT = 256;
/** checkpoints.states[k]: the situation after the first k * CHECKPOINT cycles of the baseline. */
let checkpoints: { baseline: Baseline | null; states: Situation[] } = {
  baseline: null,
  states: [],
};

/** Situation and values at virtual time `t` (time travel from the chronogram). */
export function stateAt(t: number): { active: Set<Id>; values: Record<string, Value> } | null {
  const { baseline, cycles } = useSim.getState();
  if (!baseline) return null;
  // Cycles are only appended while the baseline stays (a new one restarts or trims them).
  if (checkpoints.baseline !== baseline) checkpoints = { baseline, states: [baseline] };
  // The cycles up to t: the first `end` ones (in time order).
  let end = 0;
  for (let hi = cycles.length; end < hi;) {
    const mid = (end + hi) >> 1;
    if (cycles[mid]!.time > t) hi = mid;
    else end = mid + 1;
  }
  const { states } = checkpoints;
  const k = Math.floor(end / CHECKPOINT);
  while (states.length <= k) {
    const j = states.length - 1;
    states.push(replay(states[j]!, cycles, j * CHECKPOINT, (j + 1) * CHECKPOINT));
  }
  const at = replay(states[k]!, cycles, k * CHECKPOINT, end);
  return { active: new Set(at.active), values: at.values };
}

// --------------------------------------------------------------------------------------------
// Clock

let raf = 0;
let fastTimer: ReturnType<typeof setTimeout> | undefined;
let clock = { wall: 0, sim: 0 };
let inFlight = false;

function now(): number {
  const { playing, speed, snapshot } = useSim.getState();
  const base = snapshot?.time ?? 0;
  if (!playing || speed === 'fast') return base;
  return Math.max(base, clock.sim + (performance.now() - clock.wall) * speed);
}

async function tick(): Promise<void> {
  const st = useSim.getState();
  if (!st.on || !st.playing) return;
  if (!inFlight) {
    inFlight = true;
    try {
      const target = now();
      const next = st.replay?.events[st.replay.index];
      if (next && next.t <= target) {
        advanceReplay();
        apply(await send({ type: 'input', at: next.t, changes: { [next.name]: next.value } }));
      } else {
        apply(await send({ type: 'advance', to: target }));
      }
    } finally {
      inFlight = false;
    }
  }
  // Not when the reply stopped the clock (an error).
  if (useSim.getState().playing) raf = requestAnimationFrame(() => void tick());
}

async function fastTick(): Promise<void> {
  const st = useSim.getState();
  if (!st.on || !st.playing || st.speed !== 'fast') return;
  await nextEvent();
  fastTimer = setTimeout(() => void fastTick(), FAST_INTERVAL_MS);
}

function advanceReplay(): void {
  useSim.setState((s) => {
    if (!s.replay) return {};
    const index = s.replay.index + 1;
    if (index >= s.replay.events.length)
      toast(i18next.t('simulation.replayDone', { name: s.replay.name }), 'success');
    return { replay: index >= s.replay.events.length ? null : { ...s.replay, index } };
  });
}

export function play(): void {
  const st = useSim.getState();
  if (!st.on || st.playing || st.snapshot?.error) return;
  clock = { wall: performance.now(), sim: st.snapshot?.time ?? 0 };
  useSim.setState({ playing: true, cursor: null });
  if (st.speed === 'fast') void fastTick();
  else raf = requestAnimationFrame(() => void tick());
}

export function pause(): void {
  cancelAnimationFrame(raf);
  if (fastTimer !== undefined) clearTimeout(fastTimer);
  useSim.setState({ playing: false });
}

export function togglePlay(): void {
  if (useSim.getState().playing) pause();
  else play();
}

export function setSpeed(speed: Speed): void {
  const wasPlaying = useSim.getState().playing;
  pause();
  useSim.setState({ speed });
  setPrefs({ simSpeed: String(speed) });
  if (wasPlaying) play();
}

/** Single step: jump to the next timer expiry (or replayed input) and run that cycle. */
export async function nextEvent(): Promise<void> {
  const st = useSim.getState();
  if (!st.on || st.snapshot?.error) return;
  const deadline = st.snapshot?.nextDeadline ?? null;
  const next = st.replay?.events[st.replay.index];
  if (next && (deadline === null || next.t <= deadline)) {
    advanceReplay();
    apply(
      await send({
        type: 'input',
        at: Math.max(next.t, st.snapshot?.time ?? 0),
        changes: { [next.name]: next.value },
      }),
    );
    return;
  }
  const res = await send({ type: 'next' });
  apply(res);
  if (res?.idle && !useSim.getState().playing) toast(i18next.t('simulation.nothingScheduled'));
}

// --------------------------------------------------------------------------------------------
// Commands

export async function startSimulation(): Promise<void> {
  if (useSim.getState().on) return;
  transport();
  useUi.setState({ mode: 'simulate', editing: null, tool: 'select', pending: null });
  useSim.setState({
    on: true,
    playing: false,
    speed: preferredSpeed(),
    cycles: [],
    baseline: null,
    flash: null,
    recording: null,
    replay: null,
    cursor: null,
    snapshot: null,
  });
  showBottomTab('simulation');
  apply(await send({ type: 'load', project: getProject() }), { restart: true });
  // Starts running: timers advance right away (F5 pauses).
  if (useSim.getState().snapshot) play();
}

export function stopSimulation(): void {
  pause();
  stopPacing();
  useSim.setState({
    on: false,
    snapshot: null,
    cycles: [],
    baseline: null,
    flash: null,
    shown: null,
    recording: null,
    replay: null,
    cursor: null,
  });
  useUi.setState({ mode: 'edit' });
}

/**
 * Loads the diagram as it is now into the running simulation and starts over (live sessions:
 * changes others made while this one was simulating).
 */
export async function reloadSimulation(): Promise<void> {
  if (!useSim.getState().on) return;
  pause();
  useSim.setState({
    replay: null,
    cursor: null,
    recording: useSim.getState().recording ? [] : null,
  });
  apply(await send({ type: 'load', project: getProject() }), { restart: true });
  if (useSim.getState().snapshot) play();
}

export async function resetSimulation(): Promise<void> {
  pause();
  useSim.setState({
    replay: null,
    cursor: null,
    recording: useSim.getState().recording ? [] : null,
  });
  apply(await send({ type: 'reset' }), { restart: true });
}

/** Sets an input now (virtual time); recorded when a scenario is being recorded. */
export async function setInput(name: string, value: Value): Promise<void> {
  const st = useSim.getState();
  if (!st.on || st.snapshot?.error) return;
  const at = now();
  if (st.recording) useSim.setState({ recording: [...st.recording, { t: at, name, value }] });
  useSim.setState({ cursor: null });
  apply(await send({ type: 'input', at, changes: { [name]: value } }));
}

/** Switches a BOOL input (clicked on the diagram); not while a scenario is being replayed. */
export function toggleInput(name: string): void {
  const st = useSim.getState();
  if (!st.on || st.replay || st.snapshot?.error) return;
  void setInput(name, st.snapshot?.values[name] !== true);
}

export async function startRecording(): Promise<void> {
  await resetSimulation();
  useSim.setState({ recording: [] });
}

/** Stops recording and saves the scenario in the project (undoable). */
export function stopRecording(name: string): Scenario | null {
  const events = useSim.getState().recording;
  useSim.setState({ recording: null });
  if (!events?.length) return null;
  const scenario: Scenario = { id: newId(), name, events };
  doc.execute('history.saveScenario', (p: Project) => {
    p.scenarios = { ...(p.scenarios ?? {}), [scenario.id]: scenario };
  });
  return scenario;
}

export function deleteScenario(id: Id): void {
  doc.execute('history.deleteScenario', (p) => {
    if (p.scenarios) delete p.scenarios[id];
  });
}

/** Restarts the simulation and replays a scenario's input events at their recorded times. */
export async function replayScenario(scenario: Scenario): Promise<void> {
  await resetSimulation();
  useSim.setState({
    replay: {
      name: scenario.name,
      events: [...scenario.events].sort((a, b) => a.t - b.t),
      index: 0,
    },
  });
  play();
}

export function setCursor(t: number | null): void {
  if (t !== null) pause();
  useSim.setState({ cursor: t });
}
