# Progress

Autonomous build log. Read this first in every session and resume from **Current phase**.

## Current phase

**Phase 9** — onboarding, examples, i18n, a11y audit, PWA, perf.

## Phases

| Phase | Scope                                                                | Status |
| ----- | -------------------------------------------------------------------- | ------ |
| 0     | Scaffold, theme, CI, model + schema, LICENSE/README                  | done   |
| 1     | Core editor, undo, shortcuts, save/open/import (drag-drop), autosave | done   |
| 2     | Expression parser, variables, autocomplete                           | done   |
| 3     | OR/AND structures, loops, source/sink, auto-layout                   | done   |
| 4     | Validation                                                           | done   |
| 5     | Simulation                                                           | done   |
| 6     | Exports                                                              | done   |
| 7     | Hierarchy (partial, macro, enclosing, forcing)                       | done   |
| 8     | Codegen                                                              | done   |
| 9     | Onboarding, examples, i18n, a11y audit, PWA, perf                    |        |

## Done

### Phase 0

- Vite 8 + React 18 + TypeScript 6 (strict, `noUncheckedIndexedAccess`), Tailwind 4 with
  token-only colors, ESLint (flat) + Prettier, Vitest, Playwright (Chromium), GitHub Actions CI.
- Theme tokens (light/dark) on `:root` / `:root[data-theme="dark"]`, inline no-flash bootstrap
  script allowed by CSP hash, System/Light/Dark segmented control with live system listener.
- Build-time CSP `<meta>` (no `unsafe-eval`, inline script by sha256). Zod runs `jitless`.
- Data model as Zod schema (`src/core/model/schema.ts`) with referential-integrity checks, size
  limits; canonical serializer; loader with migration chain and clear error codes. Tests.
- Docker (unprivileged nginx) + nginx config with security headers; LICENSE (MIT), README,
  CONTRIBUTING, CHANGELOG, docs skeleton.

### Phase 1

- Pure editing ops in `src/core/model/ops.ts` (append/insert, delete-with-heal, connect, move),
  clipboard payload (`core/model/clipboard.ts`), geometry + orthogonal link routing with loop
  lanes (`core/layout/geometry.ts`). Tests: undo/redo patches, transactions, heal, paste.
- Document store (vanilla Zustand + Immer `produceWithPatches`), `execute(label, recipe)`,
  transactions for drags (compacted to one entry), dirty tracking by history position.
- SVG canvas: memoized element views, separate overlay layer (selection, handles, link drag with
  valid-target highlighting, marquee, flash), culling above 1000 elements, pan/zoom, grid, inline
  editor, zoom controls. Grafcet tabs (add/rename/reorder/delete).
- Top bar menus, tool rail, properties panel (step/transition/action/comment/grafcet/project),
  command palette, shortcuts dialog, local history dialog, error boundary with recovery
  download, toasts, resizable properties panel with persisted size.
- Persistence: Dexie (projects, snapshots, recent), autosave (500 ms debounce), snapshots every
  5 min + on save + before replacing, crash-restore prompt, File System Access save/open with
  download/input fallbacks, drag-and-drop open, recent files, beforeunload warning, dirty dot.
- Playwright smoke: create sequence, save (download), reopen (file input), crash-restore, theme.

### Phase 2

- `core/expr`: lexer (ASCII + textbook symbols), Pratt parser with arithmetic-comparison
  backtracking, AST with spans and ids for stateful nodes (edges/timers), parsers for
  assignments, output names and forcing orders, memoized by source; checker with case-insensitive
  resolution, types, `Xn` resolution across grafcets, did-you-mean (OSA distance) and
  create-variable hints; textbook formatter (runs with stacked overbars); rename refactor.
  Tests: precedence, every operator spelling, error positions and hints, resolution, formatting.
- `core/model/variables.ts`: name validation, usage counts, referenced variables (copy/paste),
  rename-everywhere, initial value parsing.
- UI: textbook rendering with overbars drawn from monospace metrics, dashed underline for
  unparseable text; ExpressionInput (combobox autocomplete, diagnostics with highlighted span,
  quick fixes) in the inline editor and properties panel; bottom panel with Variables table
  (inline editing, filter, uses, delete confirm); View › Textbook notation.

### Phase 3

- `core/model/structure.ts`: P (parallel), O (alternative / bypass), L (loop), source/sink
  transitions; new branches never overlap existing elements.
- `core/model/renumber.ts`: flow-order renumbering rewriting `Xn` (resolution-aware, across
  grafcets) and forcing orders; refuses when a reference would change meaning. Tests.
- `core/layout/autoLayout.ts`: DFS back-edge removal, longest-path rows, structured column walk
  (blocks centered under divergences, merges in line), selection-only mode. Test.
- Editor: P/O/L shortcuts, loop pick mode with target highlighting and hint banner, drag loop
  lanes (`routing.sideX`), Edit menu structure/arrange items.

