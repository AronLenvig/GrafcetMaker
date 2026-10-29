# Progress

Autonomous build log. Read this first in every session and resume from **Current phase**.

## Current phase

**All phases done — version 1.0.0.** Next: owner requests and maintenance (see Known gaps).

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
| 9     | Onboarding, examples, i18n, a11y audit, PWA, perf                    | done   |

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

### Phase 9

- Examples (`app/examples`): traffic light, drilling station, tank filling, parallel conveyor,
  bottling line (macro-step, AND stations, inspection, transient count, action without a step),
  operating modes (enclosing step, stop at end of cycle, pause by `Cycle{*}`, emergency stop by
  `Modes{0}`), built from a compact spec with model ops + auto-layout (`ref` links sub-grafcets,
  `free` adds actions without a step), comments and scenarios; tested valid, free of problems,
  and the behaviour of the traffic light and of both large examples' scenarios.
- Start screen (default on, "show at startup"), five-step tour with dimmed cut-out, glossary
  popovers (24 px targets) linked to help sections (tested), outline tree view (WAI-ARIA tree).
- PWA (vite-plugin-pwa, prompt mode): manifest, PNG/maskable icons, every chunk precached (works
  offline, verified), update card, hourly update check, "What's new" from CHANGELOG.md.
- i18n: all UI strings in `en.ts` (file-picker descriptions too); example content is project data.
- Accessibility audit (axe 4.10, WCAG 2.0–2.2 A/AA + best practices) over start screen, editor in
  light and dark, side panel tabs, settings, export, help, simulation and chronogram: zero
  violations after fixes (dialog role, one side-panel landmark, h1 in every state, heading order,
  24 px switches and help buttons, focusable chronogram scroller, table header text).
- Performance (production build, Chromium, 1440×900): first contentful paint 132 ms; opening a
  500-step / 1500-element chart 93 ms; panning median 16.7 ms, p95 16.8 ms per frame (60 fps) both
  at 100 % and zoomed out to the whole chart; initial JS ≈ 247 kB gzip; validation ≈ 15 ms at 540
  steps (phase 4).
- Version 1.0.0, CHANGELOG release entry, README feature list.

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
- Split view: `useUi.split` (two panes, focus, orientation) kept in sync with
  `activeGrafcetId`; Canvas takes its grafcet as a prop, canvas sizes per grafcet; pane headers
  with grafcet picker, swap, close; tab context menu; View › Split view; ratio in prefs.
- Feedback: dialog with three channels (anonymous endpoint, mailto: `VITE_FEEDBACK_EMAIL`, copy),
  optional contact and app/browser details; rail footer with Help and
  Feedback (also shown while simulating).
- Help center (F1, `#help/<page>`): docked panel, Markdown pages in `docs/help` rendered by a safe
  subset parser, real diagrams drawn by the SVG exporter, search, prev/next; tests check links,
  anchors and figures.

### Owner requests after 1.0.0

- Unattached actions: `Action.stepId: Id | null` + `position`, file format 2 (identity migration
  from 1), geometry `freeActions` / `actionBoxOf`, ops add/attach/detach, move, clipboard, SVG/PDF
  export, Action tool (`Shift+A`; `A` falls back to it), drag onto a step to attach (highlighted
  target), Properties step picker, outline, hints. Semantics corrected by the owner: an action
  without a step is **always active** (continuous → its condition; event → on each event;
  activation → once at start; deactivation → never, warned; forcing → always). Simulator
  (`Program.alwaysActions`), ST, PLCopen (`GRAFCET_Always` program) and validation (parallel
  outputs with always-active drivers). Tests in `tests/unit/actions.test.ts`.
- Fix: placing tools switched back to Select after creating the element, which closed the editor
  a new comment opened.
- Share links (`src/core/io/shareLink.ts`): File › Copy share link puts the project in
  `#share=<base64url(deflate-raw(compact JSON))>`; opening one (launch or `hashchange`) goes
  through `parseProjectFile`, asks about unsaved changes and clears the hash. Tests in
  `tests/unit/shareLink.test.ts`.
