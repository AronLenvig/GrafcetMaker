# File format (`.grafcet.json`)

A project is a single UTF-8 JSON file, pretty-printed with two-space indentation and keys in a
fixed (schema) order, so files diff cleanly in version control. Saving and re-loading a file
produces byte-identical output.

The authoritative definition is the Zod schema in
[`src/core/model/schema.ts`](../src/core/model/schema.ts).

## Versioning

- `schemaVersion` (integer) identifies the format. Current version: **2**.
- History: **1** first release; **2** actions may have no step (`stepId: null` with a
  `position`). Version 1 files are upgraded unchanged.
- Older files are upgraded on load through a migration chain
  ([`src/core/io/migrations.ts`](../src/core/io/migrations.ts)); each migration upgrades exactly
  one version.
- Files with a **newer** `schemaVersion` are rejected with a message asking to update
  GrafcetMaker; they are never partially loaded.

## Safety limits (files are untrusted)

| Limit                                | Value      |
| ------------------------------------ | ---------- |
| File size                            | 10 MB      |
| Elements (steps + transitions + …)   | 50 000     |
| Ids                                  | 64 chars   |
| Names / identifiers                  | 64 chars   |
| Labels, addresses                    | 256 chars  |
| Comments                             | 4000 chars |
| Expressions (receptivities, actions) | 2000 chars |

Unknown keys are dropped. All text is rendered as text (never as HTML).

## Share links

**File › Copy share link** puts the project in the URL fragment:
`<app URL>#share=<data>`, where `<data>` is the compact (unindented) project JSON, compressed
with raw DEFLATE (`CompressionStream('deflate-raw')`) and encoded as base64url without padding
([`src/core/io/shareLink.ts`](../src/core/io/shareLink.ts)). The fragment is never sent to the
server. On open, the data is inflated with the 10 MB file limit enforced while inflating, then
loaded exactly like a file (migrations, validation, newer versions rejected).

## Importing grafcet.io files