### Phase 4

- `core/validation`: issue model (ruleId, severity, message key, elements, quick fix), exact
  boolean reasoning by enumeration (`logic.ts`), all spec'd rules (`validate.ts`); 15 ms for a
  540-step chart. Tests for exclusivity, reachability, transient loops, concurrency, fixes.
- Worker (`src/workers/validation.worker.ts`) with 150 ms debounce and inline fallback; problems
  store indexed by element.
- UI: Problems panel (grouped by grafcet, severity filters, jump + flash, quick fixes), canvas
  badges (shape-coded), top-bar counters, problems of the selection in the properties panel.

### Phase 5

- `core/simulation`: compiler (indexed program, resolved `Xn`, forcing levels), stateful evaluator
  (edges per iteration, timers with exact deadlines), `Simulator` (rules 1–5, stability search,
  1000-iteration cap, forcing per level, outputs on the stable situation), `SimSession` protocol.
  Golden suite: 35 hand-verified charts.
- Simulation worker; main-thread store with virtual clock (×0.25–×10, fast jump, step), inputs,
  scenario record/replay (saved in `project.scenarios`), cycle history (time travel).
- UI: simulation bar, locked editing, tokens + fill, enabled markers, cleared flash, step timers,
  live action states/values, Simulation panel (inputs, values, evolution log, scenarios),
  lazy-loaded chronogram with scrub cursor, simulation inspector, transient loop in Problems.
- E2E smoke extended: declare inputs, simulate, toggle an input, stop.

### Phase 6

- `core/io/svgExport.ts`: standalone SVG renderer sharing editor geometry (explicit colors, escaped
  text, overbars as lines, Latin-1 mode with vector arrows for PDF standard fonts).
- `core/io/pdfLayout.ts`: A4/A3 pages, fit or fixed scale with tiling, title block; page SVGs
  used for preview and, via svg2pdf, for the PDF (jsPDF + svg2pdf lazy-loaded).
- `core/io/csv.ts`: variables CSV export/import (RFC 4180, delimiter detection, row errors,
  merge by name). Tests.
- Export dialog (lazy): PDF/SVG/PNG/CSV, scope (grafcet/selection/all), colors (print/theme),
  textbook toggle, live preview, Download/Copy; settings per project in localStorage. Copy
  diagram as PNG/SVG commands; CSV import via menu and drag-and-drop with summary dialog.
- Validation worker made Zod-free (127 → 28 kB). Initial JS ≈ 229 kB gz.

### Phase 7

- `core/model/hierarchy.ts`: convert a step to macro-step (new expansion E → S) or enclosing step
  (new enclosed grafcet with a * step), parent lookup, entry/exit detection.
- Compiler/engine: macro-steps inlined (entry/exit rewiring, virtual activity and timers),
  enclosures (activation of * steps, recursive deactivation, guarded transitions), per-grafcet
  initial situation for `G{INIT}`. Golden tests for macro-steps and enclosing steps.
- Validation: missing/shared/unused sub-grafcets, stored actions on macro-steps, forcing cycles.
- UI: step kind selector, E/S and * markers (also in exports), double-click / Alt+↓ to open a
  sub-grafcet, Alt+↑ to the parent, tab badges, grafcet kind and parent in properties.
- Fixed: double-click hit-testing under pointer capture (it created a step instead of editing).

### Phase 8

- `core/codegen/common.ts`: name allocation (no clash with user variables or ST keywords), IEC
  literals, GRAFCET expression → ST translation with precedence-correct parentheses.
- `core/codegen/st.ts`: one function block; spec pattern (forcing flags, all Tn, all Xn with rule 5,
  forcing, macro activity, TON/TOF/R_TRIG/F_TRIG, stored actions from scan-to-scan change,
  continuous ORs); enclosures and guards; optional stability-loop variant.
- `core/codegen/plcopen.ts`: TC6 2.01 XML, SFC per partial/enclosed grafcet with macro-steps
  inlined (auto-layout positions), jumps for upward links, qualifiers N/D/L/S/R/P1/P0, signals
  program for edges/timers, step mirrors for cross-program reads, globals in one resource.
- Export dialog: Structured Text and PLCopen XML (lazy chunks), options, warnings list, copy;
  File › Export as entries. Snapshot test per construct, XML well-formedness, key semantics.

### Owner requests after phase 7 (not a numbered phase)

- Text fields: one `gm-input` style (sizes, mono, ghost, select, textarea), auto-growing inline
  editor on the canvas with key hints, commit/revert hints in the properties panel.
- Export: WebP (quality, transparency), direct **File › Export as** entries, Excel variables.
- Variables: pure `.xlsx` reader/writer (`core/io/xlsx.ts`, fflate), Excel/CSV import and export;
  right-panel **Variables** tab (search, direction chips, groups, keyboard, details with where-used
  and jump-to); bottom table redesign (sort, filters, windowed rows, uses → details).
