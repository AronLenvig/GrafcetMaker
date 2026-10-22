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

## Commit messages

Short imperative summary, e.g. `simulation: handle edges in transient evolution`.
Update `CHANGELOG.md` (Keep a Changelog format) for user-visible changes.
