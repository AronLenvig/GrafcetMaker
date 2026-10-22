# Actions

Actions are the rectangles to the right of a step. They say what the system does while, or when,
the step is active. Select a step and press <kbd>A</kbd> to add one; press <kbd>A</kbd> again on
an action to add the next one. Choose its **kind** in the **Properties** panel.

## Continuous actions

The most common kind. The text is the name of an output (or internal variable), e.g. `Pump`. The
output is true **while** the step is active, and false as soon as no active step drives it.

An optional **assignment condition** makes it a _conditional action_: the output is true while the
step is active **and** the condition is true. It is drawn on a short line above the box.

<!-- figure: continuous | Lamp while step 4 is active; Horn only while alarm is also true -->

Timers in the condition give the delayed and time-limited actions of other notations:

- `5s/X4` — delayed: the output turns on 5 s after step 4 became active.
- `/(5s/X4)` — time-limited: on during the first 5 s of step 4 only.

> **Note:** steps crossed during a transient evolution (see [GRAFCET basics](grafcet-basics.md))
> do not execute their continuous actions.

## Stored actions

A stored action changes a value **once**, and the value stays until another action changes it. Its
text is an assignment: `C := C + 1`, `Motor := 1`, `Speed := 2.5`.

- **On activation** — executed when the step becomes active. Drawn with an arrow **↑ above** the
  box.
- **On deactivation** — executed when the step becomes inactive. Drawn with an arrow **↓ below**
  the box.
- **On event** — executed each time the **event** occurs while the step is active, e.g. `↑reset`.
  Drawn with a **flag** at the top right, next to the event. Enter the event in the Properties
  panel; an action on event without an event never executes and is reported as a problem.

<!-- figure: stored | Stored on activation (↑), on deactivation (↓) and on an event (flag) -->

Activation and deactivation actions can also have a condition: they are executed only if it is
true at that moment.

Stored actions are executed even by steps that are only crossed during a transient evolution.
Use them to count, to latch a value (`Motor := 1` in one step, `Motor := 0` in another) or to
remember that something happened.

## Forcing orders

A forcing order imposes a situation on another partial grafcet while its step is active:
`G2{8}` activates step 8 of grafcet G2 only, `G2{*}` freezes G2 in its current situation, `G2{}`
deactivates all its steps and `G2{INIT}` puts it back in its initial situation. It is drawn with a
double frame. See [Macro-steps, enclosing steps and forcing](hierarchy.md).

## Actions without a step

You can sketch an action before deciding which step it belongs to: with nothing selected, press
<kbd>A</kbd> (or pick the **Action** tool) and click empty canvas. The action is drawn on its own,
without a link. It never executes, and the Problems list reminds you of it. To attach it, drag it
onto a step (the step lights up), or choose its **Step** in the Properties panel. Choosing **Not
attached** there detaches an action again.

## Several actions

A step can have any number of actions; they are drawn side by side. Select a step to see all its
actions in the Properties panel, where **Move action left / right** changes their order. Delete an
action with <kbd>Del</kbd>.

> **Watch out:** when two steps that can be active together both drive the same output with
> continuous actions, the result is hard to read. GrafcetMaker warns you about it.
