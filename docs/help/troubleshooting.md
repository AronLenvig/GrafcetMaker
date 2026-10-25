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

**Unknown variable.** The name is not declared (a file written elsewhere, or a variable deleted).
Names you type in a receptivity or an action are created for you; for the others use the fix to
create it, or pick the suggested name if it is a typo.

**Expression problems** (unexpected character, missing parenthesis…). The problem box under the
field marks the position and gives a hint. A frequent one: `/` means NOT before a condition, so
write `a * /b` for "a and not b". See [Writing receptivities](expressions.md).

**An action assigns an input.** Inputs come from the process and cannot be written. Change the
variable's direction or use another variable.

**Forcing order targets a missing grafcet or step.** Check the grafcet name and step numbers in the
order.

**Forcing orders form a cycle.** A grafcet cannot force one that forces it, directly or through
others. Remove one of the orders, or let a third grafcet force both.

**Macro-steps and enclosing steps form a cycle.** A grafcet cannot contain itself: a macro-step or
enclosing step leads back, directly or through others, to its own grafcet. Set that step to
_Step_ and back: it gets a sub-grafcet of its own.

**Macro-step … has no expansion grafcet** (or **Enclosing step … has no enclosed grafcet**). Its
sub-grafcet was deleted. Set the step's Kind to _Step_ and back to _Macro-step_ (or _Enclosing
step_) to get a new one, or keep it a normal step.

**Grafcet … is used by several steps.** Each macro-step and enclosing step needs its own
sub-grafcet. Set one of the steps to _Step_ and back: it gets a sub-grafcet of its own.

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

**Conditional action without a condition.** It acts like a continuous action until you enter its
condition in the Properties panel.

**Stored actions on a macro-step are ignored.** A macro-step is active through its expansion: put
the stored actions on a step of the expansion.

**Forced to the empty situation, never undone.** An order such as `G2{}` deactivates every step of
G2, and nothing activates them again. Use `G2{INIT}` to restart G2 in its initial situation.

**Expansion (or enclosed grafcet) … is not used.** No macro-step or enclosing step points to it.
Delete its tab if you no longer need it.

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

**The file does not open.** GrafcetMaker opens its own `.grafcet.json` files and grafcet.io files
(`.grafcetio`); the message says why a file was rejected. A file saved by a newer version of
GrafcetMaker needs that newer version.
