# Contributing to GrafcetMaker

Thanks for helping! GrafcetMaker is a browser GRAFCET (IEC 60848) editor and simulator.
Priorities, in order: **correct semantics > UX speed > features**.

## Setup

```sh
npm ci
npm run dev        # http://localhost:5173
```

Node 20.19+ (24 recommended).

## Before you open a pull request

```sh
npm run typecheck
npm run lint
npm run format     # Prettier
npm test           # Vitest unit tests
npm run build
npm run e2e        # Playwright smoke test (Chromium); first run: npx playwright install chromium
```

CI runs the same steps.

## Architecture

The code is in layers; each imports only the layers below it (ESLint `no-restricted-imports`
enforces it): `core` ← `ui` ← `editor` ← `panels` ← `app`. When a lower layer needs something only
an upper one knows, the upper one fills it in (the app registers the commands the editor runs, see
`src/editor/commands/command.ts`).

- `src/core/` — pure TypeScript, runs in Node and Web Workers: `model` (types, Zod schema, editing
  operations), `expr` (parser, checks), `layout` (geometry, link routing, auto-layout),
  `validation`, `simulation`, `codegen`, `io` (file formats, SVG/PDF layout), `collab`.
- `src/ui/` — the shared UI kit (primitives, icons, flags, splitter, glossary popovers) and small
  app-wide stores (preferences, toasts, dialogs, help panel state). Knows nothing of the editor.
- `src/editor/` — the diagram editor: `canvas` (SVG renderer, gestures, inline editors), `store`
  (document with undo/redo, UI state, panel sheet, live presence), `commands` (editing operations
  and the command lookup), `simulation` and `validation` (their stores, driving the workers), `tools`.
- `src/panels/` — the cards and panels: properties, variables, problems, simulation, chronogram,
  outline.
- `src/app/` — the application shell and its features: layout islands, menus, the command registry
  and shortcuts (`commands/`), persistence, export, help, start screen and tour, collaboration,
  settings, feedback.
- `src/theme/`, `src/i18n/` — theme tokens and switching; translations (any layer may use them).
- `src/workers/` — the simulation and validation Web Workers (run `core`).
- `src/site/` — the website pages (GRAFCET guide, help, home) rendered at build time.
- `worker/` — the Cloudflare Worker of the hosted site (relay, feedback, language by country);
  `server/relay.ts` is the on-premises relay.
- `tests/unit/` (Vitest), `tests/e2e/` (Playwright), `docs/` (user guide, semantics, file format,
  help pages and guide in every language).

## Ground rules

- `src/core/` is pure TypeScript: no React, DOM, storage or i18n imports. It must run in Node and Web
  Workers (ESLint enforces this).
- Every document mutation goes through `execute(label, recipe)` so it is undoable.
- Never use `eval` or `new Function` — the app ships with a strict Content-Security-Policy.
- No hard-coded colors: use the tokens in `src/theme/tokens.css`. Check both light and dark themes.
- All user-visible strings go through i18next (`src/i18n/en.ts`), using standard IEC 60848 terms
  (step, transition, receptivity, clear, enabled).
- Any semantic interpretation choice must be recorded in `docs/semantics.md`.
- Tests are risk-based: simulation engine, expression parser, file I/O, undo/redo, codegen, and
  graph-logic validation rules. Don't add tests for trivial UI.
- Keep the file format backward compatible: bump `SCHEMA_VERSION` and add a migration in
  `src/core/io/migrations.ts`, and document it in `docs/file-format.md`.

## Recipes

### Add a language

Copy an existing language everywhere it appears (search the code for one, e.g. `'da'`):

1. `src/i18n/<lang>.ts`, typed against `src/i18n/en.ts`, with the standard GRAFCET terms of that
   language; in `src/i18n/index.ts` its name (`LANGUAGES`), loader (`LOAD`) and the countries whose
   visitors start in it (`COUNTRIES`).
2. Its flag in `src/ui/flags.ts`.
3. The website: `LANGS` and `SITE_TEXT` in `src/site/locales.ts`, the figure words (`WORDS`) in
   `src/site/figures.ts`, and an `hreflang` link in `index.html`.
4. The help pages `docs/help/<lang>/` (every page of `docs/help/`), the GRAFCET guide
   `docs/guide/<lang>.md` and the home page `docs/home/<lang>.md`; add the guide to the lists of
   languages in `README.md` and `docs/home/en.md`.
5. `LANGS` in `tests/unit/i18n.test.ts`, which checks the strings, their plurals and the help pages.

### Add a validation rule

