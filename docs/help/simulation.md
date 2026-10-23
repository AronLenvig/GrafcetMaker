# Simulation

The simulator runs your grafcet exactly according to the IEC 60848 rules, so you can test it before
it reaches a PLC.

## Start and stop

Press <kbd>F5</kbd> (or **Simulate › Start simulation**). The diagram is locked, the simulation
controls replace the tools at the top, the **Simulation** panel appears on the left (fold it
with its chevron to see more of the diagram) and the clock starts running. <kbd>Shift+F5</kbd> stops and returns to
editing.

## Change inputs

The **Simulation** panel lists the inputs:

- **BOOL** inputs have a switch, and a **Hold** button for a momentary press (like a push button;
  with the keyboard, hold <kbd>Space</kbd> on it).
- **INT**, **REAL** and **TIME** inputs have a value field.

The grafcet evolves as soon as an input changes.

## Time

Time in the simulator is virtual and deterministic.

- <kbd>F5</kbd> pauses the clock and runs it again. Timers (`5s/X2`) only advance while it runs.
- The speed goes from ×0.25 to ×10. **Fast** jumps straight from one timer expiry to the next.
- <kbd>F10</kbd> jumps to the next timer expiry and runs that cycle.
- **⟲** restarts from the initial situation.

The bar shows the time, the cycle number and when the next timer expires. The default speed is in
**Settings › Simulation**.

## What you see on the diagram

- **Active steps** are filled and carry a token dot, with the time they have been active below.
- **Enabled transitions** have a ▶ marker; transitions flash when they clear.
- **True signals** are green, bold and underlined in receptivities and action conditions: a
  variable that is on, an active step `Xn`, a comparison that holds. What is not green is what
  the transition still waits for. Under a NOT bar the colour shows the signal itself: in `/a`,
  `a` is green when `a` is on.
- **Continuous actions** being executed show a ✓; **stored actions** show the current value of
  their variable.

## Evolution log

The Simulation panel's log (folded: click **Evolution log** to open it) lists every cycle with
what triggered it and each iteration of the search for stability: transitions cleared, steps
activated and deactivated. Transient evolutions (steps crossed without stopping) are visible
there. Click a cycle to see the diagram as it was at that moment.

## Watching several grafcets

In a split view (<kbd>Ctrl+\</kbd>) both panes show the simulation live: watch a production grafcet
and its safety grafcet, or a macro-step and its expansion, side by side.

## Chronogram

The **Chronogram** tab draws every variable and the steps of the open grafcet over time. Click or
drag in it to move back in time: the diagram follows. **Back to live** returns to the present.

## Scenarios

To repeat a test exactly, record it:

1. Click **Record**: the simulation restarts and records every input change with its time.
2. Run your test, then stop the recording and name the scenario. It is saved in the project.
3. **Replay** restarts the simulation and plays the scenario back.

## When the grafcet never settles

If transitions keep clearing each other (for example a loop where every receptivity is true), the
evolution never becomes stable. The simulator stops after 1000 iterations and reports a
**transient loop** in Problems. Add a condition (often an edge `↑a`) so the loop cannot run
forever. See [Troubleshooting](troubleshooting.md).