- Mobile friendly. `src/app/ui/media.ts` (`useCompact`: ≤639 px wide or ≤479 px tall; `useCoarsePointer`)
  and the Tailwind `compact:` variant. Phone layout (`App` → `CompactLayout`): `CompactTopBar` with
  the `MenuDrawer`, canvas without split view, `BottomToolbar`, `PanelSheet` (panels as tabs,
  state in `src/app/sheet.ts`; `showBottomTab` / `showSideTab` open it on phones), help full
  screen, compact `SimBar`. The main menu is data (`src/app/menus.tsx`) rendered as menu bar or
  drawer. Touch in `useCanvasInteraction`: pinch (two pointers), one-finger pan on empty canvas,
  double-tap, long-press frame, placing tools act on release, 8 px slop. `SelectionBar` on touch
  screens; link handles offset outside the element with a 24 px+ target; wider hit areas;
  touch hints; dialogs (start, export, settings, modal, inline editor) stack on phones. e2e: one
  phone test (double-tap, selection toolbar, sheet, simulation).
- Loop routing (`computeGeometry`): bottom lines are placed sources left to right, each the
  first y below its source where a line to the left crosses nothing of its sequence (elements,
  texts, wires, bottom lines of loops further left: `freeDropY`); lanes then go by bottom line
  (higher inside) and only around the loop's own connected sequence (`sequences`); one arrow per
  shared lane. `routing.dropY` (optional, no schema bump: older versions ignore it), dragged on
  the bottom line, moved/pasted with the transition; double-click resets routing. Tests in
  `tests/unit/routing.test.ts`.
- Owner decisions: starting the simulation runs the clock (`startSimulation` calls `play`); the
  evolution log is folded by default (`useSheet.simLogOpen`, session only); a step's actions are
  compact rows (`ActionRow`: symbol, text, condition) unfolding into `ActionFields`, all folded
  when a step is selected (`StepProps` keyed by step). A selected action keeps the full editor.
- Code health pass (review by area, verified before applying): validation memoizes atom keys,
  builds one index and one expression environment factory (`envFactory`) per run; auto-layout
  measures each node once; expression widths are memoized; SVG export computes geometry once;
  shared codegen helpers (`warningCollector`, `warnKeywords`, `macroSteps`, `cdata`). Editor:
  simulation cycles keep their array when nothing arrives, cached media queries, memoized canvas
  layers, a narrow interaction subscription, the clock in its own component, `elementKind` /
  `revealInGrafcet` reused, nudge command factory. UI: `FloatingCard`, `PanelTabsView`,
  `usePanelLabel`, `ProblemsBadge`, `THEME_MODES`, per-preference menu items. Dead code removed.
- Floating layout: canvas-first desktop/tablet UI with islands (menu + project + properties
  toggle; tools with key letters and new 1.5-stroke icons; problems / Simulate / share; zoom +
  undo; grafcet tabs; panel buttons + help + feedback), floating properties card and panel card,
  simulation controls as an island, help as a card. Removed: top bar, left rail, docked right
  and bottom panels, the side variable list (desktop), `view.toggleLeft`, `view.variableList`
  and their prefs. Step kind picker (`StepKindPicker`, shared `PicturePicker` with the action
  kinds). Tour stops moved to the islands. e2e selectors follow the ☰ menu and panel buttons.

