# GrafcetMaker — Build Spec

Browser GRAFCET (IEC 60848) editor + simulator for professional automation engineers. Priorities: correct semantics > UX speed > features. Production-ready, offline-capable, no backend in v1.

## Stack (fixed)
TypeScript strict · Vite · React 18 · Zustand + Immer (patches → undo/redo) · custom SVG renderer (no React Flow/JointJS) · Radix UI · Tailwind + CSS variables · Zod · Dexie (IndexedDB) · i18next (EN first) · svg2pdf.js + jsPDF · vite-plugin-pwa · Vitest + fast-check · Playwright + axe-core · ESLint + Prettier.

## Architecture
```
src/core/{model,expr,validation,simulation,layout,codegen,io}  # pure TS, no React/DOM
src/editor/{canvas,tools,commands}  src/panels  src/theme  src/i18n  src/workers  src/app
tests/{unit,fixtures,e2e}  docs/{user-guide,semantics,file-format}.md
```
- `core/` must run in Node and Web Workers. Simulation + validation run in workers.
- All mutations go through `execute(label, recipe)` using `produceWithPatches`; drags = one history entry.
- Expressions: hand-written Pratt parser → AST → interpreter. Never `eval`/`new Function` (strict CSP).

## Data model
Normalized maps by `nanoid` ID. File `.grafcet.json`, pretty-printed, `schemaVersion` + migration chain + Zod validation on load; reject newer versions with clear message.
```ts
Project { schemaVersion; id; name; meta{author,company,revision,createdAt,updatedAt}; variables: Record<Id,Variable>; grafcets: Record<Id,Grafcet>; grafcetOrder: Id[] }
Variable { id; name; type:'BOOL'|'INT'|'REAL'|'TIME'; direction:'input'|'output'|'internal'; initialValue?; address?; comment? }
Grafcet { id; name; kind:'partial'|'macroExpansion'|'enclosed'; steps; transitions; actions; comments }
Step { id; number /*unique per grafcet*/; kind:'normal'|'initial'|'macro'|'enclosing'; label?; position; refGrafcetId? }
Transition { id; number?; from: Id[] /*[]=source*/; to: Id[] /*[]=sink*/; receptivity: string; position; routing? }
Action { id; stepId; order; kind:'continuous'|'storedOnActivation'|'storedOnDeactivation'|'storedOnEvent'|'forcing'; text; condition? }
```
Divergence/convergence are derived, not stored: step→2+ transitions = OR div (single bar); 2+ transitions→step = OR conv; transition.to.length>1 = AND div (double bar); transition.from.length>1 = AND conv. Step↔step or transition↔transition links are unrepresentable.

## Semantics (IEC 60848) — implement exactly
1. Initial steps active at start.
2. Transition enabled ⇔ all `from` steps active; clearable ⇔ enabled ∧ receptivity true.
3. Clearing activates all `to`, deactivates all `from`.
4. All clearable transitions clear simultaneously.
5. Step both activated and deactivated stays active (timer not restarted).
- Search for stability: repeat 2–5 with same inputs until no transition clearable. Transient steps emit no continuous actions; stored actions do execute. Cap 1000 iterations → `TransientLoopError` shown in Problems, not a crash.
- Edges `↑a`/`↓a` true only in first iteration of the cycle in which input changed.
- Timers: `t1/c`, `t1/c/t2`; `Xn` = step active; step timers use activation time.
- Forcing `G2{8}`, `G2{*}` (freeze), `G2{}` (empty): applied after forcing grafcet is stable; forced grafcet does not evolve that cycle.
- Deterministic, virtual time (real-time / ×N / single-step); jump clock to next timer expiry in fast mode.
- Record every interpretation choice in `docs/semantics.md`.

## Expression grammar
```
or := and (('+'|'OR'|'||') and)*      and := unary (('·'|'*'|'AND'|'&&') unary)*
unary := ('¬'|'/'|'NOT'|'!') unary | ('↑'|'RE'|'↓'|'FE')? primary
primary := '(' or ')' | DURATION '/' primary ('/' DURATION)? | arith CMP arith | IDENT | 'X'INT | TRUE|FALSE|1|0
DURATION := INT('ms'|'s'|'min'|'h')   CMP := = <> < <= > >=
```
ASCII input, textbook display (overbar NOT, ↑↓) toggleable. Errors: caret position + fix hint; unknown identifier → "did you mean" + [Create variable]. Cache ASTs by source.

## Validation rules (pure fns, debounced 150 ms, issue = {ruleId,severity,message key,elementIds,quickFix?})
Errors: no initial step · duplicate step number · empty receptivity (use `1`) · parse error · unknown variable · action writes input · forcing targets missing grafcet/step.
Warnings: unreachable step · dead-end step · OR-div receptivities not provably exclusive · possible transient loop · output set by continuous actions in parallel branches · macro expansion missing E/S.
Info: unused variable.
UI: Problems panel grouped/sorted; click → pan/zoom/flash element; on-element badge with icon; quick fixes.

