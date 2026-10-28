# GrafcetMaker user guide

GrafcetMaker is a GRAFCET (IEC 60848) editor and simulator that runs in your browser. Nothing is
uploaded: projects live in your browser storage and in the files you save.

This guide is the complete reference. For a gentler introduction, open the in-app **Help center**
(`F1`): a getting-started tutorial, GRAFCET basics with diagrams, and task-oriented pages. Its
pages are the Markdown files in [`docs/help/`](help/index.md).

## Starting

When GrafcetMaker opens it shows the **start screen**: continue with the project you had open,
start a new one, open a file or a recent project, take the five-step **tour** (draw a first sequence, give it an action and simulate it, with the
tour moving on as you do each step), open the
**getting started** tutorial, or open an **example** (traffic light, drilling station, tank filling,
parallel conveyor, and two larger ones: a **bottling line** with a macro-step, three parallel
stations and an inspection, and **operating modes** with an enclosing step, a pause that freezes
the cycle and an emergency stop that forces the modes). Untick "Show this screen when GrafcetMaker opens" to go straight to your
project; **Start screen and examples** in the main menu ☰ brings it back.

GrafcetMaker can be installed as an app (the install button of the browser's address bar) and works
offline: after the first visit everything it needs is stored in the browser. When a new version is
available, a card offers to reload; your work is kept. **Help › What's new** shows the changelog.

## Screen layout

The diagram fills the window. Everything else floats over it in small "islands" and shows only
when it is needed. The toolbars rest slightly faded so the diagram stays in front; they come back
fully when you point at them or reach them with the keyboard:

- **Top left**: the main menu ☰ (File, Edit, View, Simulate and Help as submenus, **Start screen
  and examples** just before Help, the System / Light / Dark theme and the language), the project
  name (a dot `●` means unsaved changes; double-click it to rename the project) and the
  **properties** button.
- **Top centre**: the tools: select (`V`), pan (`H`), step (`S`), transition (`T`), comment (`C`)
  and action (`Shift+A`); the letter in each button is its key. ▶ **Simulate** (`F5`) ends the
  bar. While simulating, the simulation controls take its place. Under them, the **hints** list the keys and gestures available for
  the current selection, tool or drag, with a **Learn more** link; hide them with their `×` and
  show them again from **View › Hints** or Settings.
- **Top right**: the problem counters, **Export** (`Ctrl+E`) and **Live collaboration** (in a
  session: the others' avatars). Where the site offers no live collaboration, the share link
  button takes its place; **File › Copy share link** is always there.
- **Properties card** (left): appears while something is selected, with its number, label, kind
  (picture buttons), receptivity and actions. Its `×` hides it for this selection. With nothing
  selected, the properties button (or **View › Properties panel**) shows the grafcet and the
  project.
  With several elements selected it shows an overview: how many of each kind (click one to keep
  only those) and the selection as a tree in reading order, each step with its selected actions
  and transitions under it; a step shown only for them is in italics. Click a line to select only
  that element, `Ctrl+click` takes it out of the selection.
- **Simulation card** (left, only while simulating): the inputs to drive, outputs and internal
  values, the evolution log and the scenarios. Its chevron folds it to its title.
- **Bottom left**: zoom out, the zoom (click it for 100 %), zoom in and fit; undo and redo.
- **Bottom centre**: one tab per partial grafcet, and `+` to add one.
- **Bottom right**: the panels **Variables**, **Problems**, **Chronogram** and **Outline**. Each
  opens in a card on the right of the window; click its button again or `×` to close it, drag
  its left edge to make it wider or narrower (the width is remembered). Then **Help** (`F1`),
  **Send feedback** and the **language** button (the flag of the current language).
- **Outline** panel: every grafcet, step, action and transition as a tree, an accessible
  alternative to the diagram. Arrow keys move and fold, `Enter` shows the element on the diagram,
  `F2` edits it there; active steps are marked while simulating.
- **Glossary**: the small `?` next to standard terms (step, transition, receptivity, stored action,
  macro-step…) in the properties card explains them and links to the help.
- **Help center** (`F1`): a card on the right, so you can read and draw at the same time; search,
  contents, previous / next. Links like `#help/expressions` open a page directly. With something
  selected, `F1` opens the section about it: a step, transition, branch, action, comment or link,
  a multiple selection, the variable shown, the simulation, or the receptivity or assignment
  being typed. `F1` again closes it.
- **Command palette** (`Ctrl+K`) runs any command by name; **Settings** is `Ctrl+,`.
- **GRAFCET guide** (**Help › GRAFCET guide**, or the start screen): a web page that explains the
  language itself (elements, the five evolution rules, actions, branches, hierarchy, GRAFCET and
  SFC) in English, French, German, Spanish, Danish and Swedish, with examples that open in the editor. It is part
  of the app, so it also works offline and on-premise (`en/guide/`, `fr/guide/`, `de/guide/`,
  `es/guide/`, `da/guide/`, `sv/guide/` next to the app).

### Phones and tablets

On a phone (narrower than 640 px, or lower than 480 px in landscape) the diagram gets the whole
screen:

- **Top bar**: the menu ☰ (File, Edit, View, Simulate, Start screen and examples, Help and the
  theme, as a drawer), the project name, the problem counters and ▶ **Simulate**. While
  simulating, the simulation bar keeps reset, run / pause, next step, the clock and **Stop**; speed
  and recording are in its ⋯ menu.
- **Bottom toolbar**: select, place step, transition, comment and action, undo, redo, and the
  **panels** button.
- **Panels sheet**: Properties (not while simulating), Variables, Problems, Simulation,
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
  added and numbered automatically, and you type the receptivity right where it is drawn: only
  the caret shows, in the diagram's font, and the box around the text grows as you type. Press
  `Enter` to apply it (`Esc` cancels), and `Enter` again to continue. With nothing selected, `Enter` continues from
  the lowest step that has no successor.
- **Insert in the middle**: `Enter` on a step that already continues inserts the new transition
  and step; everything below moves down.
- **Add an action**: select a step and press `A`, type the output name, press `Enter`.
- **Keep going with `Shift+Enter`**: in the editor of an action, `Shift+Enter` applies it and opens
  the next action of the step (a new one of the same kind after the last); in a receptivity, it
  applies it and opens the next receptivity down the sequence (a new transition and step at its
  end). Type a whole sequence or a row of actions without touching the mouse.
- **Ghosts**: a selected step shows a dashed **ghost** action after its last action and, at the
  end of a sequence, a ghost transition and step with the number the step will get; a transition
  leading nowhere shows a ghost step. Click a ghost to add what it shows: a ghost action opens
  its text, the bar of a ghost transition adds the transition alone and selects it, a ghost step
  below it adds both and selects the new step (as if you had clicked it), so
  clicking its ghost again keeps the sequence growing; type the receptivities later (`F2` or
  double-click). `Enter` adds the same and types the receptivity at once. With a placing tool, a
  ghost under the pointer shows what a click will place (and, with the Action tool over a step,
  where the action will go).
- **Edit text**: `F2` or double-click (step number, receptivity, action text, comment). A
  receptivity not written yet shows a grey **?**; the Problems list counts it until it is typed.
- **Right-click menu** (desktops): the commands for the element under the pointer (selected
  first), for the selection, or for empty canvas (**Add step here**, paste, auto-layout,
  renumber, fit); the menu key opens it for the selection.
- **Place elements freely**: pick a tool (`S` step, `T` transition, `C` comment) and click; hold
  `Shift` to place several. Double-click empty space to add a step.
- **Link elements**: hover or select a step or transition and drag one of its round handles. Only
  valid targets (step → transition, transition → step) are highlighted. Drop on empty space to
  create the missing element at that spot.
- **Delete**: `Del`. Deleting a step heals the sequence: the transition after it goes too and the
  transition before it is reconnected to the next step; the gap closes when the rest of the
  diagram is a straight sequence. The transition leading to a step is never deleted with it: after
  the last step it stays as a sink transition (press `Enter` on it to add a new step).
  `Shift+Del` deletes without healing. Click a link to select it, then `Del` removes just that
  link. Click a double line (AND divergence or convergence) to select it with the links it joins:
  `Del` removes those links and keeps the steps and the transition, which becomes a sink or a
  source transition.
- **Move**: drag (snaps to the 10-unit grid) or use the arrow keys (`Shift` moves 5× further). A
  double line moves with its transition: drag it or use the arrow keys.
- **Select several**: drag a rectangle on empty space (a step brings all its actions),
  `Shift`/`Ctrl`-click, or `Ctrl+A`. The links between selected elements are highlighted, and
  dragging any selected element moves the whole selection.
- **Copy / paste**: `Ctrl+C`, `Ctrl+X`, `Ctrl+V` — between grafcets, projects and browser tabs.
  Pasted steps are renumbered when their numbers are already taken.
- **Undo / redo**: `Ctrl+Z`, `Ctrl+Shift+Z` (or `Ctrl+Y`). A whole drag is one undo step. The Edit
  menu names the change that will be undone.

**Rotate a transition** with `R` (or **Direction** in its properties, or the right-click menu):
it then flows **right to left**. The bar stands vertical, the link from the step before it
enters on the right and the link to the next step leaves on the left, both with an arrow, and the
receptivity is written above. Use it for return paths and side branches drawn sideways. A
transition with parallel (AND) links is always drawn top to bottom. Click a transition anywhere on
its bar, number or receptivity to select it.

Upward links (loops) are routed along the left side and drawn with an arrow, as IEC 60848
requires. A loop's lane runs just left of the steps it loops over, so a loop inside a parallel or
alternative branch stays beside that branch; it moves further left only where an element, a wire
or another loop is in the way, and **Auto-layout** leaves room for it. A loop drops below its
source far enough not to cross its own sequence: a loop from a
branch on the right passes below the steps and wires to its left instead of through them. Only
the loop's own sequence is avoided, so a separate sequence drawn beside it does not push it
aside. Loops returning to the same step share their lane (one arrow). Drag a loop link sideways
to move its lane, or drag its bottom line up or down; double-click it to return to the automatic
route.

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
tool of the toolbar, `Shift+A`) lets you click a step to add an action to it, or click empty
canvas to place an **action without a step**, drawn without a link. It is **always active**: a
continuous action sets its output whenever its assignment condition is true (always, without
one), a stored action runs on its event (on activation: once at start), a forcing order is always
in force.

Drag any action to move it: onto a step to attach it there (the step is highlighted and a mark
shows its place among the step's actions, so dragging along the row reorders them), or onto empty
canvas to leave it without a step. `Esc` cancels the drag.

A selected step lists its actions in the properties panel as compact rows (symbol, text,
condition); click a row to unfold its fields. **Add** puts a new action at the end, already
unfolded, while the step stays selected. At the bottom of an unfolded row, the arrows move the
action left or right and the bin deletes it. A row's fields: the output (or assignment, forcing
order) first, then the **Kind** as one row of the symbols the diagram uses (point at one for its
name and meaning; the chosen kind is named next to the label). A conditional action and an action
on event get their condition (or event) input right under the symbols:

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

- suggests variables (and `Xn` step references) — use the arrow keys and `Enter` or `Tab`. The
  rest of the highlighted name is also shown in grey after the cursor: `Tab` or `→` accepts it;
- in an empty field, shows in grey the first variable of the table that nothing uses yet (an
  input for a receptivity, a BOOL output or internal variable for an action): `Tab` accepts it;
- explains any problem right under the input, marks where it is, and offers fixes:
  **Use “Start”** for a misspelt name, **Create BOOL input “Start”** for a new one.

You can always commit an expression with a problem; it is shown with a dashed red underline. See
`docs/semantics.md` for the exact grammar.

### Variables

Variables have a name, a type (BOOL, INT, REAL, TIME), a direction (input, output, internal), an
initial value, a PLC address and a comment. The **Variables** panel (bottom right) shows them as a
compact list (search, filter chips, groups by direction; click a variable to edit it) and, once you
widen the panel by its left edge, as a table: edit any cell in place (`Enter` or leaving the cell commits, `Escape` reverts), sort by any
column header, filter by text, direction and type. Click the **Uses** count to open the variable
in the properties card: all its fields and **where it is used** (every receptivity and action,
with read or write; click one to jump to it on the diagram). Long tables render only the visible
rows, so thousands of variables stay fast. On a phone the panel is a compact list instead: search,
filter chips, direction groups, and a tap opens a variable.

Names you type in a receptivity, an action or a condition that are not variables yet are created
when you apply the text, in the same undo step, and a message lists them. Their type and direction
come from their use: read in a condition → input (BOOL, or INT when compared), set by a continuous
action → BOOL output, assigned by a stored action → internal (INT when computed with a number, BOOL
otherwise). While you type, a note under the field shows what will be created, with **Use …** when
the name is close to an existing one (a likely typo). Change the type or direction in the
Variables panel when the guess is wrong.

The broom button next to `⋯` removes every unused variable (no expression uses it and no scenario
drives it) in one undo step; its badge counts them. The `⋯` menu imports and exports the table
(Excel or CSV).
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

GrafcetMaker checks the project continuously. The counters at the top right show errors and
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

Press `F5`, the **Simulate** button at the end of the tool bar, or **Simulate › Start simulation**. The
diagram is locked for editing, the simulation controls replace the tools, the **Simulation**
panel opens and the clock starts running.

- **Inputs**: switch a BOOL input on/off, or hold its **Hold** button for a momentary press
  (keyboard: hold `Space` on the button). Type values for INT, REAL and TIME inputs. On the
  diagram, click a BOOL input where it is written in a receptivity or condition to switch it.
- **Numbers on the diagram**: every INT, REAL or TIME variable in a receptivity or condition shows
  its value in a small box above its name, and stored actions show the value they write below their
  box. Click a value to type a new one (`Enter` applies, `Escape` cancels), also for internal
  variables and outputs.
- **What a transition waits for**: point at it (or tap it) for the steps that must be active
  first, or the terms of its receptivity still false, with the time left on step timers.
- **Clock**: `F5` pauses and runs again; speed ×0.25 to ×10 or **Fast**, which jumps from one timer
  expiry to the next. `F10` (Step) jumps to the next timer expiry. ⟲ restarts from the initial
  situation. The bar shows the virtual time, the cycle number and the next timer.
- **On the diagram**: active steps are filled and carry a token dot, with the time they have been
  active; enabled transitions have a ▶ marker; transitions that just cleared flash; continuous
  actions being executed show a ✓ and stored actions show the current value of their variable.
  In receptivities and action conditions, every signal that is true (a variable on, a step `Xn`
  active, a comparison that holds) is green, bold and underlined, so you see at a glance what is
  still missing. A NOT bar does not change it: under `/a`, `a` is green when `a` is on.
- **Evolution log** (folded: click its title to open it): every cycle with its trigger and each
  iteration (transitions cleared, steps activated / deactivated), so transient evolutions are
  visible. Click a cycle to see the diagram as it was then.
- **Chronogram** tab: waveforms of all variables and of the steps of the open grafcet. Click or drag
  in it to move the cursor back in time (the diagram follows); **Back to live** returns.
- **Scenarios**: **Record** restarts the simulation and records your input changes with their
  times; stop to save the scenario in the project. **Replay** restarts and plays it back exactly.
- `Shift+F5` stops the simulation.

If the evolution never becomes stable (e.g. a loop of transitions that are all true), the
simulator stops after 1000 iterations and reports a transient loop. The exact rules are in
`docs/semantics.md`.

## Exporting and sharing

**File › Export…** (`Ctrl+E`, or the **Export** button at the top right) opens one dialog for every format, with a live preview. Settings are
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
- **Structured Text**: a function block implementing every grafcet, for the PLC you pick:
  **IEC 61131-3** (`.st`, CODESYS and most tools), **Siemens TIA Portal** (an SCL source `.scl`
  for S7-1200/1500: External source files › Add new external file, then Generate blocks from
  source), **Beckhoff TwinCAT 3** (a `.TcPOU` file: Add › Existing Item) or **Allen-Bradley Studio
  5000** (a Structured Text routine: create the tags listed in its header, then paste it into an ST
  routine). Two code styles: **CASE per sequence** (default): one INT step variable per sequence
  and a `CASE` with the transitions of each step, stored actions inside the transitions, then each
  output as one expression of the steps (`M := step_G1 = 3 OR step_G1 = 4;`); sequences with
  parallel branches keep one BOOL per step. **One BOOL per step**: transitions, steps, timers and
  edges, then actions, once per PLC scan, optionally with a search for stability in each scan.
  A stored action such as `Q1 := 1` on activation runs once and Q1 keeps its value; tick **Hold
  stored actions with a constant value** to assign it in every scan while its step is active
  instead (`docs/semantics.md` has the details).
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
- Scroll to pan, `Ctrl`+scroll (or pinch) to zoom around the pointer, `Space`+drag, the middle
  mouse button or the right mouse button held down to pan (a right-click without moving opens the
  menu), or use the pan tool (`H`).
- `+` / `-` zoom, `Shift+1` fits everything, `Shift+2` fits the selection, `Shift+0` is 100 %.
- `Ctrl+K` opens the command palette: type any command or grafcet name.
- `?` lists all keyboard shortcuts; `F1` opens the help on the selection (or the help center).

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
- **grafcet.io files** (`.grafcetio`) open the same way and are converted into a new, unsaved
  project: one partial grafcet per frame or separate chart (named after the frame or the heading
  above the chart), variables created from what the expressions use, and an automatic layout. A
  dialog lists what the conversion changed (for example a transition drawn under two alternative
  steps, which becomes one transition per step). The details are in `docs/file-format.md`.
- **File › Local history** lists snapshots kept in the browser (taken on save, every few minutes of
  editing and before a project is closed). Restoring one opens it as unsaved changes.
- **File › Download a copy** downloads the project without changing which file Save writes to.
- **File › Copy share link** copies a URL that holds the whole project (compressed, after the
  `#`, so it never reaches the server). Opening it gives the recipient their own copy; the link is
  then removed from the address bar, so a reload keeps their edits. A damaged or cut-off link is
  rejected with an explanation. Links over 8000 characters trigger a warning, since some apps cut
  long links.
- **AI assistants** (ChatGPT, Claude…) can make charts: ask the assistant to read
  `grafcet.org/ai.txt`, which explains **GRAFCET text** (a chart as plain lines such as
  `step 1 Filling`, `do Valve`, `0 -> 1: start`) and how to make a `#text=` link that opens the
  chart here, laid out automatically. **File › Open from text…** opens a chart pasted as text (a
  line that cannot be read is named with what is wrong), and **File › Copy as text (for AI
  assistants)** copies the open project as GRAFCET text to paste back into the chat.

## Live collaboration

Edit one project together in real time, each on their own computer (**File › Live
collaboration…**, or the people button at the top right).

- **Start**: enter the name the others will see and choose **Start live session**. The link to send
  appears (and is copied); the address bar holds it too.
- **Join**: open the link. You are asked first, since joining replaces the open project (unsaved
  changes are offered for saving, as when opening a file). The project opens and stays on your
  device when you leave.
- **Seeing each other**: everyone's pointer with their name, what they selected (in their color)
  and the element they are editing (dashed, ✎). Their avatars are at the top right: point at one to
  see their grafcet and whether they simulate, click it to go where they are.
- **Changes merge field by field**: one person moving a step while another renames it keeps both
  changes. When two people change the same field at the same moment, the same one wins for
  everyone. A link to a step someone deleted meanwhile is dropped, an action of a deleted step goes
  with it, and a name created twice at once is made unique (a grafcet gets `_2`).
- **Undo** (`Ctrl+Z`) takes back only your own changes. A change someone else has since made to
  the same field is kept; a message says so.
- **Simulating**: your simulation runs on the diagram as it was when it started. Changes the others
  make meanwhile wait, and a button in the simulation controls says who changed the diagram:
  **Restart with changes** takes them in and starts the simulation over; **Stop** takes them in
  too. The others see that you are simulating (▶ on your avatar).
- **Offline**: when the connection drops, keep working; your changes are sent, and the others'
  received, when it is back. A reload rejoins by itself, edits made offline included.
- **Leave session** (in the dialog) disconnects you; the project stays open as your own copy and
  the others go on. Opening another project leaves the session too.
- **Privacy**: everything is end-to-end encrypted with a key that exists only in the link (after
  the `#`, never sent to a server): the server only relays and stores data it cannot read.
  Anyone who has the link can see and change the project, so share it like the file itself. A
  session is deleted 30 days after its last change.

Live collaboration needs a relay server: the public site has one; self-hosted installations add
it as described in the README. Elsewhere the menu entry is unavailable.

## Feedback

**Help › Send feedback…** (or the speech-bubble button at the bottom right) composes a message —
idea, problem, question or praise. On the public site **Send** delivers it anonymously to the
developers: no account is needed, and you can leave an email address if you would like a reply.
By default it includes a share link of the open project, so the developers can open a copy of it
and see exactly what you mean; untick **Include a link to the open project** if the project is
confidential. Optionally it adds the app version and browser details. Nothing else is sent.

Installations without the feedback service open the message in your email app instead (when an
address was set with `VITE_FEEDBACK_EMAIL` at build time), or offer **Copy** so you can pass it on
yourself.

## Settings

**Settings** (`Ctrl+,` or **File › Settings…**) are applied at once and
remembered on this device:

- **Appearance**: theme, textbook notation, welcome screen at startup.
- **Editor**: grid, snap to grid, hints. Autosave is always on.
- **Simulation**: the speed a simulation starts with (changing the speed in the simulation bar
  updates it), highlighting of cleared transitions, step timers.
- **Data and storage**: browser storage used, download a backup of the open project, clear the
  local history or the recent files list, reset preferences.
- **About**: version, keyboard shortcuts, privacy.

## Theme

Choose System (screen icon), Light (sun) or Dark (moon) in the row at the bottom of the main menu ☰
(or in Settings). _System_ follows your operating system setting and updates live when it changes. The choice is remembered on this device.

## Language

GrafcetMaker is in English, French, German, Spanish, Danish and Swedish. On grafcet.org the first visit starts in
the language of the country you visit from (English for countries that speak none of the other
five, and on self-hosted installs). To change it, use the language button at the bottom right (it
shows the flag of the current language; point at it for its name), on phones the flags at the
bottom of the menu drawer ☰, or the command palette (`Ctrl+K`, "Language"). The choice is remembered on this device.

Each language also has its own address: `…/fr/`, `…/de/`, `…/es/` and `…/en/` open the editor in
that language, and changing the language changes the address, so a link you share opens in your
language. The help pages and the GRAFCET guide follow the language; the examples and the
generated PLC code stay in English.