- Project title renamed in place (double-click).
- Action marks: stored-on-activation ↑ above the box, on-deactivation ↓ below it, event flag at
  the top right with the event; shared `actionDecor` geometry for canvas and exports; warning for
  an action on event without event; action badges moved to the bottom-right corner.
- Edges in expressions: `^` types ↑, Alt+↑ / Alt+↓ toggle an edge on the operand at the caret
  (`core/expr/edges.ts`, tested), symbol bar with ↑ ↓ NOT AND OR ( ) timer and help link.
- Contextual hint bar on the canvas (selection, tool, gesture, simulation), toggle in View and
  Settings.
- Settings dialog (Ctrl+,): appearance, editor, simulation defaults (speed, flash, step timers),
  data and storage (usage, backup, clear history / recents, reset preferences), about.
- Help center (F1, `#help/<page>`): docked panel, Markdown pages in `docs/help` rendered by a safe
  subset parser, real diagrams drawn by the SVG exporter, search, prev/next; tests check links,
  anchors and figures.

## Decisions

- TypeScript pinned to 6.0.x: typescript-eslint does not support TS 7 (native port) yet.
- Diagram text uses bundled JetBrains Mono (OFL): fixed 0.6 em advance makes text widths
  computable in pure `core/` code (layout, export) without DOM measuring.
- Identifiers case-insensitive (IEC 61131-3), see `docs/semantics.md`.
- Playwright uses port 4391 to avoid clashing with other local Vite previews.
- Undo granularity: adding an action and typing its text are two history entries.
- Deleting a step heals the sequence (removes the following transition; a first/last step takes
  its single transition along). Deleting a transition alone does not heal (that would delete an
  unselected step). The gap closes only when everything below is downstream of the healed spot.
- New partial grafcets start numbering at the next multiple of 10 so cross-grafcet `Xn`
  references stay unambiguous.
- Clipboard: JSON text via copy/paste events (no permission prompt), in-memory fallback.
- Comparisons read greedily (`a + C > 3` = `(a + C) > 3`, flagged with a fix hint); see
  `docs/semantics.md`.
- Expressions with problems can always be committed; they are reported, never blocked.
- Auto-layout keeps the current left-to-right order of branches; without a merge point the
  longest branch stays in the column ("continue or loop back" stays straight).
- Renumbering starts at the grafcet's lowest number and refuses on reference conflicts rather
  than silently changing meaning.
- Validation severities follow the spec; extra checker diagnostics (types, ambiguous `Xn`) are
  errors. Dead-end ignores steps without upstream transitions (a lone new step is not noise).
- Simulation interpretation choices are all in `docs/semantics.md` (Simulation). Notable: a
  first stability search at t = 0; clearing without effect ends the search; edge memories advance
  per grafcet; forced grafcets observe the end-of-cycle state.
- PDF text uses Courier (standard font, 0.6 em like the editor font) with ASCII comparison
  operators and vector-drawn edge arrows; PNG/SVG embed the bundled font.
- Export settings are per project per device (localStorage), not in the project file, so
  changing them neither dirties the document nor creates undo steps.
- Enclosed grafcets reuse step kind `initial` for the * steps; a step cannot be both initial and
  macro/enclosing (kind is a single value), so initial enclosing steps are not supported.
- Commits go directly to `main` (greenfield repo, as instructed by the build spec); never pushed.
- Codegen reuses the simulator's compiled program (same Xn resolution, macro inlining,
  enclosures, forcing targets) instead of a second model walk.
- ST stored actions use a per-step previous-scan memory (`X_M`) rather than transition pulses, so
  rule 5, forcing, enclosures and the first scan are handled uniformly.
- Help pages are plain Markdown in `docs/help` (readable on GitHub too), bundled into the lazy
  help chunk; figures are named builders in `app/help/figures.ts` (`<!-- figure: id | caption -->`),
  shown as `<img>` of exporter SVG so no HTML is ever injected.
- The help center is a docked, non-modal panel so beginners can follow a tutorial while drawing.
- Variable table windowing: fixed 34 px rows above 120 rows; a cell scrolled out of the window
  commits its pending edit.

## Known gaps

- Enclosing step symbol (vertical inner lines) not verified against the IEC 60848 figure; adjust
  in `elements.tsx` and `svgExport.ts` if the standard differs.
- An initial step cannot be a macro-step or an enclosing step (data model limitation).
- Generated code is not compiled by a real PLC toolchain in CI (no vendor tools available); the
  ST uses only standard IEC 61131-3 constructs and the XML follows TC6 2.01 by hand. Vendor
  profiles (TIA, CODESYS, TwinCAT, Rockwell) remain future adapters.
- SFC export: forcing orders, enclosure semantics and source/sink transitions are not
  representable and are reported; conditional continuous actions keep their value after the step.
