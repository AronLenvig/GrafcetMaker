/**
 * Example projects of the start screen, built from a compact description with the editor's own
 * model operations and auto-layout, so they are always valid and drawn like user charts.
 */
import { ACTION_HEIGHT, computeGeometry, grafcetBounds, PITCH, ROW } from '@/core/layout/geometry';
import { autoLayout } from '@/core/layout/autoLayout';
import { createGrafcet, createProject, newId } from '@/core/model/factory';
import { addAction, addComment, addFreeAction, addStep, addTransition } from '@/core/model/ops';
import type {
  ActionKind,
  GrafcetKind,
  Project,
  ScenarioEvent,
  Step,
  StepKind,
  Variable,
  VariableType,
} from '@/core/model/types';

type Act = [kind: ActionKind, text: string, condition?: string];
interface ExStep {
  n: number;
  label?: string;
  kind?: StepKind;
  /** Column hint (0 = main line) ordering branches left to right before auto-layout. */
  col?: number;
  actions?: Act[];
  /** Macro-step or enclosing step: the name of its expansion or enclosed grafcet. */
  ref?: string;
}
interface ExGrafcet {
  name: string;
  kind?: GrafcetKind;
  steps: ExStep[];
  /** [from step numbers, receptivity, to step numbers] */
  transitions: [number[], string, number[]][];
  comments?: string[];
  /** Actions without a step (always active), drawn below the explanations. */
  free?: Act[];
}
type ExVar = [
  name: string,
  type: VariableType,
  dir: Variable['direction'],
  address?: string,
  comment?: string,
  initial?: boolean | number,
];
interface ExProject {
  name: string;
  variables: ExVar[];
  grafcets: ExGrafcet[];
  scenarios?: { name: string; events: ScenarioEvent[] }[];
}

function build(spec: ExProject): Project {
  const p = createProject(spec.name);
  p.grafcets = {};
  p.grafcetOrder = [];
  p.meta.author = 'GrafcetMaker examples';
  for (const [name, type, direction, address, comment, initial] of spec.variables) {
    const v: Variable = { id: newId(), name, type, direction };
    if (address) v.address = address;
    if (comment) v.comment = comment;
    if (initial !== undefined) v.initialValue = initial;
    p.variables[v.id] = v;
  }
  const refs: [Step, string][] = [];
  for (const eg of spec.grafcets) {
    const g = createGrafcet(eg.name, eg.kind ?? 'partial');
    const ids = new Map<number, string>();
    eg.steps.forEach((s, i) => {
      const step = addStep(
        g,
        { x: 200 + (s.col ?? 0) * 160, y: 100 + i * PITCH },
        s.kind ?? 'normal',
        s.n,
      );
      if (s.label) step.label = s.label;
      if (s.ref) refs.push([step, s.ref]);
      ids.set(s.n, step.id);
      for (const [kind, text, condition] of s.actions ?? []) {
        const a = addAction(g, step.id, kind, text);
        if (condition) a.condition = condition;
      }
    });
    for (const [from, receptivity, to] of eg.transitions) {
      const at = (n: number | undefined) =>
        n === undefined ? undefined : g.steps[ids.get(n)!]!.position;
      const above = at(from[0]);
      const below = at(to[0]);
      // Branch order comes from x: a simple link takes the column of the step it leads to.
      const x = from.length > 1 || to.length > 1 || !below ? (above ?? below)!.x : below.x;
      const y = above ? above.y + ROW : below!.y - ROW;
      addTransition(
        g,
        { x, y },
        from.map((n) => ids.get(n)!),
        to.map((n) => ids.get(n)!),
        receptivity,
      );
    }
    for (const [id, pos] of autoLayout(g)) {
      const el = g.steps[id] ?? g.transitions[id];
      if (el) el.position = pos;
    }
    // Explanations to the right of the chart.
    const b = grafcetBounds(g, computeGeometry(g));
    let y = b ? b.y : 80;
    const x = (b ? b.x + b.width : 300) + 60;
    for (const text of eg.comments ?? []) {
      const c = addComment(g, { x, y }, text);
      y += (c.text.split('\n').length + 1) * 16 + 24;
    }
    for (const [kind, text, condition] of eg.free ?? []) {
      // Room above the box for its condition.
      const a = addFreeAction(g, { x, y: y + 20 }, kind, text);
      if (condition) a.condition = condition;
      y += 20 + ACTION_HEIGHT + 24;
    }
    p.grafcets[g.id] = g;
    p.grafcetOrder.push(g.id);
  }
  const byName = new Map(Object.values(p.grafcets).map((g) => [g.name, g.id]));
  for (const [step, name] of refs) step.refGrafcetId = byName.get(name)!;
  if (spec.scenarios?.length) {
    p.scenarios = {};
    for (const sc of spec.scenarios) {
      const id = newId();
      p.scenarios[id] = { id, name: sc.name, events: sc.events };
    }
  }
  return p;
}

