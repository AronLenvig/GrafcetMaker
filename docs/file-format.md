# File format (`.grafcet.json`)

A project is a single UTF-8 JSON file, pretty-printed with two-space indentation and keys in a
fixed (schema) order, so files diff cleanly in version control. Saving and re-loading a file
produces byte-identical output.

The authoritative definition is the Zod schema in
[`src/core/model/schema.ts`](../src/core/model/schema.ts).

## Versioning

- `schemaVersion` (integer) identifies the format. Current version: **1**.
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

## Structure

Collections are normalized maps keyed by id (ids are random 12-character strings); the key must
equal the object's `id`.

```ts
Project {
  schemaVersion: 1
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
  id; stepId; order           // order = left-to-right position next to the step
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

Problems that do not prevent editing (duplicate step numbers, syntax errors in expressions,
unreachable steps, …) are reported by validation instead of rejecting the file.
