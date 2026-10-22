# Progress

Autonomous build log. Read this first in every session and resume from **Current phase**.

## Current phase

**Phase 2** — expression parser, variables, autocomplete.

## Phases

| Phase | Scope                                                                | Status |
| ----- | -------------------------------------------------------------------- | ------ |
| 0     | Scaffold, theme, CI, model + schema, LICENSE/README                  | done   |
| 1     | Core editor, undo, shortcuts, save/open/import (drag-drop), autosave | done   |
| 2     | Expression parser, variables, autocomplete                           |        |
| 3     | OR/AND structures, loops, source/sink, auto-layout                   |        |
| 4     | Validation                                                           |        |
| 5     | Simulation                                                           |        |
| 6     | Exports                                                              |        |
| 7     | Hierarchy (partial, macro, enclosing, forcing)                       |        |
| 8     | Codegen                                                              |        |
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
- Commits go directly to `main` (greenfield repo, as instructed by the build spec); never pushed.

## Known gaps

- None yet.
