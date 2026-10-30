# File format (`.grafcet.json`)

A project is a single UTF-8 JSON file, pretty-printed with two-space indentation and keys in a
fixed (schema) order, so files diff cleanly in version control. Saving and re-loading a file
produces byte-identical output.

The authoritative definition is the Zod schema in
[`src/core/model/schema.ts`](../src/core/model/schema.ts).

## Versioning

- `schemaVersion` (integer) identifies the format. Current version: **4**.
- History: **1** first release; **2** actions may have no step (`stepId: null` with a
  `position`); **3** transitions may flow right to left (`flow: 'left'`); **4** a transition's link
  may be drawn as a jump (`jump: true`). Older files are upgraded unchanged.
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

## GRAFCET text and `#text=` links

A project can also be written as **GRAFCET text**, one statement per line (`step 1 Filling`,
`do Valve`, `0 -> 1: start`), the form AI assistants write and read. The reference is
[`docs/ai.md`](ai.md), published as `ai.txt` at the site root (with the site's address and a
working example link) and announced in `llms.txt` and the home page text. Parser and writer:
[`src/core/io/grafcetText.ts`](../src/core/io/grafcetText.ts).

- `<app URL>#text=<text>` opens the text, percent-encoded as by `encodeURIComponent` (a `+` is
  OR, never a space; a stray `%` that is not an escape stays as it is). Like a share link, it is
  never sent to the server and is removed from the address bar once read. A text that cannot be
  read opens **File › Open from text…** with the text and the line that is wrong.
- Reading builds the project with the same builder as the examples (`core/io/buildProject.ts`),
  lays it out automatically, declares names used but not declared from their use, then loads it
  through `parseProjectFile` (limits, integrity). Texts over 1 MB are refused.
- Not written (lost through text): positions, transition numbers, flow direction, jumps, loop routing,
  scenarios and the project's metadata. Everything else round-trips: writing the text of a project
  read from text gives the same text (tested on every example).

## Live sessions

Live collaboration ([`src/core/collab/`](../src/core/collab/records.ts),
[`src/app/collab/`](../src/app/collab/session.ts)) exchanges the project as **records** rather than
files, so that edits merge.

**Link**: `<app URL>#room=<id>,<key>`: a room id of 20 characters `[0-9a-z]` and a 128-bit AES-GCM
key in base64url. The fragment never reaches a server.

**Records**: `p` (project name, meta), `o` (grafcet order), `v/<id>` variables, `x/<id>` scenarios,
`g/<id>` grafcets (name, kind) and `s|t|a|c/<grafcet id>/<id>` steps, transitions, actions and
comments. Each field of a record (a transition's `receptivity`, a step's `position`…) is a
last-writer-wins register `{ v, n, x }`: version, random 32-bit nonce, value (no `x`: field
unset). The higher version wins, then the lower nonce, so every replica keeps the same register
whatever order the messages arrive in. Deleting sets the field `$d`; the record stays as a
tombstone. Every field is checked against the file schema when merged; unknown fields and invalid
values are dropped.

**Derived project**: the project shown is computed from the records, with a deterministic repair
so that it always passes the integrity rules below: elements of a deleted grafcet are hidden,
`from` / `to` lose steps that no longer exist, an action whose step is gone is hidden, a reference
to a missing grafcet is removed, a duplicate grafcet name (case-insensitive) gets `_2`, `_3`… (the
lowest id keeps it), a duplicate variable name is hidden (the lowest id is shown), and the grafcet
order lists every grafcet once.

**Messages** are JSON `{ p: 1, s: <schemaVersion>, type, … }`: `sync` (project id and every
record; `want` asks for the others' state), `changes` (records edited since) and `presence` (name,
grafcet, pointer, selection, element edited, simulating). Messages over 1 KB are compressed (raw
DEFLATE), then sealed with AES-GCM and a random 96-bit IV, and sent as base64url of IV and
ciphertext, at most 1 MiB (larger `changes` are split). Messages from a newer protocol or schema
version are refused with an explanation.

**Relay** ([`worker/room.ts`](../worker/room.ts)): `GET <app path>/api/room` answers
`{ "ok": true }` where live collaboration is available; `<app path>/api/room/<id>` is the room's
WebSocket. The relay forwards sealed messages (to everyone, or to one participant), tells who
joins and leaves, and keeps the latest sealed `sync` as the room snapshot, written 2 s after
changes settle by the participant with the lowest relay id. Limits: 20 people per room, 600
messages per 10 s per person; rooms are deleted 30 days after their last snapshot. Each browser
also keeps its records in IndexedDB (table `rooms`), so a reload rejoins with offline edits.

