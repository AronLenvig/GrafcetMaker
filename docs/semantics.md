# Semantics and interpretation choices

GrafcetMaker implements GRAFCET as defined by **IEC 60848**. Where the standard leaves room for
interpretation, the choice made is recorded here. Sections are added as features land.

## Model

- **Identifiers are case-insensitive** (as in IEC 61131-3 Structured Text): `Start`, `START` and
  `start` name the same variable. Names are therefore unique case-insensitively, which also keeps
  generated Structured Text valid.
- Variable names must not look like step variables (`X` followed by digits, e.g. `X12`), since
  `Xn` denotes the activity of step _n_.
- Step numbers should be unique per grafcet; duplicates are a validation error, not a load error.
- Divergences/convergences are derived from transition `from`/`to` lists, so an AND divergence is
  exactly "a transition with several downstream steps" — the model cannot express an ill-formed
  structure such as a step linked directly to a step.

## Expressions

Receptivities, assignment conditions and events are boolean expressions. Input is ASCII; the
textbook symbols are accepted too.

| Meaning               | Accepted spellings                              | Textbook display |
| --------------------- | ----------------------------------------------- | ---------------- |
| OR                    | `+` `OR` `\|\|`                                 | `+`              |
| AND                   | `*` `·` `AND` `&&`                              | `·`              |
| NOT                   | `/` `¬` `NOT` `!`                               | overbar          |
| rising / falling edge | `↑a` `RE a` / `↓a` `FE a`                       | `↑a` / `↓a`      |
| step activity         | `X12`                                           | `X12`            |
| constants             | `1` `0` `TRUE` `FALSE`                          | `1` `0`          |
| timer                 | `3s/c`, `3s/c/5s`                               | `3s/c`           |
| comparison            | `=` `<>` `<` `<=` `>` `>=` (also `≠ ≤ ≥ != ==`) | `= ≠ < ≤ > ≥`    |

Durations: integer or decimal followed by `ms`, `s`, `min` or `h` (`500ms`, `1.5s`, `2min`).

### Precedence and parsing choices

- NOT and edges bind tightest, then AND, then OR; binary operators are left-associative.
- An edge applies to a primary (`↑a·b` = `(↑a)·b`); a timer's condition is a primary
  (`3s/(a+b)` needs parentheses).
- `+`, `*` and `/` are boolean operators **unless** they are part of a comparison: a primary is
  first read as arithmetic, and kept as such only when a comparison operator follows. The
  comparison therefore takes the longest arithmetic operand on its left: `a + C > 3` means
  `(a + C) > 3` (and reports that BOOL `a` cannot be used in arithmetic, with a hint to write
  `a + (C > 3)`). The textbook display always puts comparisons inside a larger expression in
  parentheses so it can be read back unambiguously.
- In arithmetic, `/` is division, `MOD` is the remainder and unary `-` negates. TIME values are
  milliseconds; a duration literal is a TIME value (`T >= 5s`).
- BOOL operands are allowed in `=` / `<>` comparisons (as 0/1) but not in arithmetic or ordering
  comparisons.

### Names

- Identifiers are case-insensitive. Reserved words (any case): `AND OR NOT RE FE TRUE FALSE MOD
INIT`. Names of the form `X<digits>` are step activities and cannot be variables.
- `Xn` refers to step _n_ of the grafcet containing the expression; if that grafcet has no step
  _n_, to the unique step numbered _n_ in another grafcet. If several other grafcets have one, the
  reference is ambiguous (error) — number partial grafcets in separate ranges (the editor starts
  each new grafcet at the next multiple of ten).

### Actions

- **Continuous action** text is the name of one BOOL output or internal variable (`M1`).
- **Stored actions** are one assignment `target := value`. A BOOL target takes a boolean
  expression (`M := a * /b`, `M := 1`); an INT/REAL/TIME target takes arithmetic
  (`C := C + 1`, `T := 2s`). Inputs cannot be assigned.
- **Forcing orders**: `G2{8}`, `G2{8, 9}` (or `G2{X8}`), `G2{*}` (freeze the current situation),
  `G2{}` (empty situation), `G2{INIT}` (initial situation). A grafcet cannot force itself.

## Validation

Validation runs in a Web Worker 150 ms after each change. Every rule is a pure function of the
project (`src/core/validation`).

