# Troubleshooting

GrafcetMaker checks your project while you work. The counters at the top right show the number of
**errors** (red) and **warnings** (orange); click them to open the **Problems** list. Click a problem
to jump to the element, and use its fix button when there is one. Elements with a problem also
carry a badge on the diagram: hover it for the details.

## Errors

**Grafcet G1 has no initial step.** Nothing can ever become active. Select the first step and press
the fix **Make step … initial**, or set its Kind to _Initial step_.

**Several steps have the same number.** Numbers must be unique in a grafcet, or `Xn` would be
ambiguous. Use **Renumber steps** or change a number with <kbd>F2</kbd>.

**Empty receptivity.** Every transition needs a condition. Use `1` for a transition that is always
true (the fix does it for you).

**Unknown variable.** The name is not declared. Use the fix to create it, or pick the suggested name
if it is a typo.

**Expression problems** (unexpected character, missing parenthesis…). The problem box under the
field marks the position and gives a hint. A frequent one: `/` means NOT before a condition, so
write `a * /b` for "a and not b". See [Writing receptivities](expressions.md).

**An action assigns an input.** Inputs come from the process and cannot be written. Change the
variable's direction or use another variable.

**Forcing order targets a missing grafcet or step.** Check the grafcet name and step numbers in the
order.

## Warnings

**Step … can never become active.** No path leads to it from an initial step. Link it, or delete it.

**Step … has no outgoing transition.** Once active, it stays active for ever. Usually a loop back is
missing (<kbd>L</kbd>).

**The alternative branches are not exclusive.** Both receptivities can be true together, which would
activate both branches. Make them exclusive, e.g. `a` and `/a * b`, or use the fix **Give priority
to …**.

**Possible endless transient evolution.** A loop of transitions could all be true at once, so the
grafcet would never settle. Add a condition, often an edge (`↑start`), that cannot stay true.

**Output set by continuous actions of steps that can be active together.** Two parallel branches
drive the same output. Drive it from one place, or use stored actions.

**An action without a step is stored on deactivation.** Without a step the action is always
active and never deactivated, so it never runs. Attach it to a step, or change its kind.

**Output set by an action without a step and by another action.** The output is true whenever any
of them is. Make sure that is what you want.

**Stored on an event but no event.** Enter the event (e.g. `↑b`) in the Properties panel.

**Expansion needs exactly one entry step and one exit step.** In a macro-step expansion, the entry
step has no transition above it and the exit step none below it.

## Information

**Variable … is not used.** It is declared but no expression uses it. Delete it with the fix, or
keep it for later.

## Other questions

**The simulation stopped with a transient loop.** See the warning above: the simulator stops after
1000 iterations without stability, at the time shown.

**My timer does not run.** Timers only advance while the clock runs: press <kbd>F5</kbd> to run, or
<kbd>F10</kbd> to jump to the next timer.

**A transition clears again and again.** If its receptivity stays true, the grafcet goes round as
fast as it can. Use an edge `↑a` to react once per press.

**I lost my work.** Look in **File › Local history**: snapshots are kept in the browser. After a reload
or a crash, GrafcetMaker reopens your last project automatically, unsaved changes included.

**The file does not open.** Only `.grafcet.json` files saved by GrafcetMaker can be opened. A file
saved by a newer version needs that newer version.
