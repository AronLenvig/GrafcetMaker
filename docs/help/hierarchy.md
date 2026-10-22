# Macro-steps, enclosing steps and forcing

Large applications are easier to read when they are split up. GRAFCET offers three tools, all
available in GrafcetMaker.

## Several partial grafcets

A project can hold several **partial grafcets**, one per tab above the canvas, e.g. _G1_ for the
production cycle and _G2_ for the safety logic. They all run at the same time and can watch each
other through step variables (`X21` in G1 is true while step 21 of G2 is active).

- Click **+** next to the tabs to add one. Its step numbers start at the next free ten (20, 30…),
  so `Xn` references stay unambiguous.
- Double-click a tab (or press <kbd>F2</kbd> on it) to rename it; drag it sideways to change the
  order; press <kbd>Del</kbd> on it to delete it. <kbd>Ctrl</kbd>+click or <kbd>Shift</kbd>+click picks
  several tabs to delete them together. Right-click a tab for more. Many tabs scroll with the mouse wheel or the ‹ ›
  buttons.

## Macro-steps

A **macro-step** stands for a detailed sequence drawn on its own sheet, its **expansion**. It is
drawn as a step with two horizontal lines.

<!-- figure: macro | A macro-step in the main sequence -->

1. Select a step and set its **Kind** to _Macro-step_ in the Properties panel (or
   **Edit › Make macro-step**).
2. A new tab opens with the expansion: an entry step **E** and an exit step **S** linked by a
   transition. Draw the detailed sequence between them.
3. Double-click the macro-step (or press <kbd>Alt+↓</kbd>) to open its expansion; <kbd>Alt+↑</kbd>
   goes back to the macro-step.

When the macro-step is activated, its entry step becomes active; the transition after the
macro-step is enabled only when the exit step is active. The macro-step counts as active while any
step of its expansion is.

## Enclosing steps

An **enclosing step** contains a whole grafcet, the **enclosed grafcet**, that runs only while the
enclosing step is active. Use it for modes: _automatic_, _manual_, _setup_. It is drawn as a step
with two vertical lines.

1. Set the step's **Kind** to _Enclosing step_ (or **Edit › Make enclosing step**).
2. A new tab holds the enclosed grafcet. Steps marked with `*` there become active when the
   enclosing step is activated.
3. When the enclosing step is left, every step of the enclosed grafcet is deactivated.

Tabs of expansions and enclosed grafcets carry an **M** or **E** badge.

## Forcing orders

A **forcing order** is an action that imposes a situation on another partial grafcet while its
step is active. The forced grafcet does not evolve meanwhile.

| Order      | Effect on G2                    |
| ---------- | ------------------------------- |
| `G2{8}`    | only step 8 is active           |
| `G2{8, 9}` | only steps 8 and 9 are active   |
| `G2{*}`    | frozen in its current situation |
| `G2{}`     | no step is active               |
| `G2{INIT}` | back to its initial situation   |

Forcing is the standard way to describe emergency stops and mode changes: a safety grafcet forces
the production grafcet into its initial situation, for example. A grafcet cannot force itself, and
two grafcets cannot force each other.

## Checks

GrafcetMaker checks that every macro-step and enclosing step has its own sub-grafcet of the right
kind, that expansions have one entry and one exit step, and that forcing orders point to existing
grafcets and steps.
