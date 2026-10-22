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

| Rule                          | Severity | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No initial step               | error    | A partial or enclosed grafcet with steps but no initial step, unless a forcing order targets it (it is then activated by forcing).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Duplicate step number         | error    | Two steps of one grafcet share a number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Empty receptivity             | error    | Use `1` for a transition that is always clearable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Parse / type / name errors    | error    | Any diagnostic of the expression checker, including unknown variables, `Xn` that does not exist or is ambiguous, actions assigning an input, and forcing orders naming a missing grafcet or step.                                                                                                                                                                                                                                                                                                                                                              |
| Action on event without event | warning  | A stored action on event whose event is empty: it can never execute.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Unreachable step              | warning  | Not reachable from the initial steps (expansions: from their entry step; forced grafcets: also from forced steps). A transition propagates reachability only when **all** its upstream steps are reachable; source transitions always do. Receptivities are assumed satisfiable.                                                                                                                                                                                                                                                                               |
| Dead-end step                 | warning  | A step that can be activated (has an upstream transition) but has no downstream transition. Exit steps of macro-step expansions are exempt.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OR divergence not exclusive   | warning  | Two transitions leaving the same step whose receptivities can be true together (both would clear, activating both branches). Proven by enumerating truth assignments of the atoms (variables, `Xn`, edges, timers, comparisons) with the consistency rules ↑e ⇒ e, ↓e ⇒ ¬e, t/e ⇒ e, and interval reasoning for comparisons of one variable with constants (integer semantics for INT/TIME). Beyond 14 atoms the pair is reported as "not provably exclusive". Quick fix: give the left transition priority by rewriting the right one as `(right) * /(left)`. |
| Possible transient loop       | warning  | A cycle of transitions (each feeding the next) whose receptivities contain no edge or timer and can all be true at once (step activities treated as free). Edges are true only in the first iteration and step timers restart, so they break such loops.                                                                                                                                                                                                                                                                                                       |
| Output in parallel branches   | warning  | The same output is driven by continuous actions of two steps that can be active at the same time, found by exploring the situations reachable from the initial situation one transition at a time (receptivities assumed satisfiable), up to 2000 situations (beyond that the rule is skipped).                                                                                                                                                                                                                                                                |
| Macro expansion entry/exit    | warning  | An expansion must have exactly one step without upstream transition (E) and one without downstream transition (S).                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Unused variable               | info     | Declared but referenced by no expression.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

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

## Hierarchy

### Macro-steps

- A macro-step (step kind `macro`) refers to an **expansion** grafcet (kind `macroExpansion`).
  The expansion has exactly one **entry step** E (no upstream transition) and one **exit step** S
  (no downstream transition); otherwise validation reports it. The editor marks them E and S.
- Simulation inlines the expansion: a transition leading to the macro-step activates E; a
  transition leaving the macro-step is enabled when S is active and deactivates S.
- The macro-step is **active** (its `Xn` is true, it shows a token) while any step of its
  expansion is active; `t/Xn` counts from the activation of E. Continuous actions attached to the
  macro-step follow that activity; stored actions on a macro-step are ignored (validation warns:
  put them in the expansion).
- An initial step cannot be turned into a macro-step (the step kind is either initial or macro).

### Enclosing steps

- An enclosing step (kind `enclosing`) refers to an **enclosed** grafcet (kind `enclosed`). In
  the enclosed grafcet, steps of kind _initial_ are the steps activated together with the
  enclosing step; the editor draws them with an asterisk `*` (as IEC 60848 does) instead of the
  double square.
- Activating the enclosing step activates those steps (and runs their stored actions on
  activation); deactivating it deactivates every step of the enclosed grafcet (running their
  stored actions on deactivation), recursively for nested enclosures.
- Transitions of an enclosed grafcet (including source transitions) can only clear while the
  enclosing step is active, and none of its steps is activated while the enclosing step is (or
  is becoming) inactive. A step both deactivated and activated stays active, so its enclosed
  grafcet keeps its situation (rule 5).
- At start, enclosed grafcets are inactive. `G{INIT}` applied to an enclosed grafcet restores its
  `*` steps.

### Symbols

- Macro-step: step square with a horizontal line near its top and bottom edges (IEC 60848).
- Enclosing step: step square with a vertical line near its left and right edges. This is chosen
  to be distinct from the macro-step; it was not checked against the figure of the standard.
- Forcing order: action box with a double frame.
- Assignment condition of a continuous action: a short vertical line on the top edge of the box,
  12 units from its left side, with the condition written to its right.
- Stored action on activation: an arrow ↑ standing on the top edge of the box (same place as the
  condition line), its optional condition to its right. Stored action on deactivation: an arrow ↓
  hanging from the bottom edge, pointing away from the box, its condition to its right.
- Stored action on event: a flag (pole and pennant) on the top edge, 12 units from the right side,
  with the event written to its left. The flag is drawn even when the event is still empty.