## Importing grafcet.io files

Opening a `.grafcetio` file (or any JSON with `"createdWith": "grafcet.io"`) converts it into a
new, unsaved project; saving writes a `.grafcet.json` and never touches the original
([`src/core/io/grafcetIo.ts`](../src/core/io/grafcetIo.ts), format described at
<https://grafcet.io/dateiformat>). The file is untrusted: it is validated with Zod and size-capped,
and the result is checked against the project schema. Interpretation choices:

- **Links.** Edges are wires between handles (`top` = input, `bottom` = output; `handle-n` /
  `source-n` on branch bars). Wires joined through `loopNode`, `startLoop`, `endLoop`, `andNode`
  (`andSplit` in newer grafcet.io versions) and `orNode` form one link. Loop markers with the same
  reference label in the same frame are one link when they are wired on one side only (the marker
  a long loop leaves by and the one it arrives at); a marker wired on both sides is a whole loop by
  itself, so separate loops that keep the default label `*` stay apart. A transition activates
  every step input on its output link and is enabled by every step output on its input link. A
  loop drawn into the **bottom of a transition** joins that transition's output. A transition
  linked to no step above or below becomes a source or sink transition, and the import says so.
- **Alternatives drawn into one transition.** Several steps into one transition without an AND bar
  (`andNode`) become one transition per step (either step can clear it); with the bar it is an AND
  convergence. Links from step to step or transition to transition are left out.
- **Grafcets.** The charts inside a frame (`boxNode`) form one partial grafcet named after its
  lower label (`G1`); a frame with actions but no steps (for example manual commands with a
  condition) is a partial grafcet of those actions without steps. Every other separate chart is a
  partial grafcet named after the text just above it (made a valid identifier), else `G1`, `G2`….
  A fragment without an initial step joins the nearest chart. Step numbers come from the labels; a
  duplicate takes the next free number.
- **Actions.** `continuous` (and no type) → continuous; `conditional` → continuous with condition,
  or with `:=` a stored action on event; `set` / `reset` → on activation `X := 1` / `X := 0`;
  `pulse` → on activation (`:=`) or a continuous action with condition `↑Xn` (or its condition);
  `delayed` / `limited` → continuous with condition `t/Xn` / `/(t/Xn)`; `forcedCommand` or a label
  like `G1{}` → forcing order; several orders in one label (`G1{} AND G2{}`, also joined by `,`
  `;` `*`) become one forcing order each. A forcing order with a condition becomes a grafcet
  `Forcing_<target>` whose step holds the order while the condition is true. Actions linked to a
  step (directly or along a chain of actions) belong to it; the others are actions without a step.
- **Expressions.** `%` → `MOD`, `≥ ≤ ≠ != ==` → `>= <= <> <> =`, an underlined `1` or `*` alone →
  `1`, durations with a decimal comma or point → whole units (`0,5s/X3` → `500ms/X3`). Since `*` means AND in grafcet.io, comparisons joined by `*` (or two joined by `+`) get
  parentheses: `n > 0 * a` → `(n > 0) * a`.
- **Variables** are created from what the expressions use, as typing them in the editor would
  (type and direction guessed from use: read only → input, set by a continuous action → output,
  assigned → internal). Macro-steps and enclosing steps keep their kind but
  no expansion or enclosed grafcet (the file does not link them). Text becomes comments. Each chart
  is auto-laid out, separate sequences of one grafcet one below the other; actions without a step
  and comments form a column on the right. What was changed or left out is listed after opening.

## Structure

Collections are normalized maps keyed by id (ids are random 12-character strings); the key must
equal the object's `id`. An id may not be the name of a property every JavaScript object has
(`constructor`, `toString`, `__proto__`…): such a file is rejected as invalid, so a reference to
it can never look present.

```ts
Project {
  schemaVersion: 3
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
  flow?: 'left'               // right to left: vertical bar, upstream links enter on the right,
                              //   downstream links leave on the left (absent: top to bottom;
                              //   a transition with AND links is always drawn top to bottom)
  jump?: true                 // the link to its one downstream step is drawn as a jump: an arrow
                              //   marked with the step (X10) instead of a line; drawing only,
                              //   ignored unless `to` has exactly one step
  routing?: {                 // manual routing of upward (loop) links; missing = automatic
    sideX?: number            //   x of their vertical segment (side lane)
    dropY?: number            //   y of their bottom line (kept below the source)
  }
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