- Search visibility of grafcet.org. `index.html`: keyword title and description, canonical,
  Open Graph/Twitter tags (`public/og-image.png`, 1200×630), JSON-LD (WebSite +
  SoftwareApplication), `<noscript>` text; `__SITE_URL__` placeholders filled from `SITE_URL`
  (default `https://grafcet.org/`). The tab keeps that title on a first visit (`TopBar`). Static
  GRAFCET guide per language (`docs/guide/{en,fr,de,es}.md` → `<lang>/index.html`): the
  `website()` plugin in `vite.config.ts` loads `src/site/render.ts` with Vite's `runnerImport`
  in `generateBundle`, reusing the help Markdown parser, the help figure builder
  (`src/site/figures.ts`, words per language) and `grafcetToSvg` (sentinel colors restyled by
  `src/site/site.css` after `tokens.css`, so figures follow light/dark), examples linked as share
  links; CSP by hash like `index.html`; `sitemap.xml` with hreflang, `robots.txt`. Precached by
  the service worker. Help › GRAFCET guide and a start screen
  link (`guideUrl()`, browser language).

- Readable without JavaScript (most AI crawlers do not run it). `docs/home.md` (features,
  supported elements, simulation, exports and target PLC tools, examples, FAQ) is rendered by
  `renderHome()` into `<div id="root">` of `index.html` at build time (`transformIndexHtml`, not in
  dev), followed by a list of every page; `.static-home` in `src/theme/index.css` hides it once the
  theme bootstrap has set `data-theme` (no flash) and makes it readable and scrollable otherwise.
  The help pages (`docs/help`) are published at `help/` and `help/<page>/` with the guide's frame
  (`frame()`), a page list with the current page's sections, TechArticle + BreadcrumbList data;
  not precached (the app has its own help). `llms.txt` is the
  home text with absolute links plus the page list. Sitemap lists the help pages; guide footers
  link the help. The `website()` plugin loads `src/site` once per build.

- grafcet.io import (`src/core/io/grafcetIo.ts`, tests `tests/unit/grafcetIo.test.ts`): edges
  joined into nets through loop nodes/markers and branch bars, frames and separate charts as
  partial grafcets, all action types, conditional forcing as a helper grafcet, `*`/comparison
  disambiguation, variables from the checker's create suggestions, per-sequence auto-layout.
  Opened from `openFile` (extension or `createdWith` marker, lazy-loaded) as an unsaved project
  with a notes dialog. Checked on two real files from the owner (0 validation errors).
- Structured Text CASE style (`src/core/codegen/stCase.ts`), default in the Export dialog
  (`st.style`): sequences = union of steps over transitions after macro inlining; CASE when
  single-token, otherwise BOOL equations as in `st.ts`. `stBool` gained `stepIsComparison` and
  `minimalParentheses` (comparisons parenthesized only under NOT). Snapshots per construct.

- Live collaboration (owner request). Model (`src/core/collab/records.ts`): the project as records
  (project, grafcet order, variables, scenarios, grafcets, steps, transitions, actions, comments)
  whose fields are last-writer-wins registers (version, random nonce: Excalidraw's per-element
  model, per field), tombstones for deletions; local edits diffed by identity against the last
  synced project; the shown project derived from the records with a deterministic repair (dangling
  links, actions of missing steps, duplicate grafcet/variable names, grafcet order), sharing
  unchanged objects. Messages and links (`wire.ts`, `link.ts`): `#room=<id>,<key>`, AES-GCM
  sealed JSON (deflated over 1 KB), Zod-checked, protocol + schema version. Document store:
  `applyRemote` (no history), `generation` (another project opened → leave), undo/redo check each
  field against the state the entry left and skip what others changed (`replay`), cancel applies
  what still fits. Session (`src/app/collab/session.ts`, lazy): WebSocket with backoff and ping,
  full state + request on (re)connect answered by the lowest joined relay id, which also stores the
  sealed snapshot 2 s after changes settle; flush ≤ 50 ms, presence ≤ 80 ms; records kept in
  IndexedDB (`rooms`, Dexie v2) and the room in sessionStorage so a reload rejoins; while
  simulating remote changes wait (`held`) until Stop or **Restart with changes**
  (`reloadSimulation`). UI: `LiveIsland` (top right, in place of the share link button, which is
  the fallback without a relay; avatars with initials, ▶ when simulating, click follows),
  `LiveDialog` (start / join / session), `PeerLayer` (pointers, selections, ✎ edited element;
  colors `--peer-0…7`, `--peer-fg`), `HeldChanges` in the simulation bar, **File › Live
  collaboration…**. Relays: `worker/room.ts` (protocol), `worker/collab.ts` (Durable Object
  `CollabRoom`, hibernation, auto ping/pong, alarm deletes after 30 days), `server/relay.ts`
  (Node + `ws`, on premises; `deploy/relay.Dockerfile`, `relay-proxy.conf`,
  `docker-compose.yml`). Tests: convergence of three replicas under random concurrent edits
  (valid and identical projects), field merges, repairs, undo with remote changes, sealing;
  Playwright: two contexts through the Node relay (edit both ways, presence, held changes while
  simulating, leave). Checked by hand against `wrangler dev` (join from the snapshot alone,
  reload rejoins).