- The marks are computed once (`actionDecor` in `src/core/layout/geometry.ts`) and drawn by both
  the canvas and the SVG/PDF exporter, so screen and exports match. Problem badges of actions sit
  on the bottom-right corner so they never cover these marks.
- `^` is not part of the grammar: the expression editor replaces a typed `^` with `↑`.

## Code generation

Both generators (`src/core/codegen`) start from the program compiled for the simulator, so `Xn`
references, macro-step inlining, enclosures and forcing targets are resolved exactly as when
simulating. Every file starts with "generated – review before use". Constructs a target cannot
express are listed as warnings in the Export dialog; nothing is silently dropped.

### Structured Text

One vendor-neutral `FUNCTION_BLOCK` runs every grafcet. Inputs become `VAR_INPUT`, outputs
`VAR_OUTPUT`, internal variables `VAR` (addresses and comments as comments). Generated names are
`<grafcet>_X<n>` (step activity), `<grafcet>_T<k>` (transitions, numbered top to bottom),
`<step>_M` (activity at the previous scan), `RE_k` / `FE_k` (R_TRIG / F_TRIG), `TON_k` /
`TOF_k`; they never clash with user variables. Each scan:

1. Forcing flags: the forcing steps active at the start of the scan; a forced grafcet's
   transitions get `AND NOT <grafcet>_Forced` (it does not evolve).
2. All transitions from the situation at the start of the scan:
   `Tk := X(upstream…) AND receptivity [AND X(enclosing step)]` (rules 2 and 4).
3. All steps: `Xn := (Xn AND NOT (Tout…)) OR Tin… [OR Init]`, so a step both activated and
   deactivated stays active (rules 3 and 5). Steps of an enclosed grafcet are ANDed with the
   enclosing step's activity, and its `*` steps are set on the enclosing step's activation;
   enclosing steps are updated before the grafcets they enclose.
4. Forcing orders write the forced grafcet's steps (`{}`, `{INIT}`, `{8, 9}`; `{*}` only freezes).
   Macro-steps get `X := OR(steps of the expansion)`.
5. Timer and edge function blocks are called: `t/c` → `TON(IN := c, PT := t)`, `t1/c/t2` → TON then
   TOF on its output, `↑c` / `↓c` → R_TRIG / F_TRIG. Their outputs are seen by the transitions of
   the **next** scan.
6. Stored actions run when a step changed since the previous scan (`X AND NOT X_M` on activation,
   `NOT X AND X_M` on deactivation; deactivation first), with their condition; actions on event run
   while the step is active and the event is true. Then `X_M := X`.
7. Continuous actions: each driven variable is assigned the OR of `X AND condition` of its steps.

Differences from IEC 60848 (and from the simulator), by design of a cyclic PLC program: one
clearing level per scan (no search for stability), so a chain of true transitions is crossed one
transition per scan and transient steps do emit continuous actions for one scan; edges and timers
lag by one scan; forcing applies from the scan after the forcing step became active; stored actions
of a step activated by forcing run (its activity changed) but no clearing happened. Division by
zero and INT/REAL mixing follow the PLC's rules.

The **stability loop** option wraps steps 2, 3, the macro-step update and 6 in a `REPEAT … UNTIL`
that ends when no step changed (at most 1000 iterations, then `Unstable` is TRUE). Initial steps are
set once before the loop, edges are only true in the first iteration (`AND Iter = 0`), and stored
actions run per iteration, so transient steps execute their stored actions as in IEC 60848.

### PLCopen TC6 XML

- One SFC program per partial (and enclosed) grafcet; expansions of macro-steps are inlined, their
  steps placed by auto-layout. Steps keep the `<grafcet>_X<n>` names; upward links become
  `jumpStep`s; divergences and convergences become selection / simultaneous elements.
- Variables are global variables of one resource; every program declares them as external. A task
  (default 10 ms) runs `GRAFCET_Signals` first, then the SFC programs.
- Conditions are ST. `Xn` of the same program is `<step>.X`; `t/Xn` of the same program is
  `<step>.T >= t`. Edges, other timers, and steps of other programs are computed in the ST program
  `GRAFCET_Signals` (R_TRIG, F_TRIG, TON, TOF) into global `SIG_k` variables; a step read there or by
  another program is mirrored into a global `<step>_Active` by an N action (one scan late).
- Qualifiers: continuous → N (Boolean variable); with condition `t/Xself` → D, `/(t/Xself)` → L,
  other conditions → N with an inline `v := condition` (the variable then keeps its last value: warned);
  on activation → S / R for a constant BOOL, otherwise P1 with an inline assignment; on
  deactivation → P0; on event → N with `IF event THEN … END_IF`; macro-step actions are attached to
  every step of the expansion.
- Not representable in IEC 61131-3 SFC and reported: forcing orders (kept as a comment), enclosure
  semantics, source and sink transitions. Use the Structured Text export for those.