Opening a `.grafcetio` file (or any JSON with `"createdWith": "grafcet.io"`) converts it into a
new, unsaved project; saving writes a `.grafcet.json` and never touches the original
([`src/core/io/grafcetIo.ts`](../src/core/io/grafcetIo.ts), format described at
<https://grafcet.io/dateiformat>). The file is untrusted: it is validated with Zod and size-capped,
and the result is checked against the project schema. Interpretation choices:

- **Links.** Edges are wires between handles (`top` = input, `bottom` = output; `handle-n` /
  `source-n` on branch bars). Wires joined through `loopNode`, `startLoop`, `endLoop`, `andNode` and
  `orNode` form one link, and loop markers with the same reference label are one link. A transition
  activates every step input on its output link and is enabled by every step output on its input
  link. A loop drawn into the **bottom of a transition** joins that transition's output.
- **Alternatives drawn into one transition.** Several steps into one transition without an AND bar
  (`andNode`) become one transition per step (either step can clear it); with the bar it is an AND
  convergence. Links from step to step or transition to transition are left out.
- **Grafcets.** The charts inside a frame (`boxNode`) form one partial grafcet named after its
  lower label (`G1`); every other separate chart is a partial grafcet named after the text just
  above it (made a valid identifier), else `G1`, `G2`…. A fragment without an initial step joins
  the nearest chart. Step numbers come from the labels; a duplicate takes the next free number.
- **Actions.** `continuous` (and no type) → continuous; `conditional` → continuous with condition,
  or with `:=` a stored action on event; `set` / `reset` → on activation `X := 1` / `X := 0`;
  `pulse` → on activation (`:=`) or a continuous action with condition `↑Xn` (or its condition);
  `delayed` / `limited` → continuous with condition `t/Xn` / `/(t/Xn)`; `forcedCommand` or a label
  like `G1{}` → forcing order. A forcing order with a condition becomes a grafcet
  `Forcing_<target>` whose step holds the order while the condition is true. Actions linked to a
  step (directly or along a chain of actions) belong to it; the others are actions without a step.
- **Expressions.** `%` → `MOD`, `≥ ≤ ≠ != ==` → `>= <= <> <> =`, an underlined `1` or `*` alone →
  `1`. Since `*` means AND in grafcet.io, comparisons joined by `*` (or two joined by `+`) get
  parentheses: `n > 0 * a` → `(n > 0) * a`.
- **Variables** are created from what the expressions use, as the Create variable quick fix
  would (type and direction guessed from use). Macro-steps and enclosing steps keep their kind but
  no expansion or enclosed grafcet (the file does not link them). Text becomes comments. Each chart
  is auto-laid out, separate sequences of one grafcet one below the other; actions without a step
  and comments form a column on the right. What was changed or left out is listed after opening.

## Structure

Collections are normalized maps keyed by id (ids are random 12-character strings); the key must
equal the object's `id`.

```ts
Project {
  schemaVersion: 2
  id: string
  name: string
  meta: { author, company, revision, createdAt, updatedAt }   // ISO 8601 timestamps
  variables: Record<Id, Variable>
  grafcets: Record<Id, Grafcet>
  grafcetOrder: Id[]          // tab order; must list every grafcet exactly once
  scenarios?: Record<Id, Scenario>
}

Scenario {
  id; name
  events: { t: number; name: string; value: boolean | number }[]   // virtual ms from start
}

Variable {
  id; name                    // identifier [A-Za-z_][A-Za-z0-9_]*, unique case-insensitively
  type: 'BOOL' | 'INT' | 'REAL' | 'TIME'
  direction: 'input' | 'output' | 'internal'
  initialValue?: boolean | number   // TIME in milliseconds
  address?: string            // e.g. %I0.0
  comment?: string
}

Grafcet {
  id; name                    // identifier, unique case-insensitively (used by forcing: G2{8})
  kind: 'partial' | 'macroExpansion' | 'enclosed'
  steps: Record<Id, Step>; transitions: Record<Id, Transition>
  actions: Record<Id, Action>; comments: Record<Id, Comment>
}

Step {
  id; number                  // integer >= 0, should be unique per grafcet (validation error otherwise)
  kind: 'normal' | 'initial' | 'macro' | 'enclosing'
  label?: string
  position: { x, y }          // center of the step square
  refGrafcetId?: Id           // macro-step expansion / enclosed grafcet
}

Transition {
  id; number?
  from: Id[]                  // upstream steps; [] = source transition; 2+ = AND convergence
  to: Id[]                    // downstream steps; [] = sink transition; 2+ = AND divergence
  receptivity: string         // expression, see semantics.md
  position: { x, y }          // center of the transition bar
  routing?: { sideX?: number }// x of the vertical segment of upward (loop) links
}

Action {
  id; order                   // order = left-to-right position next to the step
  stepId: Id | null           // null: no step, the action is always active
  position?: { x, y }         // top-left corner, required when stepId is null
  kind: 'continuous' | 'storedOnActivation' | 'storedOnDeactivation' | 'storedOnEvent' | 'forcing'
  text: string                // continuous: `M1` · stored: `C := C + 1` · forcing: `G2{8}`
  condition?: string          // continuous: assignment condition · storedOnEvent: event
}

Comment { id; text; position: { x, y } }   // top-left corner
```

Divergences and convergences are not stored; they are derived from `from`/`to`:
a step feeding 2+ transitions is an OR divergence, 2+ transitions feeding a step is an OR
convergence. Links step→step or transition→transition cannot be represented.

## Integrity rules checked on load

- Every reference (`from`, `to`, `stepId`, `refGrafcetId`, `grafcetOrder`) points to an existing
  element; transitions only reference steps of their own grafcet.
- No duplicate ids in `from` / `to`; no duplicate variable or grafcet names (case-insensitive).
- An action with `stepId: null` has a `position`.

Problems that do not prevent editing (duplicate step numbers, syntax errors in expressions,
unreachable steps, …) are reported by validation instead of rejecting the file.
