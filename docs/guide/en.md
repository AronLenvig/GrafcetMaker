# What is GRAFCET? A complete guide to IEC 60848

**GRAFCET** is a graphical language that describes how a sequential control system behaves: a
machine, a production line, a traffic light. A GRAFCET chart is a series of **steps** (what the
system is doing) linked by **transitions** (the conditions for moving on). It is standardised
internationally as **IEC 60848** and is the origin of the Sequential Function Chart (SFC) language
of PLCs.

This guide explains every element and rule of the standard with diagrams and examples. All the
diagrams were drawn with [GrafcetMaker](app:), a free GRAFCET editor and simulator that runs in your
browser: open the examples and watch them evolve step by step.

## What GRAFCET stands for

GRAFCET stands for _GRAphe Fonctionnel de Commande Étape-Transition_, French for "step-transition
functional control chart". It was proposed in 1977 by a working group of AFCET, the French
association for cybernetics, together with ADEPA, the French agency for the development of
automated production. It grew out of Petri nets and was designed as a clear, technology-independent
way to write down what a control system must do, before anyone writes a line of PLC code.

- **1982**: French standard NF C03-190.
- **1988**: international standard IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 edition 2, _GRAFCET specification language for sequential function charts_.
- **2013**: IEC 60848 edition 3, the current one, also published in Europe as EN 60848 (DIN EN
  60848 in Germany).

GRAFCET is taught in technical schools, vocational training and engineering degrees, especially in
French-, German-, Spanish- and Portuguese-speaking countries. By convention, _GRAFCET_ is the
language and a _grafcet_ is one chart written in it.

## The elements of a grafcet

<!-- figure: anatomy | The parts of a grafcet -->

- A **step** is a square with a number. It stands for a stable situation of the system: _waiting_,
  _filling_, _drilling_. At any moment each step is either **active** or **inactive**, and the set
  of active steps is the **situation** of the grafcet. The step variable `X1` is true while step 1
  is active.
- An **initial step**, drawn as a double square, is active when the system starts. Every grafcet
  needs at least one.
- A **transition** is a short horizontal bar across a link. It always sits between steps: two steps
  are never linked directly, and neither are two transitions.
- The **receptivity** is the condition written next to a transition, for example `start` or
  `pressure > 6`. The receptivity `1` is always true.
- **Directed links** connect steps and transitions. They are read from top to bottom; a link that
  goes upward carries an arrow.
- **Actions** are rectangles to the right of a step: what the system does while the step is active,
  for example _run the motor_.

## The five evolution rules

IEC 60848 defines exactly how a grafcet evolves, with five rules.

1. **Initial situation**: at start, the initial steps are active and all the others are inactive.
2. **Clearing a transition**: a transition is **enabled** when all the steps just above it are
   active. It is **cleared** (crossed) when it is enabled and its receptivity is true.
3. **Evolution of the active steps**: clearing a transition activates all the steps just below it
   and deactivates all the steps just above it.
4. **Simultaneous clearing**: all the transitions that can be cleared at the same moment are
   cleared simultaneously.
5. **Simultaneous activation and deactivation**: a step that is activated and deactivated at the
   same moment stays active.

When an input changes, the rules are applied again and again, with the same inputs, until no
transition can be cleared any more. This is the **search for stability**. A step that is activated
and left again during this search is an **unstable step** (or transient step): its continuous
actions are never executed, but its stored actions are. For example, if the receptivities below
steps 1 and 2 are both already true when step 1 becomes active, the grafcet goes straight through
step 2 to step 3, and the outputs of step 2 never switch on.

## Receptivities: conditions, edges and timers

A receptivity is a logical expression of inputs, internal variables, step variables and time. The
textbook notation and the way you type it in GrafcetMaker:

| Notation          | Meaning                                                         | Typed in GrafcetMaker |
| ----------------- | --------------------------------------------------------------- | --------------------- |
| a · b             | a AND b                                                         | `a * b`               |
| a + b             | a OR b                                                          | `a + b`               |
| a with an overbar | NOT a                                                           | `/a`                  |
| ↑a                | rising edge: true at the moment a becomes true                  | `↑a` or `RE a`        |
| ↓a                | falling edge: true at the moment a becomes false                | `↓a` or `FE a`        |
| X3                | step 3 is active                                                | `X3`                  |
| 5 s/X2            | true 5 s after step 2 became active                             | `5s/X2`               |
| t1/a/t2           | true t1 after a becomes true, false again t2 after a goes false | `2s/a/1s`             |
| [level > 80]      | comparison of a numeric value                                   | `level > 80`          |
| = 1               | always true                                                     | `1`                   |

