# GrafcetMaker user guide

GrafcetMaker is a GRAFCET (IEC 60848) editor and simulator that runs in your browser. Nothing is
uploaded: projects live in your browser storage and in the files you save.

This guide is the complete reference. For a gentler introduction, open the in-app **Help center**
(`F1`): a getting-started tutorial, GRAFCET basics with diagrams, and task-oriented pages. Its
pages are the Markdown files in [`docs/help/`](help/index.md).

## Starting

When GrafcetMaker opens it shows the **start screen**: continue with the project you had open,
start a new one, open a file or a recent project, take the five-step **tour**, open the
**getting started** tutorial, or open an **example** (traffic light, drilling station, tank filling,
parallel conveyor). Untick "Show this screen when GrafcetMaker opens" to go straight to your
project; **Help › Start screen and examples** brings it back.

GrafcetMaker can be installed as an app (the install button of the browser's address bar) and works
offline: after the first visit everything it needs is stored in the browser. When a new version is
available, a card offers to reload; your work is kept. **Help › What's new** shows the changelog.

## Screen layout

- **Top bar**: File, Edit, View, Simulate and Help menus, the project name (a dot `●` means
  unsaved changes; double-click it to rename the project), the problem counters, the command
  palette button, the System / Light / Dark theme switch and **Settings** (gear, `Ctrl+,`).
- **Left rail**: tools (select, pan, place step, place transition, place comment), add action,
  undo and redo.
- **Center**: the diagram of the active partial grafcet, with one tab per grafcet above it.
- **Right panel**: two tabs. **Properties** of the selection (or of the grafcet and project when
  nothing is selected; the live inspector while simulating) and **Variables**, a searchable list
  of all variables. Drag its left edge to resize it (or focus the edge and use the arrow keys).
- **Outline** tab of the right panel: every grafcet, step, action and transition as a tree, an
  accessible alternative to the diagram. Arrow keys move and fold, `Enter` shows the element on the
  diagram, `F2` edits it there; active steps are marked while simulating.
- **Glossary**: the small `?` next to standard terms (step, transition, receptivity, stored action,
  macro-step…) in the properties panel explains them and links to the help.
- **Hint bar** (bottom left of the canvas): the keys and gestures available for the current
  selection, tool or drag, with a **Learn more** link to the help. Hide it with its `×`, and show
  it again from **View › Hints** or Settings.
- **Help center** (`F1`): docked on the right so you can read and draw at the same time; search,
  contents, previous / next. Links like `#help/expressions` open a page directly.
- **GRAFCET guide** (**Help › GRAFCET guide**, or the start screen): a web page that explains the
  language itself (elements, the five evolution rules, actions, branches, hierarchy, GRAFCET and
  SFC) in English, French, German and Spanish, with examples that open in the editor. It is part
  of the app, so it also works offline and on-premise (`en/`, `fr/`, `de/`, `es/` next to the app).

### Phones and tablets

On a phone (narrower than 640 px, or lower than 480 px in landscape) the diagram gets the whole
screen:

- **Top bar**: the menu ☰ (File, Edit, View, Simulate, Help and the theme, as a drawer), the
  project name, the problem counters and ▶ **Simulate**. While simulating, the simulation bar keeps
  reset, run / pause, next step, the clock and **Stop**; speed and recording are in its ⋯ menu.
- **Bottom toolbar**: select, place step, transition, comment and action, undo, redo, and the
  **panels** button.
- **Panels sheet**: Properties (Inspector while simulating), Variables, Problems, Simulation,
  Chronogram and Outline share one sheet over the lower part of the diagram. Drag its handle to
  resize it; it opens on Simulation when a simulation starts. Split view is not available.
- **Fit** (top right of the canvas) shows the whole grafcet; pinch to zoom.

Touch gestures, on phones and tablets alike: tap to select, drag to move or (on empty canvas) to
pan, pinch to zoom, double-tap to edit or add a step, hold then drag to select with a frame. A
**selection toolbar** at the bottom of the canvas offers what the keyboard shortcuts do: Step
(`Enter`), Action (`A`), Parallel (`P`), Choice (`O`), Loop (`L`), Edit (`F2`), Details and Delete.
Link handles sit just outside the selected element so it can still be dragged. Tablets keep the
desktop layout with these touch additions.

## Drawing a grafcet

A new project contains grafcet `G1` with initial step 0.

- **Continue a sequence**: select a step and press `Enter`. A transition and the next step are
  added and numbered automatically, and the receptivity editor opens: type the receptivity and
  press `Enter`. Press `Enter` again to continue. With nothing selected, `Enter` continues from
  the lowest step that has no successor.
- **Insert in the middle**: `Enter` on a step that already continues inserts the new transition
  and step; everything below moves down.
- **Add an action**: select a step and press `A`, type the output name, press `Enter`.
- **Edit text**: `F2` or double-click (step number, receptivity, action text, comment).
- **Place elements freely**: pick a tool (`S` step, `T` transition, `C` comment) and click; hold
  `Shift` to place several. Double-click empty space to add a step.
- **Link elements**: hover or select a step or transition and drag one of its round handles. Only
  valid targets (step → transition, transition → step) are highlighted. Drop on empty space to
  create the missing element at that spot.
- **Delete**: `Del`. Deleting a step heals the sequence: the transition after it goes too and the
  step before is reconnected; the gap closes when the rest of the diagram is a straight sequence.
  `Shift+Del` deletes without healing. Click a link to select it, then `Del` removes just that
  link.
- **Move**: drag (snaps to the 10-unit grid) or use the arrow keys (`Shift` moves 5× further).
- **Select several**: drag a rectangle on empty space, `Shift`/`Ctrl`-click, or `Ctrl+A`.
- **Copy / paste**: `Ctrl+C`, `Ctrl+X`, `Ctrl+V` — between grafcets, projects and browser tabs.
  Pasted steps are renumbered when their numbers are already taken.
- **Undo / redo**: `Ctrl+Z`, `Ctrl+Shift+Z` (or `Ctrl+Y`). A whole drag is one undo step. The Edit
  menu names the change that will be undone.

Upward links (loops) are routed along the left side and drawn with an arrow, as IEC 60848
requires. Drag a loop link sideways to move its lane.

### Divergences, convergences and loops

Divergences and convergences are never drawn by hand: they follow from the links.

- **Alternative branch (OR)** — `O`. On a step: adds another outgoing transition with its own
  step (single-line OR divergence). On a transition: adds an alternative transition between the
  same steps (OR divergence and convergence, e.g. a bypass).
- **Parallel branch (AND)** — `P`. On a step: adds a step in parallel with it, started by the
  same transition and joined by the next one (double-line AND divergence and convergence). On a
  transition: adds one more step it activates.
- **Loop** — `L`, then click the step to go back to. From a step, a new transition is added next
  to the existing ones; from a transition that leads nowhere yet, it is linked to the step.
  `Esc` cancels.
- **Source / sink transitions** (Edit menu): a transition without upstream step (above a step) or
  without downstream step (below a step).
- Linking by hand also creates structures: linking a second step into a transition makes an AND
  convergence, a second transition into a step an OR convergence.

### Arrange

- **Edit › Auto-layout grafcet** places steps in rows (a convergence always comes after all its
  branches), centers branches under their divergence, puts merges back in line and routes loops
  on the left. **Auto-layout selection** does the same for the selected elements only. Layout is
  never applied automatically and is one undo step.
- **Edit › Renumber steps** numbers the steps of the active grafcet consecutively along the flow,
  starting from its lowest number, and updates every `Xn` reference and forcing order that points
  to them — in all grafcets. If that would change the meaning of a reference in another grafcet,
  nothing is renumbered and the conflicting numbers are listed.

### Actions

Select a step and press `A` to add an action to it. With nothing selected, `A` (or the **Action**
tool of the left rail, `Shift+A`) lets you click a step to add an action to it, or click empty
canvas to place an **action without a step**, drawn without a link. It is **always active**: a
continuous action sets its output whenever its assignment condition is true (always, without
one), a stored action runs on its event (on activation: once at start), a forcing order is always
in force. Drag it onto a step to attach it (the step is highlighted), or choose its **Step** in the
properties panel; choosing **No step (always active)** there detaches an action again.

Choose the kind of each action with the **Kind** buttons of the properties panel; each shows the
symbol the diagram uses. A conditional action and an action on event get their condition (or
event) input right under the buttons:

- **Continuous action**: the output is true while the step is active. Text: the output name,
  e.g. `M1`.
- **Conditional action**: a continuous action that is also subject to a condition, drawn on a line
  above the box: the output is true while the step is active and the condition is true.
- **Stored action on activation / on deactivation**: an assignment executed once when the step
  becomes active / inactive, e.g. `C := C + 1`; a BOOL variable alone (`M1`) means `M1 := 1`. Drawn with an arrow ↑ above the box (activation)
  or ↓ below it (deactivation). A condition already present in a file is written next to the arrow
  and can be changed or cleared as **Only if**.
- **Stored action on event**: executed when the event (e.g. `↑b`) occurs while the step is active.
  Drawn with a flag at the top right of the box, the event written to its left. An action on event
  without an event is reported as a warning.
- **Forcing order**: forces another partial grafcet into a situation, e.g. `G2{8}`. Drawn with a
  double frame.

### Receptivities and expressions

Type receptivities in plain ASCII: `*` for AND, `+` for OR, `/` for NOT, e.g. `start * /stop`.
Also available: edges `↑a` / `RE a`, `↓a` / `FE a`, step activity `X3`, timers `3s/X2`
(true 3 s after step 2 became active) and `2s/a/5s`, comparisons `C >= 10`, and constants `1`
(always true) and `0`. By default the diagram shows the **textbook notation** (`·`, `+`, NOT as
an overbar); turn it off in **View › Textbook notation** to see exactly what you typed.

To enter an edge, type `^` before a name (`^start` becomes `↑start`), or put the cursor on a name
and press `Alt+↑` (rising) or `Alt+↓` (falling); pressing it again removes or swaps the edge.
While a receptivity or condition is edited, a symbol bar above it offers ↑ ↓ NOT AND OR,
parentheses (wrapping the selection), a timer template and a link to the expression help.

While you type, the editor:

- suggests variables (and `Xn` step references) — use the arrow keys and `Enter` or `Tab`;
- explains any problem right under the input, marks where it is, and offers fixes:
  **Use “Start”** for a misspelt name, **Create BOOL input “Start”** for a new one.

You can always commit an expression with a problem; it is shown with a dashed red underline. See
`docs/semantics.md` for the exact grammar.

### Variables

Variables have a name, a type (BOOL, INT, REAL, TIME), a direction (input, output, internal), an
initial value, a PLC address and a comment. There are two views:

- **Variables tab of the right panel**: a compact list for long lists. Search by name, address or
  comment; filter with the **Inputs / Outputs / Internal** chips (with counts); fold the direction
  groups. Click a variable (or `Enter`; `↑` `↓` move, `Esc` closes) to edit all its fields and
  see **where it is used**: every receptivity and action, with read or write; click one to jump to
  it on the diagram.
- **Variables tab of the bottom panel**: a table with every field. Edit any cell in place (`Enter`
  or leaving the cell commits, `Escape` reverts), sort by any column header, filter by text,
  direction and type. Click the **Uses** count to open the variable in the side panel. Long
  tables render only the visible rows, so thousands of variables stay fast.

Both have a `⋯` menu to import and export the table (Excel or CSV).
Renaming a variable updates every receptivity, action and condition that uses it, in one undo
step. Names are not case-sensitive. Copying elements to another project brings the variables they
use along.

### Macro-steps and enclosing steps

Select a step and choose its **Kind** in the properties panel (or **Edit › Make macro-step** /
**Make enclosing step**):

- **Macro-step**: a new tab holds its **expansion**, created with an entry step E and an exit step S
  linked by a transition. Draw the detailed sequence between them. The macro-step stands for the
  whole expansion: it is active while any of its steps is.
- **Enclosing step**: a new tab holds the **enclosed grafcet**. Steps marked `*` there start when
  the enclosing step becomes active; everything in it stops when the enclosing step is left.

Double-click a macro-step or enclosing step (or press `Alt+↓`) to open its sub-grafcet;
`Alt+↑` (or **Go to … step** in the properties panel) goes back to the parent step. Tabs of
expansions and enclosed grafcets carry an **M** or **E** badge. Validation checks that every
macro-step and enclosing step has exactly one sub-grafcet of the right kind and that
expansions have one entry and one exit step.

### Forcing

A **forcing order** action (`G2{8}`, `G2{8, 9}`, `G2{*}` to freeze, `G2{}` to deactivate all,
`G2{INIT}` for the initial situation) imposes a situation on another partial grafcet while its
step is active; the forced grafcet does not evolve meanwhile. Validation reports forcing orders
that point to missing grafcets or steps and grafcets that force each other.

### Partial grafcets

Use the `+` next to the tabs to add a partial grafcet; its first step number continues after the
numbers already used, in tens. Double-click a tab (or press `F2` on it) to rename it; drag it
sideways to reorder (or `Ctrl+Shift+←` / `→` on a focused tab); press `Del` on a tab to delete its
grafcet. `Ctrl`/`Cmd`+click or `Shift`+click picks several tabs (the open one included) to delete
them together, in one undo step; a project always keeps at least one grafcet. Right-click for
more.
When the tabs do not fit, scroll them with the mouse wheel or the ‹ › buttons.

## Problems

GrafcetMaker checks the project continuously. The counters in the top bar show errors and
warnings; click them (or the **Problems** tab) to see the list, grouped by grafcet. Each problem
says what is wrong and where; click it to jump to the element (the view pans and zooms to it and
it flashes). Many problems have a one-click fix: use `1` for an empty receptivity, create a
missing variable, make a step initial, give one alternative branch priority over another,
renumber duplicate steps, delete an unused variable.

Elements with problems carry a badge on the diagram: a circle with `!` for errors, a triangle
for warnings, a circle with `i` for information. Hover it for the details. The properties panel
also lists the problems of the selected element.

Checked: missing initial step, duplicate step numbers, empty or invalid receptivities and
actions, stored actions on events without an event, unknown variables, type errors, actions that assign inputs, forcing orders that target
nothing, unreachable steps, dead-end steps, alternative branches whose receptivities are not
exclusive, loops that could be crossed endlessly in one evolution, outputs driven from parallel
branches, macro-step expansions without one entry and one exit step, and unused variables. The
exact definitions are in `docs/semantics.md`.

## Simulation

Press `F5`, the **Simulate** button of the top bar, or **Simulate › Start simulation**. The diagram is locked for editing, the top bar
turns into the simulation bar and the **Simulation** tab opens.

- **Inputs**: switch a BOOL input on/off, or hold its **Hold** button for a momentary press
  (keyboard: hold `Space` on the button). Type values for INT, REAL and TIME inputs.
- **Clock**: `F5` runs and pauses; speed ×0.25 to ×10 or **Fast**, which jumps from one timer
  expiry to the next. `F10` (Step) jumps to the next timer expiry. ⟲ restarts from the initial
  situation. The bar shows the virtual time, the cycle number and the next timer.
- **On the diagram**: active steps are filled and carry a token dot, with the time they have been
  active; enabled transitions have a ▶ marker; transitions that just cleared flash; continuous
  actions being executed show a ✓ and stored actions show the current value of their variable.
- **Evolution log**: every cycle with its trigger and each iteration (transitions cleared, steps
  activated / deactivated), so transient evolutions are visible. Click a cycle to see the diagram
  as it was then.
- **Chronogram** tab: waveforms of all variables and of the steps of the open grafcet. Click or drag
  in it to move the cursor back in time (the diagram follows); **Back to live** returns.
- **Scenarios**: **Record** restarts the simulation and records your input changes with their
  times; stop to save the scenario in the project. **Replay** restarts and plays it back exactly.
- Select a step or transition to see its live state in the right panel.
- `Shift+F5` stops the simulation.

If the evolution never becomes stable (e.g. a loop of transitions that are all true), the
simulator stops after 1000 iterations and reports a transient loop. The exact rules are in
`docs/semantics.md`.

## Exporting and sharing

**File › Export…** (`Ctrl+E`) opens one dialog for every format, with a live preview. Settings are
remembered per project on this device.

- **PDF document**: vector, A4 or A3, portrait or landscape, fitted to the page or printed at a
  fixed scale and tiled over several sheets, with a title block (project, grafcet, author,
  company, revision, date, sheet number). Export the current grafcet, the selection, or all
  grafcets one after another.
- **SVG image**: vector, ideal for documents and the web; optionally embeds the diagram font so it
  looks the same everywhere.
- **PNG image**: 1×, 2× or 4× resolution, optionally with a transparent background.
- **WebP image**: like PNG with smaller files, with a quality setting.
- **Variables (Excel)**: an `.xlsx` workbook with a frozen, filterable header and drop-down lists
  for type and direction.
- **Variables (CSV)**: the variable table for spreadsheets and PLC tools.
- **Structured Text**: an IEC 61131-3 function block implementing every grafcet (transitions,
  steps, timers and edges, then actions, once per PLC scan; optionally with a search for stability
  in each scan).
- **PLCopen XML**: PLCopen TC6 XML for import into PLC engineering tools, with one SFC program per
  partial grafcet (N, P1, P0, S, R, D, L qualifiers) and a program computing edges and timers.

Generated code starts with "generated – review before use". The dialog lists what the target
cannot express (for example forcing orders in SFC). The exact mapping is in `docs/semantics.md`.

**File › Export as** opens the dialog on a given format directly.

Exports are black on white by default; choose **Current theme** to keep the screen colors, and
untick **Textbook notation** to print expressions as typed. **Copy** puts an SVG or PNG on the
clipboard; **File › Copy diagram as PNG / SVG** does it in one step for the selection (or the
whole grafcet), ready to paste into a report.

**File › Variables › Import variables (CSV or Excel)…**, or dropping a `.csv` or `.xlsx` file on
the window, adds and updates
variables by name (columns `name`, `type`, `direction`, `initial`, `address`, `comment`; comma,
semicolon or tab separated). You see what will be added, updated or rejected (with the reason
for each row) before anything changes, and the import is one undo step.

## Navigating

- **Split view** (`Ctrl+\`, **View › Split view**, or right-click a tab › **Open to the side** /
  **Open below**) shows two grafcets at once, side by side or one above the other. Each pane has a
  header to choose its grafcet; the pane you click becomes the active one (highlighted header):
  the tabs, the selection, the keyboard and the properties panel act on it. The other pane still
  pans, zooms and shows the simulation live, so you can watch two grafcets interact. `Ctrl+Alt+\`
  focuses the other pane; ⇄ swaps them; × closes one. Drag the bar between them to resize.
- Scroll to pan, `Ctrl`+scroll (or pinch) to zoom around the pointer, `Space`+drag or the middle
  mouse button to pan, or use the pan tool (`H`).
- `+` / `-` zoom, `Shift+1` fits everything, `Shift+2` fits the selection, `Shift+0` is 100 %.
- `Ctrl+K` opens the command palette: type any command or grafcet name.
- `?` lists all keyboard shortcuts; `F1` opens the help center.

## Saving and opening

- **Autosave**: every change is kept in your browser within half a second (and at once when the
  tab is hidden or closed). Reloading, closing the tab or a crash never loses work and never asks:
  the next visit reopens the project as you left it, unsaved changes included.
- **Save** (`Ctrl+S`) writes back to the file you opened, in Chrome and Edge. In other browsers
  (and the first time) it downloads `<project name>.grafcet.json`. **Save as** (`Ctrl+Shift+S`)
  picks a new file.
- **Open** (`Ctrl+O`), **File › Open recent**, or drag a `.grafcet.json` file onto the window. An
  invalid file, or one saved by a newer version, is rejected with an explanation; the open project
  is never lost. If it has unsaved changes you are asked first.
- **File › Local history** lists snapshots kept in the browser (taken on save, every few minutes of
  editing and before a project is closed). Restoring one opens it as unsaved changes.
- **File › Download a copy** downloads the project without changing which file Save writes to.
- **File › Copy share link** copies a URL that holds the whole project (compressed, after the
  `#`, so it never reaches the server). Opening it gives the recipient their own copy; the link is
  then removed from the address bar, so a reload keeps their edits. A damaged or cut-off link is
  rejected with an explanation. Links over 8000 characters trigger a warning, since some apps cut
  long links.

## Feedback

**Help › Send feedback…** (or the speech-bubble button at the bottom left) composes a message —
idea, problem, question or praise. On the public site **Send** delivers it anonymously to the
developers: no account is needed, and you can leave an email address if you would like a reply.
Optionally it adds the app version and browser details; it never includes project data.

Installations without the feedback service open the message in your email app instead (when an
address was set with `VITE_FEEDBACK_EMAIL` at build time), or offer **Copy** so you can pass it on
yourself.

## Settings

**Settings** (`Ctrl+,`, the gear in the top bar, or **File › Settings…**) are applied at once and
remembered on this device:

- **Appearance**: theme, textbook notation, welcome screen at startup.
- **Editor**: grid, snap to grid, hints. Autosave is always on.
- **Simulation**: the speed a simulation starts with (changing the speed in the simulation bar
  updates it), highlighting of cleared transitions, step timers.
- **Data and storage**: browser storage used, download a backup of the open project, clear the
  local history or the recent files list, reset preferences.
- **About**: version, keyboard shortcuts, privacy.

## Theme

Use the System / Light / Dark switch at the right of the top bar. _System_ follows your operating
system setting and updates live when it changes. The choice is remembered on this device.
