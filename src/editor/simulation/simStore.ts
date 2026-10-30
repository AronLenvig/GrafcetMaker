/**
 * Simulation mode on the main thread: owns the virtual clock (real time × speed, or jumping from
 * timer to timer in fast mode), forwards inputs to the simulator worker, records scenarios and
 * keeps the cycle history used by the log, the chronogram and time-travel.
 */
import i18next from 'i18next';
import { create } from 'zustand';
import { setPrefs, showBottomTab, usePrefs } from '@/app/prefs';
import { toast } from '@/app/toasts';
import { newId } from '@/core/model/factory';
import type { Id, Project, Scenario, ScenarioEvent } from '@/core/model/types';
import type { SimSnapshot, Value } from '@/core/simulation/engine';
import { framesOf, type Frame } from '@/core/simulation/frames';
import type { CompileProblem } from '@/core/simulation/program';
import {
  SimSession,
  type CycleRecord,
  type SimRequest,
  type SimResponse,
} from '@/core/simulation/session';
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
let inline: SimSession | null = null;
let seq = 0;
const waiting = new Map<number, (res: SimResponse | null) => void>();

function transport(): void {
  if (worker || inline) return;
  try {
    worker = new Worker(new URL('../../workers/simulation.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<{ seq: number; res: SimResponse | null }>) => {
      waiting.get(e.data.seq)?.(e.data.res);
      waiting.delete(e.data.seq);
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      inline = new SimSession();
      for (const [, resolve] of waiting) resolve(null);
      waiting.clear();
    };
  } catch {
    inline = new SimSession();
  }
}

/** Requests are strictly sequential: the clock waits for each reply before sending the next. */
let chain: Promise<unknown> = Promise.resolve();

function send(req: SimRequest): Promise<SimResponse | null> {
  const run = () =>
    new Promise<SimResponse | null>((resolve) => {
      if (inline) return resolve(inline.handle(req));
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

function apply(res: SimResponse | null, opts: { restart?: boolean } = {}): void {
  if (!res) return;
  const before = useSim.getState().snapshot?.active;
  if (opts.restart) {
    stopPacing();
    useSim.setState({ shown: null, flash: null });
  } else if (before && !res.snapshot.error) pace(framesOf(before, res.cycles));
  useSim.setState((s) => {
    let cycles = opts.restart ? [] : s.cycles;
    let baseline = opts.restart ? null : s.baseline;
    let incoming = res.cycles;
    if (!baseline && incoming.length) {
      // load/reset reply with exactly the start cycle: the snapshot is the state after it.
      const first = incoming[0]!;
      baseline = { time: first.time, active: first.active, values: { ...res.snapshot.values } };
      incoming = incoming.slice(1);
    }
    if (incoming.length) cycles = [...cycles, ...incoming];
    if (cycles.length > MAX_CYCLES && baseline) {
      const drop = cycles.slice(0, cycles.length - MAX_CYCLES / 2);
      baseline = advanceBaseline(baseline, drop);
      cycles = cycles.slice(drop.length);
    }
    return { snapshot: res.snapshot, problems: res.problems, baseline, cycles };
  });
  if (res.snapshot.error) {
    pause();
    toast(i18next.t('simulation.transientLoop'), 'error', 6000);
  }
}

function advanceBaseline(b: Baseline, cycles: CycleRecord[]): Baseline {
  const values = { ...b.values };
  let active = b.active;
  let time = b.time;
  for (const c of cycles) {
    for (const ch of [...c.inputs, ...c.changes]) values[ch.name] = ch.value;
    active = c.active;
    time = c.time;
  }
  return { time, active, values };
}

/** Situation and values at virtual time `t` (time travel from the chronogram). */
export function stateAt(t: number): { active: Set<Id>; values: Record<string, Value> } | null {
  const { baseline, cycles } = useSim.getState();
  if (!baseline) return null;
  const values = { ...baseline.values };
  let active = baseline.active;
  for (const c of cycles) {
    if (c.time > t) break;
    for (const ch of [...c.inputs, ...c.changes]) values[ch.name] = ch.value;
    active = c.active;
  }
  return { active: new Set(active), values };
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
    const target = now();
    const next = st.replay?.events[st.replay.index];
    if (next && next.t <= target) {
      advanceReplay();
      apply(await send({ type: 'input', at: next.t, changes: { [next.name]: next.value } }));
    } else {
      apply(await send({ type: 'advance', to: target }));
    }
    inFlight = false;
  }
  raf = requestAnimationFrame(() => void tick());
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
