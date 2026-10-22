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
