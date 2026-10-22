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