<!-- figure: timer | A timer receptivity: the heater runs for 5 seconds -->

Edges matter when a signal stays true: with `↑start`, the cycle starts once per press of the button
and not again as long as it is held. The full syntax of the editor is described in
[Writing receptivities](app:#help/expressions).

## Actions

<!-- figure: actions | Continuous, conditional and stored actions on step 4 -->

- A **continuous action** is true as long as its step is active: _Lamp_ is on while step 4 is
  active.
- A **conditional action** is a continuous action with an **assignment condition** written above
  its box: _Horn_ sounds only while step 4 is active **and** `alarm` is true.
- **Delayed** and **time-limited** actions are conditional actions whose condition uses a timer:
  with `3s/X4` the output switches on 3 s after step 4 became active; with `/(3s/X4)` it is on for
  the first 3 s only.
- A **stored action** assigns a value once, and the value stays until another action changes it. It
  runs when the step is **activated** (arrow pointing up), when it is **deactivated** (arrow
  pointing down) or **on an event** while the step is active (a flag with the event, here `↑reset`).
  Counters such as `C := C + 1` are typical stored actions.

An output driven by continuous actions follows the steps automatically. An output set by a stored
action stays set until another stored action resets it, so plan where that happens.

## Sequences, alternatives and parallel branches

### Choosing between paths: OR divergence

When a step is followed by several transitions, the grafcet takes the path whose receptivity is
true: an **alternative branch**, drawn with a single horizontal line (**OR divergence**, called a
_selection of sequence_ in SFC). The paths join again on a single line (**OR convergence**).

<!-- figure: or | OR divergence and convergence: one branch or the other -->

Make the receptivities **exclusive**, so that they can never be true together, as `a` and
`/a * b` here. Otherwise both transitions are cleared at once (rule 4) and both branches become
active. GrafcetMaker warns you when it cannot prove that alternative receptivities are exclusive.

### Doing things at the same time: AND divergence

When a transition is followed by several steps, they are all activated together: **parallel
branches**, drawn with a double line (**AND divergence**, a _simultaneous sequence_ in SFC). The
branches end on a double line too (**AND convergence**): the transition below it is enabled only
when the last step of every branch is active, so it waits for all branches to finish. This is how a
grafcet **synchronises** tasks.

<!-- figure: and | AND divergence and convergence: drilling and clamping at the same time -->

### Loops, jumps, sources and sinks

- A **loop** goes back to an earlier step through an upward link with an arrow: the usual way to
  repeat a cycle.
- A **jump** (step skip) is an OR divergence whose one branch leads straight to a later step, for
  example to skip an optional operation.
- A **source transition** has no step above it. It is always enabled, so it is cleared whenever its
  receptivity is true; use an edge such as `↑a`.
- A **sink transition** has no step below it: clearing it only deactivates the steps above it.

## Structuring large applications

Real machines are described with several grafcets that work together.

- **Partial grafcets** each describe one part of the system, for example the production cycle,
  the modes of operation and safety. They run at the same time and see each other's steps through
  the step variables `Xn`. Together they form the global grafcet.
- A **macro-step** stands for a detailed sequence drawn on its own sheet, its **expansion**. The
  expansion has one input step **E** and one output step **S**. Clearing the transition above the
  macro-step activates step E; the transition below the macro-step is enabled when step S is
  active.
- An **enclosing step** contains one or more whole grafcets that live only while it is active. When
  it is activated, the enclosed steps marked with an asterisk become active; when it is deactivated,
  every enclosed step is deactivated.
- A **forcing order**, drawn in a double-framed action box, imposes a situation on another
  grafcet: `G2{8}` forces only step 8 of G2 to be active, `G2{*}` freezes G2 in its current
  situation and `G2{}` deactivates all its steps. A forced grafcet cannot evolve by itself. Forcing
  is the standard way to describe emergency stops and initialisation.

<!-- figure: macro | A macro-step: two horizontal lines inside the square -->

## GRAFCET and SFC

The Sequential Function Chart (SFC) language of IEC 61131-3 was derived from GRAFCET and looks
almost the same, but the two do not have the same purpose.

|           | GRAFCET (IEC 60848)                                                  | SFC (IEC 61131-3)                                         |
| --------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| Purpose   | Specification: the required behaviour, independent of the technology | Programming language executed by a PLC                    |
| Evolution | All clearable transitions at once, then search for stability         | Usually one evolution per PLC cycle, depending on the PLC |
| Actions   | Continuous, conditional, delayed, time-limited and stored actions    | Action qualifiers N, S, R, P, P0, P1, L, D, SD, DS and SL |
| Hierarchy | Partial grafcets, macro-steps, enclosing steps and forcing orders    | Through the structure of the program                      |

A usual workflow is to write and check the GRAFCET first, then implement it in SFC, ladder or
Structured Text. GrafcetMaker generates Structured Text and PLCopen TC6 XML from a chart as a
starting point for that implementation; always review the generated code before use.

## Examples

### Traffic light with a pedestrian button

<!-- figure: example-trafficLight | Traffic light: timers and a stored request -->

Step 0 gives pedestrians the green light for 10 s (`10s/X0`), then step 1 lets the cars drive. Cars
keep the green for 30 s, but a press on the pedestrian button shortens this to 10 s: the press is
remembered by a stored action on the event `↑request` and forgotten when step 0 becomes active
again. Step 2 shows yellow for 3 s.

### Drilling station with a part counter

<!-- figure: example-drillingStation | Drilling station: a machining cycle with maintenance every 100 parts -->

A machining cycle: clamp the part, drill down, retract, unclamp. The clamp is set and reset by
stored actions, and step 4 counts the parts. After step 4, an OR divergence with exclusive
receptivities goes back to the start, or to maintenance every 100 parts.

The editor has more examples: a tank filling with numeric inputs, a parallel conveyor with a
safety grafcet that forces the line, a bottling line (macro-step, three stations in parallel,
inspection and counters) and operating modes (an enclosing step, a pause that freezes the cycle,
an emergency stop). Open them from the start screen of [GrafcetMaker](app:).

## Draw and simulate GRAFCET online

[GrafcetMaker](app:) is a free, open-source GRAFCET editor made for automation engineers, teachers
and students. It runs entirely in your browser, works offline and needs no account; your charts
stay on your computer.

- Draw steps, transitions, actions and branches with the mouse or the keyboard, and keep everything
  tidy with automatic layout.
- Write receptivities with autocomplete and a variable table, and get clear errors with quick fixes.
- Simulate with the IEC 60848 rules: active steps, timers, edges, unstable steps, forcing and a
  chronogram of every variable.
- Structure projects with partial grafcets, macro-steps, enclosing steps and forcing orders.
- Export to PDF with a title block, SVG and PNG, or to Structured Text and PLCopen TC6 XML, and
  share a whole project as a link.

[Open the free GRAFCET editor](app:)

## Frequently asked questions

### What is GRAFCET used for?

To specify the behaviour of automated systems with sequences: machines, assembly lines, packaging,
batch processes, lifts, traffic lights. The chart is the reference shared by the people who design
the machine, program the PLC and test it.

### Is GRAFCET the same as SFC?

No. SFC (IEC 61131-3) was derived from GRAFCET and uses the same symbols, but GRAFCET is a
specification language with precise evolution rules, and SFC is a PLC programming language whose
execution depends on the controller. See [GRAFCET and SFC](#grafcet-and-sfc).

### What is the difference between a step and a transition?

A step is a situation that lasts (the system is filling the tank); a transition is the instant
when the system moves from one situation to the next, when its receptivity becomes true (the tank
is full).

### What does X1 mean?

`X1` is the step variable of step 1: it is true while step 1 is active. It is used in
receptivities, in conditions of actions and in other grafcets, for example `5s/X1` or `X1 * /X5`.

### What is an unstable step?

A step that is activated and deactivated again within a single search for stability, because the
receptivity below it was already true. Its continuous actions are not executed; its stored actions
are.

### How do I turn a GRAFCET into a PLC program?

Each step becomes a memory bit, each transition a condition that sets the steps below and resets
the steps above, and outputs are written from the step bits. You can do this by hand in ladder or
Structured Text, use the SFC language of your PLC, or let GrafcetMaker generate Structured Text
or PLCopen XML as a starting point.

### Is there free GRAFCET software?

Yes: [GrafcetMaker](app:) is free and open source (MIT licence). It runs in any modern browser on
Windows, macOS, Linux, tablets and phones, and companies can host it on their own network.