- French, German and Spanish. `src/i18n/{fr,de,es}.ts` typed as `Messages` (the keys of `en.ts`,
  any wording); `src/i18n/index.ts` loads them as separate chunks, starts in the saved choice
  (`grafcetmaker.lang`), else in the language of the visitor's country (owner decision: the
  Worker serves `/` with `<html data-country>` from `request.cf.country`, `worker/country.ts`;
  `languageOfCountry` maps it, English otherwise and without the Worker; the result is remembered
  because the service worker later serves `/` without the attribute), renders only once that language
  is loaded (no English flash) and sets `<html lang>`. Help pages in `docs/help/<lang>/` keep the
  English anchors with `## Titre {#anchor}` (deep links from the app and the guide), loaded by
  `helpPages(lang)` with English as fallback; the website publishes them at `<lang>/help/` with
  hreflang alternates, a language switcher and sitemap entries. Language button (`LanguageMenu`,
  bottom right with help and feedback), a Language group in the main menu, a switch in the phone
  drawer, one palette command per language. `tests/unit/i18n.test.ts`: every key with the same
  placeholders, every help page with the same anchors, figures, links and keys. Translations by
  model, terminology from the four guides; e2e pinned to `en-US`.
- The canvas first: toolbar islands and the hints rest at 80 % opacity until hovered, focused or
  holding an open menu (`gm-card` marks the cards that stay solid; no fade on touch screens or
  with `prefers-contrast: more`). Simulate is a compact play icon (the owner found a sliding
  label annoying); every tool button shows its key in the corner (`⇧A`, `F5`).
- Addresses per language. The build emits the editor at `<lang>/index.html`: `appPages()` swaps
  index.html's English title, description, Open Graph texts, canonical and home text for the
  language's (`SITE_TEXT`, `docs/home/<lang>.md`; the build fails if index.html drifts from
  them). `<base href>` pins the app's root (`./` at the root, `../` one folder down), so assets,
  `api/…`, the service worker and `history.replaceState` resolve from the root; the help hash
  keeps the full path. The address's language wins and is remembered; `setLanguage` replaces the
  address's language folder (`rootOfPath`: …/de/ → …/fr/, never …/de/fr/). The dev server gives
  /<lang>/ the `../` base too, like the build. Guide at `<lang>/guide/`, help at `<lang>/help/` (Cloudflare
  `_redirects` for the former `help/`); hreflang on every page with the root as x-default.
  Flags (`src/app/ui/flags.ts`, SVG data shared by the app and the site) with hover hints.
- Tour (owner request: direct and useful for beginners): five steps done on the diagram, not read
  (`Tour.tsx` `STEPS`): select the initial step, add a transition and step with a receptivity, give
  it an action, simulate until a non-initial step is active, then where help is. Each step moves on
  by itself (`isDone`; new transitions and actions are those not `known` when the tour began) after
  "Well done", Next skips ahead. Nothing is dimmed or captured: an outline follows the target every
  frame and the card keeps to the top-right corner over the canvas.