| Rule                        | Severity | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No initial step             | error    | A partial or enclosed grafcet with steps but no initial step, unless a forcing order targets it (it is then activated by forcing).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Duplicate step number       | error    | Two steps of one grafcet share a number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Empty receptivity           | error    | Use `1` for a transition that is always clearable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Parse / type / name errors  | error    | Any diagnostic of the expression checker, including unknown variables, `Xn` that does not exist or is ambiguous, actions assigning an input, and forcing orders naming a missing grafcet or step.                                                                                                                                                                                                                                                                                                                                                              |
| Unreachable step            | warning  | Not reachable from the initial steps (expansions: from their entry step; forced grafcets: also from forced steps). A transition propagates reachability only when **all** its upstream steps are reachable; source transitions always do. Receptivities are assumed satisfiable.                                                                                                                                                                                                                                                                               |
| Dead-end step               | warning  | A step that can be activated (has an upstream transition) but has no downstream transition. Exit steps of macro-step expansions are exempt.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OR divergence not exclusive | warning  | Two transitions leaving the same step whose receptivities can be true together (both would clear, activating both branches). Proven by enumerating truth assignments of the atoms (variables, `Xn`, edges, timers, comparisons) with the consistency rules ↑e ⇒ e, ↓e ⇒ ¬e, t/e ⇒ e, and interval reasoning for comparisons of one variable with constants (integer semantics for INT/TIME). Beyond 14 atoms the pair is reported as "not provably exclusive". Quick fix: give the left transition priority by rewriting the right one as `(right) * /(left)`. |
| Possible transient loop     | warning  | A cycle of transitions (each feeding the next) whose receptivities contain no edge or timer and can all be true at once (step activities treated as free). Edges are true only in the first iteration and step timers restart, so they break such loops.                                                                                                                                                                                                                                                                                                       |
| Output in parallel branches | warning  | The same output is driven by continuous actions of two steps that can be active at the same time, found by exploring the situations reachable from the initial situation one transition at a time (receptivities assumed satisfiable), up to 2000 situations (beyond that the rule is skipped).                                                                                                                                                                                                                                                                |
| Macro expansion entry/exit  | warning  | An expansion must have exactly one step without upstream transition (E) and one without downstream transition (S).                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Unused variable             | info     | Declared but referenced by no expression.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Simulation

The simulator (`src/core/simulation`) is deterministic: its whole history is a function of the
input changes and the virtual times at which they happen. It is checked by a golden test suite of
hand-verified charts (`tests/unit/simulation.test.ts`).

### Cycles and initialization

- A **cycle** runs when an input changes or a timer expires (never "on its own").
- **Initialization** (t = 0): the initial steps become active (rule 1) and their stored actions
  on activation run; then a first cycle searches for stability with the initial input values, so
  a transition with receptivity `1` below an initial step clears at once. There are no edges at
  initialization (the first observation of a value is its own previous value).

### One iteration (rules 2–5)

1. Receptivities of the **enabled** transitions (all upstream steps active; source transitions
   always) are evaluated on the situation at the start of the iteration.
2. Stored actions **on event** of the steps active at that moment are evaluated (their condition
   should contain an edge `↑`/`↓`).
3. All clearable transitions clear **simultaneously**: every upstream step is deactivated and every
   downstream step activated. A step that is both deactivated and activated **stays active**: it
   keeps its activation time (its timers are not restarted) and none of its stored actions run,
   since no activation or deactivation actually happens.
4. Stored actions on deactivation run, then stored actions on activation, each in step order
   (grafcet tab order, then step number). Their effect is visible to the next iteration.

### Search for stability

- Iterations repeat with the same inputs until no transition is clearable **and** no stored
  action changed a variable during the iteration.
- Clearing that leaves the situation unchanged (a source transition into an already active step,
  a self-loop with a level receptivity) also ends the search: nothing can change any more.
- Steps activated and deactivated within one cycle are **transient**: their stored actions run,
  their continuous actions are never emitted (continuous actions are computed on the stable
  situation only).
- After **1000 iterations** the cycle stops with a **transient loop** error, shown in the
  simulation bar and in Problems. The simulation halts until it is restarted.

### Edges and timers

- `↑e` / `↓e` compare the value of `e` at the start of the current iteration with its value at the
  start of the previous iteration (for the first iteration: at the end of the previous cycle).
  Input edges are therefore true **only in the first iteration** of the cycle in which the input
  changed; an internal event such as `↑X5` is true in the iteration after step 5 was activated.
- Edge memories of a grafcet advance only during the search for stability of that grafcet. A
  grafcet frozen by forcing still observes the final state of the cycle, so events that happened
  while it was frozen are not seen later.
- `t/Xn` is true when step _n_ has been active for at least _t_ since its **activation time**.
- `t1/c` is true when `c` has been true for at least `t1`; `t1/c/t2` additionally stays true
  for `t2` after `c` falls (and stays true if `c` rises again during that time).
- Timers expire **exactly**: the simulator computes the next expiry and runs a cycle at that
  virtual time. Real-time mode advances virtual time with the wall clock × speed; fast mode jumps
  from expiry to expiry; _Step_ jumps to the next expiry (or the next replayed input).

### Actions and variables

- Continuous actions: a BOOL output is true when at least one active step sets it with a
  continuous action whose assignment condition (if any) is true; otherwise false. Variables driven
  by any continuous action are recomputed every cycle (a stored assignment to them is
  overwritten). Assignment conditions are evaluated once per cycle on the stable situation; an
  edge in such a condition gives a one-cycle pulse.
- Stored actions keep their value until the next assignment. INT and TIME results are truncated to
  integers; division by zero gives 0. BOOL values count as 0/1 in arithmetic and comparisons.
- Undeclared variables read as false / 0. A receptivity that does not parse never clears.

### Forcing

- Grafcets are ordered by **forcing level**: a grafcet forced by another is processed after it.
  Within one level, grafcets evolve together (one search for stability).
- After a level is stable, the forcing orders of its **active** steps are applied: `G2{8}`
  activates exactly the listed steps, `G2{}` deactivates all, `G2{INIT}` restores the initial
  situation, `G2{*}` keeps the current one. A forced grafcet **does not evolve** for the rest of
  the cycle. Orders are re-applied every cycle while the forcing step stays active; a forcing step
  that is only transient forces nothing.
- Stored actions of steps activated or deactivated by forcing run. Several orders on one grafcet in
  the same cycle are applied in order (the last one wins). A cycle in the forcing hierarchy is
  broken arbitrarily and reported.