1. Add its id to `RuleId` in `src/core/validation/types.ts` and write the rule as a pure function
   in `src/core/validation/validate.ts`, called from `validateProject` (rules with graph logic go
   with their helpers in `logic.ts` and are documented in `docs/semantics.md`). An issue names its
   severity, the message key `problems.messages.<key>` with its parameters, and the elements to
   highlight (the first one carries the badge).
2. A quick fix: add it to `QuickFix` (`types.ts`), apply it in `applyQuickFix`
   (`src/editor/validation/actions.ts`, one undo step) and label it `problems.fixes.<kind>`.
3. Strings in `src/i18n/en.ts` and every other language; explain the problem and its fix in
   `docs/help/troubleshooting.md` and the translated pages.
4. Tests in `tests/unit/validation.test.ts` only for rules with graph logic (reachability,
   exclusivity, transient loops).

### Add a step or action kind

The compiler and the linter find most of the places to change: every table over the kinds is a
`Record<StepKind | ActionKind, …>` and every `switch` over them must handle each kind (ESLint
`switch-exhaustiveness-check`, type-aware).

1. Add the kind to `stepKindSchema` or `actionKindSchema` in `src/core/model/schema.ts`. Older
   versions of the app reject files using it: bump `SCHEMA_VERSION` (`src/core/model/constants.ts`)
   with a migration in `src/core/io/migrations.ts`, and document it in `docs/file-format.md`.
2. Run `npm run typecheck` and `npm run lint` and fix every error. They point at, among others:
   `STEP_MARK` and `actionDecor` (`src/core/layout/shapes.ts`), `expectedChildKind`
   (`src/core/model/hierarchy.ts`), `ACTION_UI_KINDS` / `uiKindOf` (`src/core/model/actionKind.ts`),
   `actionTextKind` (`src/core/expr/check.ts`), the simulation program
   (`src/core/simulation/program.ts`), the PLCopen export (`src/core/codegen/plcopen.ts`), the
   contextual help (`src/app/help/contextHelp.ts`), the glossary terms
   (`src/panels/PropertiesPanel.tsx`), the pictures of `src/panels/StepKindPicker.tsx` and
   `src/panels/ActionKindPicker.tsx`, and the labels built from the kind in `src/i18n/en.ts`
   (then every other language: they are typed against English).
3. Review what tests for one kind (`kind === '…'`), which no tool flags: the simulation engine
   (`src/core/simulation/engine.ts`, and record the semantics in `docs/semantics.md`), validation
   (`src/core/validation/validate.ts`), Structured Text (`src/core/codegen/st.ts`, `stCase.ts`,
   `common.ts`), drawing (`src/editor/canvas/elements.tsx`, `src/core/io/svgExport.ts`), the text
   format (`src/core/io/grafcetText.ts`), the grafcet.io import (`src/core/io/grafcetIo.ts`), and
   for steps `src/core/model/hierarchy.ts`, `src/editor/commands/hierarchy.ts` and
   `src/core/model/renumber.ts`.
4. Add a golden chart to `tests/unit/simulation.test.ts` and a snapshot to
   `tests/unit/codegen.test.ts`; describe the kind in `docs/help/actions.md` or
   `docs/help/hierarchy.md` (and the translated help pages) and in `docs/user-guide.md`.

### Add an export format

1. Add an entry to `EXPORT_FORMATS` in `src/app/export/formats.ts` (its place there is its place in
   the Export dialog): what the file holds (`content`, which decides the dialog's scope, appearance
   and preview), extension and MIME type, what Copy copies, whether it gets an "Export as …"
   command, and `produce`, which loads its exporter from `src/app/export/produce.ts`. The
   `ExportFormat` union, the stored settings' schema, the dialog's list and the commands derive
   from this table.
2. Write the exporter in `produce.ts`; put heavy code in its own module loaded with `import()`
   (as `pdf.ts` and the code generators are) to keep it out of the main bundle.
3. Options of its own: add them to `ExportSettings`, `DEFAULT_EXPORT_SETTINGS` and the stored
   settings' schema in `src/app/export/exporters.ts` (each setting falls back to its default, so
   settings stored by older versions still load), and draw them in the `options` switch of
   `src/app/export/ExportDialog.tsx` (the linter asks for the new case).
4. Strings: `export.formats.<id>` and `export.formatHints.<id>` (the type checker asks for them),
   and with a command `commands.file.export<Id>` and an entry in the File menu
   (`src/app/menus.tsx`), in `src/i18n/en.ts` and every other language. Describe it in
   `docs/help/files.md` (and the translated help pages) and `docs/user-guide.md`.

## Commit messages

One short sentence saying what changed for the user, as it now is, e.g. "A selected jump is
highlighted as an arrow" (internal changes say what the code now does: "Export formats come from
one descriptor table"). Add user-visible changes to `CHANGELOG.md` under `[Unreleased]` (Keep a
Changelog).
