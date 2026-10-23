/**
 * Example projects of the start screen, built from a compact description with the editor's own
 * model operations and auto-layout, so they are always valid and drawn like user charts.
 */
import { computeGeometry, grafcetBounds, PITCH, ROW } from '@/core/layout/geometry';
import { autoLayout } from '@/core/layout/autoLayout';
import { createGrafcet, createProject, newId } from '@/core/model/factory';
import { addAction, addComment, addStep, addTransition } from '@/core/model/ops';
import type {
  ActionKind,
  GrafcetKind,
  Project,
  ScenarioEvent,
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
}
interface ExGrafcet {
  name: string;
  kind?: GrafcetKind;
  steps: ExStep[];
  /** [from step numbers, receptivity, to step numbers] */
  transitions: [number[], string, number[]][];
  comments?: string[];
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
    for (const text of eg.comments ?? []) {
      const c = addComment(g, { x: (b ? b.x + b.width : 300) + 60, y }, text);
      y += (c.text.split('\n').length + 1) * 16 + 24;
    }
    p.grafcets[g.id] = g;
    p.grafcetOrder.push(g.id);
  }
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
} satisfies Record<string, () => Project>;

export type ExampleId = keyof typeof EXAMPLES;
export const EXAMPLE_IDS = Object.keys(EXAMPLES) as ExampleId[];