- Danish and Swedish (`src/i18n/{da,sv}.ts`, `docs/help/{da,sv}/`, `docs/guide/{da,sv}.md`,
  `docs/home/{da,sv}.md`, `SITE_TEXT` and figure `WORDS`): first visits from DK/GL/FO start in
  Danish, SE/AX in Swedish. No official Danish or Swedish GRAFCET vocabulary was found; the terms
  follow DS/EN and SS-EN 60848 usage where known (trin/steg, transition/övergång,
  transitionsbetingelse/övergångsvillkor, aktion). Figure action names stay ASCII (identifiers),
  e.g. `Hoejre`, `Upp`/`Ned`.
- The main menu no longer lists the languages (owner request): the flag button at the bottom
  right and the palette on desktop, the flags in the menu drawer on phones.
- Loop lanes beside their body (`geometry.ts` `loopBody`: what lies on the way down from the
  target to the source, following downward links only): a lane starts just left of its body and
  moves left past elements, wires and other loops' lanes and lines in its way; loops to one target
  share the leftmost lane. Bottom lines are cleared only between the source and the lane.
  Auto-layout pads a block holding whole loops (`lanePad`: margin + one lane per nesting level).
- F1 is contextual (`src/app/help/contextHelp.ts`, targets in `helpTargets.ts`): the expression
  being typed (inputs carry `data-expression`; the inline editor and expression input let F1
  through), the simulation, the variable shown, a link, a multiple selection or the selected
  element (OR/AND branch for a transition in one) open their section; F1 on the same section
  closes it, and with nothing selected it toggles as before. A test checks every target's page and
  anchor exist in all six languages.
- Unknown addresses: `public/404.html` (status 404, meta refresh to `/`, noindex) instead of the
  editor's page, whose relative paths load nothing away from its own addresses. Cloudflare
  `not_found_handling: "404-page"` (also for unknown `/api/*`, through the assets binding), nginx
  `error_page 404`, and no `navigateFallback` in the service worker (the app's pages are precached
  as themselves, so it still opens offline). The redirect goes to the server root: a sub-path
  install behind a proxy needs its own not-found page.
- Multiple selection overview (`SelectionOverview.tsx`): counts per kind (a chip keeps only that
  kind) and the selection as a WAI-ARIA tree in renumbering order (`stepOrder`), each step with its
  selected actions and outgoing transitions; an unselected step shown for its children is faded and
  italic. A line selects its element alone (`revealInGrafcet`), Ctrl/Shift+click toggles it; at
  most 200 lines.
- Help center revision: typing on the diagram, ghosts (transition alone), selections with
  actions and links, the language section, the current layout, every problem message in
  Troubleshooting, Settings under File; synced to all six languages.
- Security review (owner request): ids that are `Object.prototype` names (`constructor`,
  `__proto__`…) are refused by the shared `idSchema` (`isSafeKey`) and the collaboration record
  keys, and integrity checks use `Object.hasOwn` (such ids passed `map[id]` checks and crashed the
  editor on every launch, or broke a live room). Collaboration stores schema output (unknown
  nested keys dropped), caps records at twice the element limit, checks the joined project with
  `projectSchema`, and asks about unsaved changes unless rejoining. CSV export escapes formula
  starts (`escapeFormula`, undone on import); xlsx import unpacks only XML parts (32 MB), bounds
  rows/columns/cells and scans tags in linear time; grafcet.io import made linear in its frame
  lookups. Exports drop non-XML characters (`core/io/xml.ts`); ST comments neutralize `/* */`,
  U+2028/2029 and bidi controls; generated names avoid every referenced name. New validation error
  `hierarchyCycle` (compile leaves such macro-steps un-inlined). Parser nesting limit 100
  (`tooDeep`). Hosted site: security headers (`public/_headers`, `worker/headers.ts`), Origin
  check on relay WebSockets (loopback allowed for development) and on feedback POSTs. Node relay:
  malformed request paths no longer throw.