const press = (name: string, t: number, length = 300): ScenarioEvent[] => [
  { t, name, value: true },
  { t: t + length, name, value: false },
];

export const EXAMPLES = {
  /** Timers, a stored action on an event and a stored action on activation. */
  trafficLight: (): Project =>
    build({
      name: 'Traffic light',
      variables: [
        ['request', 'BOOL', 'input', '%I0.0', 'Pedestrian push button'],
        ['Red', 'BOOL', 'output', '%Q0.0', 'Cars: red'],
        ['Yellow', 'BOOL', 'output', '%Q0.1', 'Cars: yellow'],
        ['Green', 'BOOL', 'output', '%Q0.2', 'Cars: green'],
        ['Walk', 'BOOL', 'output', '%Q0.3', 'Pedestrians: green'],
        ['Req', 'BOOL', 'internal', '', 'Pedestrian request remembered'],
      ],
      grafcets: [
        {
          name: 'Light',
          steps: [
            {
              n: 0,
              kind: 'initial',
              label: 'Pedestrians cross',
              actions: [
                ['continuous', 'Red'],
                ['continuous', 'Walk'],
                ['storedOnActivation', 'Req := 0'],
              ],
            },
            {
              n: 1,
              label: 'Cars drive',
              actions: [
                ['continuous', 'Green'],
                ['storedOnEvent', 'Req := 1', '↑request'],
              ],
            },
            { n: 2, label: 'Cars slow down', actions: [['continuous', 'Yellow']] },
          ],
          transitions: [
            [[0], '10s/X0', [1]],
            [[1], '30s/X1 + Req * 10s/X1', [2]],
            [[2], '3s/X2', [0]],
          ],
          comments: [
            'Simulate (F5) and press "request" while\nthe cars have green: the light changes\nafter 10 s instead of 30 s.',
            'The press is remembered by a stored action\non the event ↑request (flag) and forgotten\nwhen step 0 is activated (arrow ↑).',
          ],
        },
      ],
      scenarios: [{ name: 'Pedestrian presses the button', events: press('request', 14_000) }],
    }),

  /** A machining cycle with a part counter and an alternative branch to maintenance. */
  drillingStation: (): Project =>
    build({
      name: 'Drilling station',
      variables: [
        ['start', 'BOOL', 'input', '%I0.0', 'Cycle start button'],
        ['part', 'BOOL', 'input', '%I0.1', 'Part present'],
        ['clamped', 'BOOL', 'input', '%I0.2', 'Clamp closed'],
        ['low', 'BOOL', 'input', '%I0.3', 'Drill at depth'],
        ['high', 'BOOL', 'input', '%I0.4', 'Drill up'],
        ['released', 'BOOL', 'input', '%I0.5', 'Clamp open'],
        ['ack', 'BOOL', 'input', '%I0.6', 'Maintenance done'],
        ['Clamp', 'BOOL', 'output', '%Q0.0', 'Clamp cylinder'],
        ['Spin', 'BOOL', 'output', '%Q0.1', 'Spindle motor'],
        ['Down', 'BOOL', 'output', '%Q0.2', 'Feed down'],
        ['Up', 'BOOL', 'output', '%Q0.3', 'Feed up'],
        ['Service', 'BOOL', 'output', '%Q0.4', 'Maintenance lamp'],
        ['Count', 'INT', 'internal', '', 'Parts drilled since the last maintenance', 0],
      ],
      grafcets: [
        {
          name: 'Drill',
          steps: [
            { n: 0, kind: 'initial', label: 'Waiting' },
            { n: 1, label: 'Clamping', actions: [['storedOnActivation', 'Clamp := 1']] },
            {
              n: 2,
              label: 'Drilling',
              actions: [
                ['continuous', 'Spin'],
                ['continuous', 'Down'],
              ],
            },
            {
              n: 3,
              label: 'Retracting',
              actions: [
                ['continuous', 'Spin'],
                ['continuous', 'Up'],
              ],
            },
            {
              n: 4,
              label: 'Unclamping',
              actions: [
                ['storedOnActivation', 'Clamp := 0'],
                ['storedOnActivation', 'Count := Count + 1'],
              ],
            },
            {
              n: 5,
              label: 'Maintenance',
              col: 1,
              actions: [
                ['continuous', 'Service'],
                ['storedOnDeactivation', 'Count := 0'],
              ],
            },
          ],
          transitions: [
            [[0], '↑start * part', [1]],
            [[1], 'clamped', [2]],
            [[2], 'low', [3]],
            [[3], 'high', [4]],
            [[4], 'released * (Count < 100)', [0]],
            [[4], 'released * (Count >= 100)', [5]],
            [[5], '↑ack', [0]],
          ],
          comments: [
            'The clamp is set on activation of step 1\nand reset on activation of step 4\n(stored actions, arrows ↑).',
            'After step 4 the grafcet takes one of two\nexclusive paths (OR divergence): back to 0,\nor to maintenance every 100 parts.',
          ],
        },
      ],
    }),

  /** Numeric inputs, comparisons, a conditional action and a timer. */
  tankFilling: (): Project =>
    build({
      name: 'Tank filling',
      variables: [
        ['start', 'BOOL', 'input', '%I0.0', 'Start batch'],
        ['level', 'REAL', 'input', '%IW0', 'Level in %', 0],
        ['temp', 'REAL', 'input', '%IW2', 'Temperature in °C', 20],
        ['Fill', 'BOOL', 'output', '%Q0.0', 'Inlet valve'],
        ['Heat', 'BOOL', 'output', '%Q0.1', 'Heater'],
        ['Mix', 'BOOL', 'output', '%Q0.2', 'Mixer'],
        ['Drain', 'BOOL', 'output', '%Q0.3', 'Outlet valve'],
      ],
      grafcets: [
        {
          name: 'Tank',
          steps: [
            { n: 0, kind: 'initial', label: 'Empty' },
            {
              n: 1,
              label: 'Filling',
              actions: [
                ['continuous', 'Fill'],
                ['continuous', 'Mix', 'level > 20'],
              ],
            },
            {
              n: 2,
              label: 'Heating',
              actions: [
                ['continuous', 'Heat'],
                ['continuous', 'Mix'],
              ],
            },
            { n: 3, label: 'Holding', actions: [['continuous', 'Mix']] },
            { n: 4, label: 'Draining', actions: [['continuous', 'Drain']] },
          ],
          transitions: [
            [[0], 'start * (level < 5)', [1]],
            [[1], 'level >= 80', [2]],
            [[2], 'temp >= 60', [3]],
            [[3], '30s/X3', [4]],
            [[4], 'level < 5', [0]],
          ],
          comments: [
            'The mixer starts during filling only once\nthe level is above 20 % (condition written\nabove the action).',
            'Replay the scenario "One batch" in the\nSimulation panel and watch the chronogram.',
          ],
        },
      ],
      scenarios: [
        {
          name: 'One batch',
          events: [
            ...press('start', 500),
            { t: 4_000, name: 'level', value: 30 },
            { t: 8_000, name: 'level', value: 60 },
            { t: 12_000, name: 'level', value: 85 },
            { t: 18_000, name: 'temp', value: 45 },
            { t: 24_000, name: 'temp', value: 62 },
            { t: 60_000, name: 'level', value: 40 },
            { t: 66_000, name: 'level', value: 2 },
          ],
        },
      ],
    }),

  /** Parallel branches (AND) and a safety grafcet forcing the line. */
  parallelConveyor: (): Project =>
    build({
      name: 'Parallel conveyor',
      variables: [
        ['start', 'BOOL', 'input', '%I0.0', 'Start'],
        ['b1', 'BOOL', 'input', '%I0.1', 'Box at the end of conveyor 1'],
        ['b2', 'BOOL', 'input', '%I0.2', 'Box at the end of conveyor 2'],
        ['estop', 'BOOL', 'input', '%I0.3', 'Emergency stop pressed'],
        ['reset', 'BOOL', 'input', '%I0.4', 'Reset after an emergency stop'],
        ['M1', 'BOOL', 'output', '%Q0.0', 'Conveyor 1 motor'],
        ['M2', 'BOOL', 'output', '%Q0.1', 'Conveyor 2 motor'],
        ['Push', 'BOOL', 'output', '%Q0.2', 'Pusher'],
        ['Alarm', 'BOOL', 'output', '%Q0.3', 'Alarm beacon'],
      ],
      grafcets: [
        {
          name: 'Line',
          steps: [
            { n: 0, kind: 'initial', label: 'Ready' },
            { n: 1, label: 'Conveyor 1', actions: [['continuous', 'M1']] },
            { n: 3, label: 'Box 1 ready' },
            { n: 2, label: 'Conveyor 2', col: 1, actions: [['continuous', 'M2']] },
            { n: 4, label: 'Box 2 ready', col: 1 },
            { n: 5, label: 'Pushing', actions: [['continuous', 'Push']] },
          ],
          transitions: [
            [[0], 'start', [1, 2]],
            [[1], 'b1', [3]],
            [[2], 'b2', [4]],
            [[3, 4], '1', [5]],
            [[5], '2s/X5', [0]],
          ],
          comments: [
            'Both conveyors run at the same time\n(AND divergence, double line). The pusher\nwaits for both boxes (AND convergence).',
          ],
        },
        {
          name: 'Safety',
          steps: [
            { n: 10, kind: 'initial', label: 'Normal' },
            {
              n: 11,
              label: 'Emergency stop',
              actions: [
                ['continuous', 'Alarm'],
                ['forcing', 'Line{INIT}'],
              ],
            },
          ],
          transitions: [
            [[10], 'estop', [11]],
            [[11], '/estop * ↑reset', [10]],
          ],
          comments: [
            'While step 11 is active, the forcing order\nLine{INIT} holds the line in its initial\nsituation. Open both grafcets side by side\n(Ctrl+\\) and simulate an emergency stop.',
          ],
        },
      ],
    }),

  /**
   * A macro-step, three stations in parallel, an inspection that rejects bad bottles, counters,
   * a batch end, a transient step and an action without a step.
   */
  bottlingLine: (): Project =>
    build({
      name: 'Bottling line',
      variables: [
        ['start', 'BOOL', 'input', '%I0.0', 'Start button'],
        ['inPlace', 'BOOL', 'input', '%I0.1', 'Bottle in the stations'],
        ['nozzleLow', 'BOOL', 'input', '%I0.2', 'Filling nozzle down'],
        ['nozzleHigh', 'BOOL', 'input', '%I0.3', 'Filling nozzle up', true],
        ['weight', 'REAL', 'input', '%IW0', 'Bottle weight in g', 0],
        ['capped', 'BOOL', 'input', '%I0.4', 'Cap screwed on'],
        ['ok', 'BOOL', 'input', '%I0.5', 'Camera: bottle OK'],
        ['ejected', 'BOOL', 'input', '%I0.6', 'Reject pusher out'],
        ['ack', 'BOOL', 'input', '%I0.7', 'Operator: start a new batch'],
        ['Conveyor', 'BOOL', 'output', '%Q0.0', 'Conveyor motor'],
        ['NozzleDown', 'BOOL', 'output', '%Q0.1', 'Lower the filling nozzle'],
        ['NozzleUp', 'BOOL', 'output', '%Q0.2', 'Raise the filling nozzle'],
        ['Valve', 'BOOL', 'output', '%Q0.3', 'Filling valve'],
        ['Capper', 'BOOL', 'output', '%Q0.4', 'Capping head'],
        ['Labeller', 'BOOL', 'output', '%Q0.5', 'Labelling roller'],
        ['Camera', 'BOOL', 'output', '%Q0.6', 'Inspection camera and light'],
        ['Ejector', 'BOOL', 'output', '%Q0.7', 'Reject pusher'],
        ['BatchDone', 'BOOL', 'output', '%Q1.0', 'Batch complete lamp'],
        ['Running', 'BOOL', 'output', '%Q1.1', 'Line running lamp'],
        ['Good', 'INT', 'internal', '', 'Good bottles in this batch', 0],
        ['Rejected', 'INT', 'internal', '', 'Rejected bottles in total', 0],
      ],
      grafcets: [
        {
          name: 'Line',
          steps: [
            { n: 0, kind: 'initial', label: 'Ready' },
            { n: 1, label: 'Feed bottle', actions: [['continuous', 'Conveyor']] },
            { n: 2, kind: 'macro', label: 'Filling', ref: 'M2' },
            { n: 3, label: 'Filled' },
            { n: 4, col: 1, label: 'Capping', actions: [['continuous', 'Capper']] },
            { n: 5, col: 1, label: 'Capped' },
            { n: 6, col: 2, label: 'Labelling', actions: [['continuous', 'Labeller']] },
            { n: 7, col: 2, label: 'Labelled' },
            { n: 8, label: 'Inspection', actions: [['continuous', 'Camera']] },
            { n: 9, label: 'Good bottle', actions: [['storedOnActivation', 'Good := Good + 1']] },
            {
              n: 11,
              label: 'Batch complete',
              actions: [
                ['continuous', 'BatchDone'],
                ['storedOnDeactivation', 'Good := 0'],
              ],
            },
            {
              n: 10,
              col: 1,
              label: 'Reject',
              actions: [
                ['continuous', 'Ejector'],
                ['storedOnActivation', 'Rejected := Rejected + 1'],
              ],
            },
          ],
          transitions: [
            [[0], '↑start', [1]],
            [[1], '↑inPlace', [2, 4, 6]],
            [[2], 'nozzleHigh', [3]],
            [[4], 'capped', [5]],
            [[6], '3s/X6', [7]],
            [[3, 5, 7], '1', [8]],
            [[8], 'ok', [9]],
            [[8], '/ok * 2s/X8', [10]],
            [[9], 'Good < 6', [1]],
            [[9], 'Good >= 6', [11]],
            [[10], 'ejected', [1]],
            [[11], '↑ack', [1]],
          ],
          comments: [
            'Each bottle is filled, capped and labelled\nat the same time (AND divergence). Filling\nis macro-step 2: double-click it to open\nits expansion M2.',
            'The camera decides (OR divergence with\nexclusive receptivities): good bottles\nare counted, bad ones pushed out.',
            'Step 9 is crossed without stopping (a\ntransient step): its stored action still\ncounts the bottle. See the evolution log.',
            'After 6 good bottles the batch is\ncomplete until ↑ack starts the next one;\nGood is reset when step 11 is left\n(stored action on deactivation ↓).',
            'Replay "One good, one rejected" in the\nSimulation panel. Below, an action without\na step: the lamp is on whenever step 0\nis not active.',
          ],
          free: [['continuous', 'Running', '/X0']],
        },
        {
          name: 'M2',
          kind: 'macroExpansion',
          steps: [
            { n: 20, label: 'Lower nozzle', actions: [['continuous', 'NozzleDown']] },
            { n: 21, label: 'Fill', actions: [['continuous', 'Valve']] },
            { n: 22, label: 'Drip' },
            { n: 23, label: 'Raise nozzle', actions: [['continuous', 'NozzleUp']] },
          ],
          transitions: [
            [[20], 'nozzleLow', [21]],
            [[21], 'weight >= 500', [22]],
            [[22], '1s/X22', [23]],
          ],
          comments: [
            'Expansion of macro-step 2: entry step\nE (20) to exit step S (23). Step 2 is\nactive while any of these steps is; it is\nleft when S is active and the nozzle is up.',
          ],
        },
      ],
      scenarios: [
        {
          name: 'One good, one rejected',
          events: [
            ...press('start', 500),
            // First bottle: good.
            { t: 1_500, name: 'inPlace', value: true },
            { t: 2_000, name: 'nozzleHigh', value: false },
            { t: 2_300, name: 'nozzleLow', value: true },
            { t: 2_500, name: 'capped', value: true },
            { t: 3_000, name: 'weight', value: 250 },
            { t: 4_000, name: 'weight', value: 510 },
            { t: 5_300, name: 'nozzleLow', value: false },
            { t: 5_600, name: 'nozzleHigh', value: true },
            { t: 6_500, name: 'ok', value: true },
            { t: 7_000, name: 'inPlace', value: false },
            { t: 7_000, name: 'capped', value: false },
            { t: 7_000, name: 'ok', value: false },
            { t: 7_000, name: 'weight', value: 0 },
            // Second bottle: the camera never says OK.
            { t: 8_000, name: 'inPlace', value: true },
            { t: 8_300, name: 'nozzleHigh', value: false },
            { t: 8_500, name: 'nozzleLow', value: true },
            { t: 9_000, name: 'capped', value: true },
            { t: 9_500, name: 'weight', value: 505 },
            { t: 10_800, name: 'nozzleLow', value: false },
            { t: 11_100, name: 'nozzleHigh', value: true },
            ...press('ejected', 14_000),
            { t: 14_500, name: 'inPlace', value: false },
            { t: 14_500, name: 'capped', value: false },
            { t: 14_500, name: 'weight', value: 0 },
          ],
        },
      ],
    }),

  /**
   * Operating modes: an enclosing step runs the production cycle, a stop request ends it at the
   * end of the cycle, a pause freezes it and an emergency stop forces the modes back to stopped.
   */
  operatingModes: (): Project =>
    build({
      name: 'Operating modes',
      variables: [
        ['startBtn', 'BOOL', 'input', '%I0.0', 'Start button'],
        ['stopBtn', 'BOOL', 'input', '%I0.1', 'Stop at the end of the cycle'],
        ['pauseBtn', 'BOOL', 'input', '%I0.2', 'Pause / resume'],
        ['estop', 'BOOL', 'input', '%I0.3', 'Emergency stop pressed'],
        ['reset', 'BOOL', 'input', '%I0.4', 'Reset after an emergency stop'],
        ['part', 'BOOL', 'input', '%I0.5', 'Part at the infeed'],
        ['atPress', 'BOOL', 'input', '%I0.6', 'Part under the press'],
        ['pressUp', 'BOOL', 'input', '%I0.7', 'Press at the top', true],
        ['Conveyor', 'BOOL', 'output', '%Q0.0', 'Infeed conveyor'],
        ['PressDown', 'BOOL', 'output', '%Q0.1', 'Press down'],
        ['Unload', 'BOOL', 'output', '%Q0.2', 'Unloading arm'],
        ['RunLamp', 'BOOL', 'output', '%Q0.3', 'Running lamp'],
        ['StopLamp', 'BOOL', 'output', '%Q0.4', 'Stopped lamp'],
        ['PauseLamp', 'BOOL', 'output', '%Q0.5', 'Paused lamp'],
        ['Alarm', 'BOOL', 'output', '%Q0.6', 'Alarm beacon'],
        ['StopReq', 'BOOL', 'internal', '', 'Stop requested'],
        ['Parts', 'INT', 'internal', '', 'Parts pressed', 0],
      ],
      grafcets: [
        {
          name: 'Modes',
          steps: [
            {
              n: 0,
              kind: 'initial',
              label: 'Stopped',
              actions: [
                ['continuous', 'StopLamp'],
                ['storedOnActivation', 'StopReq := 0'],
              ],
            },
            {
              n: 1,
              kind: 'enclosing',
              label: 'Production',
              ref: 'Cycle',
              actions: [
                ['continuous', 'RunLamp'],
                ['storedOnEvent', 'StopReq := 1', '↑stopBtn'],
              ],
            },
          ],
          transitions: [
            [[0], '↑startBtn * /estop', [1]],
            [[1], 'StopReq * X10', [0]],
          ],
          comments: [
            'Step 1 encloses the grafcet Cycle\n(double-click it to open it). Its step 10\nis activated with step 1, and all of\nCycle is deactivated when step 1 is left.',
            '↑stopBtn sets StopReq (stored action on\nan event): the cycle finishes, then Modes\nstops once Cycle is back in step 10.',
            'Replay a scenario, and open Modes and\nCycle side by side (Ctrl+\\) to watch both.',
          ],
        },
        {
          name: 'Cycle',
          kind: 'enclosed',
          steps: [
            { n: 10, kind: 'initial', label: 'Home' },
            { n: 11, label: 'Infeed', actions: [['continuous', 'Conveyor', '/X41']] },
            { n: 12, label: 'Pressing', actions: [['continuous', 'PressDown']] },
            { n: 13, label: 'Press returning' },
            {
              n: 14,
              label: 'Unloading',
              actions: [
                ['continuous', 'Unload'],
                ['storedOnActivation', 'Parts := Parts + 1'],
              ],
            },
          ],
          transitions: [
            [[10], 'part', [11]],
            [[11], 'atPress', [12]],
            [[12], '2s/X12', [13]],
            [[13], 'pressUp', [14]],
            [[14], '1s/X14', [10]],
          ],
          comments: [
            'Enclosed by step 1 of Modes: the steps\nmarked * start when step 1 is activated.',
            'The conveyor stops during a pause: its\naction is conditional on /X41 (step 41\nof the grafcet Pause).',
          ],
        },
        {
          name: 'Safety',
          steps: [
            { n: 30, kind: 'initial', label: 'Normal' },
            {
              n: 31,
              label: 'Emergency stop',
              actions: [
                ['continuous', 'Alarm'],
                ['forcing', 'Modes{0}'],
              ],
            },
          ],
          transitions: [
            [[30], 'estop', [31]],
            [[31], '/estop * ↑reset', [30]],
          ],
          comments: [
            'An emergency stop forces Modes into step\n0 (Modes{0}): step 1 is left, so the\nwhole Cycle grafcet is deactivated.',
          ],
        },
        {
          name: 'Pause',
          steps: [
            { n: 40, kind: 'initial', label: 'Running' },
            {
              n: 41,
              label: 'Paused',
              actions: [
                ['continuous', 'PauseLamp'],
                ['forcing', 'Cycle{*}'],
              ],
            },
          ],
          transitions: [
            [[40], '↑pauseBtn', [41]],
            [[41], '↑pauseBtn', [40]],
          ],
          comments: [
            'Cycle{*} freezes Cycle in its current\nsituation: no step changes until the\npause is released, timers included.',
          ],
        },
      ],
      scenarios: [
        {
          name: 'Pause, then stop at the end of the cycle',
          events: [
            ...press('startBtn', 500),
            { t: 1_000, name: 'part', value: true },
            { t: 2_000, name: 'atPress', value: true },
            { t: 2_000, name: 'part', value: false },
            { t: 2_200, name: 'pressUp', value: false },
            ...press('pauseBtn', 3_000),
            ...press('pauseBtn', 5_000),
            { t: 5_500, name: 'pressUp', value: true },
            { t: 5_500, name: 'atPress', value: false },
            ...press('stopBtn', 6_000),
          ],
        },
        {
          name: 'Emergency stop',
          events: [
            ...press('startBtn', 500),
            { t: 1_000, name: 'part', value: true },
            { t: 1_500, name: 'estop', value: true },
            { t: 3_000, name: 'estop', value: false },
            ...press('reset', 3_500),
          ],
        },
      ],
    }),
} satisfies Record<string, () => Project>;

export type ExampleId = keyof typeof EXAMPLES;
export const EXAMPLE_IDS = Object.keys(EXAMPLES) as ExampleId[];
