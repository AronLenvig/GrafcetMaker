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