## Editor
- One `<svg>` with viewBox pan/zoom; separate static and overlay layers; `React.memo` per element; cull off-screen beyond ~1000 elements. 60 fps at 500 steps.
- Dimensions (grid 10): step 40×40, initial inner gap 4, transition bar 24×3, step↔transition spacing 40, action box height 40, double-bar gap 4. Orthogonal links; upward links get arrows.
- Link drag highlights only valid targets (step→transition, transition→step).
- Shortcuts: `Enter` append transition+step (auto-number, focus receptivity) · `A` action · `P` parallel branch · `O` alternative branch · `L`+click loop back · `F2` edit · `Del` delete and heal sequence · `Ctrl/Cmd+K` command palette · standard undo/redo/copy/paste (cross-project).
- Auto-layout on demand only: BFS ranks from initial steps ignoring back-edges, branch columns centered under divergence, back-edges routed at sides, optional selection-only.
- Features: multiple partial grafcets (tabs), macro-steps with expansion sheets, enclosing steps, comments, renumber, variable table with autocomplete + rename refactor.

## Simulation UI
Separate mode (locks editing, distinct top bar + badge). Token dot in active steps; enabled transitions marked; cleared flash (respect `prefers-reduced-motion`). Input panel: momentary + toggle + numeric. Live values inline. Timers on steps. Chronogram with scrub cursor. Transient log per cycle. Scenario record/replay saved in project.

## Layout
Top bar (File/Edit/View/Simulate/theme/help) · left tools · center canvas with grafcet tabs · right properties · bottom tabs: Variables, Problems, Simulation, Chronogram. Resizable/collapsible, sizes persisted. Start screen: new/open/recent/examples (traffic light, drilling station, tank filling, parallel conveyor). Skippable ≤5-step tour. Help panel with GRAFCET quick reference + glossary tooltips using standard terms (step, transition, receptivity, clear, enabled).

## Theme
- Modes: System (default, live `prefers-color-scheme` listener) / Light / Dark; segmented control in top bar + palette + settings; persisted in localStorage (try/catch).
- All colors as tokens on `:root` and `:root[data-theme="dark"]`, set `color-scheme`; no hard-coded colors. Diagram tokens: canvas, grid, ink, step-active, token, selection.
- Inline hashed `<head>` script sets `data-theme` before CSS (no flash).
- Contrast ≥4.5:1 text, ≥3:1 lines, both themes. Never color-only state (token dot, icons, handles).
- Exports default black-on-white; option "export in current theme".

## Persistence & export
Autosave to IndexedDB per command (debounce 500 ms), local snapshot history, crash-restore prompt. File System Access API with download/upload fallback. Exports: SVG (sanitized), PNG 1/2/4×, vector PDF A4/A3 with title block + tiling, variables CSV, Structured Text, PLCopen TC6 XML. Lazy-load PDF/codegen/chronogram.

## Codegen (vendor-neutral, header "generated – review before use")
ST pattern: compute all `Tn := Xpre AND cond` first, then `Xn := (Xn AND NOT Tout) OR Tin [OR init]`, then timers/edges (TON, R_TRIG), then outputs. Note: one clearing level per scan (no stability search) — document; optional loop variant.
SFC qualifiers: continuous→N, on activation→P1/S, on deactivation→P0, time-limited→L, delayed→D; forcing→generated ST; macro-steps inlined. Vendor profiles (TIA, CODESYS, TwinCAT, Rockwell) later as adapters.

## Non-functional
WCAG 2.2 AA; full keyboard; outline tree view as accessible canvas alternative. Latest 2 versions Chrome/Edge/Firefox/Safari. FMP <1.5 s; initial JS <300 kB gz; validation <50 ms. CSP without unsafe-eval; imported files untrusted (Zod, size caps, escape text). Error boundary with "download recovery file". Opt-in error reporting without diagram content. Static hosting + Docker/nginx on-prem build. SW update prompt, in-app changelog, semver + Keep a Changelog.

## Tests
- Unit (≥90% `core/`): parser per rule + precedence + error positions + print↔parse property test; each validation rule pass/fail fixture; codegen snapshots; all historical file versions migrate.
- Simulation golden suite (~30 hand-verified charts): fixture + input scenario → expected active steps/outputs per cycle; cover all 5 rules, transient evolution, edges, timers, forcing.
- Playwright (Chromium/Firefox/WebKit): keyboard-built sequence, undo/redo, copy/paste, link constraints; screenshots in light + dark; axe no critical violations.
- CI gates: tsc, lint, unit+coverage, e2e, bundle budget, Lighthouse perf ≥90 / a11y ≥95.

## Phases (each ends usable; v1.0 = 0–6)
0 scaffold, theme, CI, model+schema · 1 core editor, undo, shortcuts, save/open · 2 parser, variables, autocomplete · 3 OR/AND structures, loops, source/sink, auto-layout · 4 validation · 5 simulation · 6 exports · 7 hierarchy (partial, macro, enclosing, forcing) · 8 codegen · 9 onboarding, examples, i18n, a11y audit, PWA, perf.

## Definition of done
Keyboard + mouse · correct in light/dark/system · undoable · save→reload identical · unit + e2e test · actionable error messages · translatable strings with standard terminology · axe clean · user guide updated.
