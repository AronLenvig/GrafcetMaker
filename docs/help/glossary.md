# Glossary

The standard GRAFCET terms (IEC 60848) as used in GrafcetMaker.

| Term                          | Meaning                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **Action**                    | What the system does in relation to a step; drawn in a rectangle right of the step.        |
| **Active step**               | A step that is part of the current situation; it carries a token in simulation.            |
| **AND convergence**           | Double line where parallel branches end; the next transition waits for all of them.        |
| **AND divergence**            | Double line after a transition that activates several steps at once (parallel branches).   |
| **Assignment condition**      | Condition of a continuous action: the output is true only while the condition holds too.   |
| **Clear (a transition)**      | Cross it: activate the steps below, deactivate the steps above.                            |
| **Clearable**                 | Enabled and with a true receptivity: the transition will clear.                            |
| **Continuous action**         | Output true while its step is active (and its condition is true).                          |
| **Edge**                      | Instant change of a signal: rising edge ↑a (false → true), falling edge ↓a (true → false). |
| **Enabled transition**        | A transition whose upstream steps are all active.                                          |
| **Enclosing step**            | Step that contains an enclosed grafcet, which runs only while the step is active.          |
| **Event**                     | An edge or other instant condition that triggers a stored action on event.                 |
| **Expansion**                 | The grafcet drawn for a macro-step, from its entry step E to its exit step S.              |
| **Forcing order**             | Action imposing a situation on another partial grafcet, e.g. `G2{8}`.                      |
| **Initial step**              | Step active at start; drawn as a double square.                                            |
| **Macro-step**                | Step standing for an expansion drawn on its own sheet.                                     |
| **OR convergence**            | Single line where alternative branches join again.                                         |
| **OR divergence**             | Single line after a step followed by several transitions; one path is chosen.              |
| **Partial grafcet**           | One of the grafcets of a project; all run together.                                        |
| **Receptivity**               | The condition written next to a transition.                                                |
| **Search for stability**      | Repeating the evolution rules after an input change until no transition can clear.         |
| **Situation**                 | The set of active steps at a given moment.                                                 |
| **Source / sink transition**  | A transition with no step above it / below it.                                             |
| **Step**                      | A stable situation of the system; drawn as a numbered square.                              |
| **Step variable**             | `Xn`: true while step n is active.                                                         |
| **Stored action**             | Action executed once — on activation, on deactivation or on an event — whose effect lasts. |
| **Timer**                     | `t/c`: true a time t after condition c became true, e.g. `5s/X2`.                          |
| **Transient (unstable) step** | Step activated and deactivated during one search for stability.                            |
| **Transition**                | Bar between steps; the grafcet evolves by clearing transitions.                            |