- Numbers on the diagram while simulating (owner request): each INT/REAL/TIME variable read by a
  receptivity or condition shows its value in a box over its name (`ExprText` `values`, from
  `variablesOf`), above any overbar; a click on it, or on the `= n` under a stored action writing a
  numeric variable, types a new value in place (`SimValueEditor`, `setInput`), inputs and
  internal variables/outputs alike (docs/semantics.md).
- Right mouse button pans (owner request): held and dragged it pans like the middle button; the
  browser's context menu event is swallowed and the menu opens on release when it did not move
  (a synthetic `contextmenu` at the pointer), so it behaves the same on Windows (menu on release)
  and macOS/Linux (menu on press).
- AI assistants (owner request): GRAFCET text (`core/io/grafcetText.ts`: parse with line errors,
  write, `#text=` links), the examples' builder moved to `core/io/buildProject.ts` and shared;
  `docs/ai.md` published as `ai.txt` (example link computed at build time), announced in
  `llms.txt` and the home page text; File › Open from text… (`TextDialog`, also shown for a
  `#text=` link that cannot be read) and File › Copy as text. Tests: every construct, round trip
  of every example, line errors, links, the guide's examples open without errors.

## Decisions

- Floating layout (owner request): no docked bars on desktops and tablets. `src/app/Islands.tsx`
  composes the islands (`.gm-island`); `PropertiesCard` shows the properties while something is
  selected (`src/app/sheet.ts`: `hiddenFor` per selection, `pinned` with nothing selected,
  `focusedVariable` shows a variable's details); `PanelCard` is the one panel card, on the right
  (Variables as list, or as the table from 560 px; width in prefs); `SimulationCard` replaces the
  properties card on the left while simulating (the inspector was removed: the diagram shows the
  live state); the main menu is a ☰ dropdown (`MainMenuButton`). Fit, reveal and the hints keep
  clear of the cards (`setViewInsets`, `useSideWidths`). Phones keep their own layout (sheet).

- grafcet.io: several steps into one transition without an `andNode` are alternatives (one
  transition per step), since only the AND bar draws a synchronization; a loop into a
  transition's bottom joins that transition's output; a forcing order with a condition becomes a
  two-step helper grafcet (GrafcetMaker forcing orders have no condition).
- ST CASE style: alternative branches take the first true receptivity left to right (one
  transition per scan per sequence), the trade-off of the hand-written style; documented in the
  header and `docs/semantics.md`. Stored actions of steps changed by forcing do not run there.
- The website lives next to the app rather than in front of it: the app stays at `/` (share links,
  installed PWAs, on-premise paths unchanged) and the guide pages are plain HTML generated from
  Markdown at build time, so search engines get real text without a separate site or server.
  The home page text for crawlers lives in the root element of `index.html` instead of a landing
  page in front of the app, for the same reason.
- Phones get their own layout rather than a squeezed desktop one; tablets keep the desktop layout
  plus the touch additions. The diagram always gets the whole width; panels share one sheet over
  it (not persisted, so each visit starts with the full diagram). One finger on the empty canvas
  pans (no Space key on phones); a long press starts the frame selection instead. The tour and
  split view are desktop-only.

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
- The start screen opens at every launch by default (one click to continue, can be turned off):
  examples and the tour stay discoverable for beginners.
- PWA in prompt mode: an update never reloads by itself; the user chooses when.
- Owner decision (after 1.0.0): no restore prompt and no `beforeunload` confirmation. The last
  project reopens automatically on reload (dirty flag kept), autosave flushes on page hide.
- Feedback (owner decision, after 1.0.0): anonymous, without the owner's email in the app. The
  hosted site runs as a Cloudflare Worker with static assets (`wrangler.jsonc`; `worker/index.ts`
  runs only for `/api/*`, `worker/feedback.ts` is the endpoint, same origin, CSP unchanged)
  that files each message as an issue in a private GitHub repository (`GITHUB_REPO` in
  `wrangler.jsonc`, `GITHUB_TOKEN` secret). The app probes `GET api/feedback` once per session
  and falls back to mailto (`VITE_FEEDBACK_EMAIL`, empty by default) or Copy, so the static build
  still runs anywhere, air-gapped included.
- Share links use the URL fragment, not the path or query: it never reaches the server (no server
  URL limits or logs, works on static/on-prem/offline hosts, and the relative base path keeps
  working). Compression is the native `CompressionStream` (no dependency). The address bar is not
  kept in sync while editing (help links share the fragment, and browser history would fill with
  projects); the link is made on demand and removed after opening. Same project id as the sender,
  like a file: an existing dirty copy with that id is snapshotted before being replaced.
- Split view keeps one active grafcet (the focused pane) so every command, the properties panel and
  validation navigation work unchanged.
- The help center is a docked, non-modal panel so beginners can follow a tutorial while drawing.
- Variable table windowing: fixed 34 px rows above 120 rows; a cell scrolled out of the window
  commits its pending edit.
- Live collaboration (owner decisions): Excalidraw-style last-writer-wins per field rather than a
  CRDT library (no dependency, small relay, fits the patch-based store); text fields merge as whole
  values (two people typing in one receptivity: the last one wins). End-to-end encrypted, no
  accounts: anyone with the link edits. Undo is per person. Each person simulates on their own,
  and remote changes wait while they do; a shared simulation (one host broadcasting its state) is
  a later feature. The relay is an optional backend like the feedback endpoint; without it the
  share link button stays.

## Known gaps

- `404.html` sends people to the server root (`/`): an install under a sub-path behind a proxy
  keeps the 404 status but should point its own not-found page at the app.
- Enclosing step symbol (vertical inner lines) not verified against the IEC 60848 figure; adjust
  in `elements.tsx` and `svgExport.ts` if the standard differs.
- An initial step cannot be a macro-step or an enclosing step (data model limitation).
- The interface and help exist in English, French, German, Spanish, Danish and Swedish, kept in
  step by hand (the i18n test catches missing keys, placeholders and anchors, not stale wording).
  The examples, the help diagrams and generated PLC code stay English. The
  translations were made by a model; a native review of each language is still to do.
- The website guide exists in six languages kept in step by hand. Guide figures use the system monospace font (the app's JetBrains Mono
  is not loaded there).
- Generated code is not compiled by a real PLC toolchain in CI (no vendor tools available); the
  ST uses only standard IEC 61131-3 constructs and the XML follows TC6 2.01 by hand. Vendor
  profiles (TIA, CODESYS, TwinCAT, Rockwell) remain future adapters.
- SFC export: forcing orders, enclosure semantics and source/sink transitions are not
  representable and are reported; conditional continuous actions keep their value after the step.
- Live collaboration: tombstones and records of deleted grafcets are kept for the life of a room
  (no garbage collection); projects whose sealed state exceeds 1 MiB (about 5 MB of JSON) cannot
  be stored as a room snapshot (a warning says so; editing with those connected still works). The
  on-premise Docker files (`deploy/relay.Dockerfile`, `docker-compose.yml`) were not built here
  (no Docker on the build machine); the relay itself is covered by the e2e test. WebSockets rely on
  CSP `connect-src 'self'` matching `wss:` on the same host (CSP 3, current browsers).
- Abuse limits of the optional backends: the hosted relay and feedback endpoint have no per-IP
  rate limit in code (README recommends a Cloudflare rate-limiting rule on `/api/`; the Origin
  checks stop other web pages, not scripts). The Node relay has no cap on the number of rooms it
  keeps (in memory without `RELAY_DATA_DIR`, on disk with it) for their 30 days.
- `npm audit`: undici advisories in Wrangler's local dev server (miniflare pins undici 7.29.1, also
  in the latest Wrangler); development tooling only, nothing shipped to users.
