# Progress

Autonomous build log. Read this first in every session and resume from **Current phase**.

## Current phase

**Phase 1** — core editor, undo, shortcuts, save/open/import (drag-drop), autosave.

## Phases

| Phase | Scope                                                                | Status |
| ----- | -------------------------------------------------------------------- | ------ |
| 0     | Scaffold, theme, CI, model + schema, LICENSE/README                  | done   |
| 1     | Core editor, undo, shortcuts, save/open/import (drag-drop), autosave |        |
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

## Decisions

- TypeScript pinned to 6.0.x: typescript-eslint does not support TS 7 (native port) yet.
- Diagram text uses bundled JetBrains Mono (OFL): fixed 0.6 em advance makes text widths
  computable in pure `core/` code (layout, export) without DOM measuring.
- Identifiers case-insensitive (IEC 61131-3), see `docs/semantics.md`.
- Playwright uses port 4391 to avoid clashing with other local Vite previews.
- Commits go directly to `main` (greenfield repo, as instructed by the build spec); never pushed.

## Known gaps

- None yet.
