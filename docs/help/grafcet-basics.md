# GRAFCET basics

GRAFCET (IEC 60848) describes the behaviour of a sequential system — a machine, a process, a
traffic light — as a series of **steps** linked by **transitions**. It is the specification
language behind the SFC language of PLCs (IEC 61131-3).

<!-- figure: anatomy | The parts of a grafcet -->

## Steps

A **step** is a stable situation of the system: _waiting_, _filling_, _drilling_. It is drawn as a
square with its number. At any moment a step is either **active** or **inactive**; the set of
active steps is the **situation** of the grafcet.

- An **initial step** (double square) is active when the system starts. A grafcet needs at least
  one.
- The variable `X3` is true while step 3 is active. You can use it in receptivities and conditions.

## Transitions and receptivities

A **transition** (short horizontal bar) links steps. Its **receptivity**, written next to it, is
the condition to move on: an input (`start`), a combination (`start * /door`), an edge (`↑b`), a
timer (`5s/X2`) or a comparison (`level >= 80`). The receptivity `1` is always true.

- A transition is **enabled** when all the steps just above it are active.
- An enabled transition is **cleared** (crossed) as soon as its receptivity is true.

## Actions

Rectangles to the right of a step are its **actions**: what the system does while the step is
active, e.g. _run the pump_. A **continuous action** names an output that is true while the step is
active. Stored actions change a value once, when a step is activated or deactivated or when an
event occurs. See [Actions](actions.md).

## The five evolution rules

These rules, from IEC 60848, decide how a grafcet evolves. The simulator applies them exactly.

1. **Initial situation**: at start, the initial steps are active.
2. **Clearing condition**: a transition is cleared when it is enabled and its receptivity is true.
3. **Clearing**: clearing a transition activates all the steps just below it and deactivates all
   the steps just above it.
4. **Simultaneous clearing**: all transitions that can be cleared at the same time are cleared at
   the same time.
5. **Activated and deactivated at once**: a step that is activated and deactivated at the same time
   stays active.

After an input change, the rules are applied again and again until no transition can be cleared:
this is the **search for stability**. Steps that are activated and left again during this search
are **unstable** (transient): their continuous actions are not executed, but their stored actions
are.

## Choosing between paths: OR

When a step is followed by several transitions, the grafcet takes the path whose receptivity is
true: an **alternative branch**, drawn with a single horizontal line (**OR divergence**). The paths
join again on a single line (**OR convergence**).

<!-- figure: or | OR divergence and convergence -->

Make the receptivities **exclusive** (they can never be true together), here `a` and `/a * b`.
Otherwise both paths would be taken at once. GrafcetMaker warns you when it cannot prove that
alternative receptivities are exclusive, and offers to give one branch priority.

## Doing things at the same time: AND

When a transition is followed by several steps, they are all activated together: **parallel
branches**, drawn with a double line (**AND divergence**). The branches end on a double line too
(**AND convergence**): the transition below it is enabled only when the last step of every branch
is active, so it waits for all branches to finish.

<!-- figure: and | AND divergence and convergence -->

## Loops

A link going upward, drawn with an arrow, returns to an earlier step: the usual way to repeat a
cycle. Press <kbd>L</kbd> on a step, then click the step to go back to.

## Bigger applications

- A project can contain several **partial grafcets** that run together, e.g. one for the cycle and
  one for safety. They see each other's steps through `Xn`.
- A **macro-step** stands for a detailed sequence drawn on its own sheet, its **expansion**.
- An **enclosing step** contains a whole grafcet that runs only while it is active.
- A **forcing order** imposes a situation on another grafcet, e.g. an emergency stop.

See [Macro-steps, enclosing steps and forcing](hierarchy.md).

## Learn more

- [Writing receptivities](expressions.md) — the full expression syntax.
- [Glossary](glossary.md) — every standard term in one place.
- The exact interpretation of each rule in GrafcetMaker is documented in `docs/semantics.md` of the
  source repository.
