# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- GrafcetMaker in **Danish and Swedish**: the interface, the help center, the website's GRAFCET
  guide and the home page text, at `/da/` and `/sv/`. A first visit from Denmark, Greenland and
  the Faroe Islands starts in Danish, from Sweden and Åland in Swedish.
- The ghost under a step that ends its sequence has two parts: click the ghost **transition** to
  add the transition alone (it is selected, with its own ghost step next), or the ghost **step**
  to add both.
- GrafcetMaker in **French, German and Spanish**: the whole interface and the help center. The
  first visit starts in the language of the visitor's country (French in France, Belgium,
  Luxembourg, French-speaking Africa and the Maghreb, German in Germany, Austria and Switzerland,
  Spanish in Spain and Latin America) and in English everywhere else; change it with the small flag button at the bottom
  right (in the menu drawer on phones) or the command palette. The website's help pages are
  published in the four languages too.
- Transitions can be rotated to flow **right to left** (`R`, **Direction** in the properties, or
  the right-click menu): the bar stands vertical, the link from the step before it enters on the
  right and the link to the next step leaves on the left, both with an arrow, as IEC 60848 asks for
  links not drawn top to bottom. File format version 3; version 2 files open unchanged.
- A click anywhere on a transition's receptivity or number, or near its bar, selects it: the thin
  bar is no longer hard to hit.
- Easier to find for search engines and AI assistants: the home page carries a full description
  (features, supported GRAFCET elements, simulation, exports and the PLC tools that take them,
  examples, frequently asked questions) for readers that do not run JavaScript, the help pages are
  published on the website (`help/`), and the site has an `llms.txt` and a fuller sitemap.
- **Live collaboration** (**File › Live collaboration…**, or the people button at the top right,
  where the share link button was): edit a project together in real time from a link. Everyone's
  pointer, selection and the element they edit appear with their name and color; avatars show who
  is there, on which grafcet and who is simulating, and a click goes where they are. Changes merge
  field by field (a move and a rename of the same step both stay), undo takes back only your own
  changes, work goes on offline and merges on reconnect, and a reload rejoins by itself. While you
  simulate, the others' changes wait until **Restart with changes**. End-to-end encrypted: the key
  is only in the link. The public site relays sessions with a Cloudflare Durable Object;
  self-hosted installs can run `server/relay.ts` (`deploy/docker-compose.yml`).
- Right-click menu on the canvas (desktops): the commands for the element under the pointer, the
  selection, or empty canvas (**Add step here**, paste, auto-layout, renumber, fit).
- Simulation: click a BOOL input where it is written in a receptivity or condition to switch it;
  point at a transition (or tap it) to see what it is waiting for (steps to be active, false
  terms, time left on step timers).
- While simulating, the signals of receptivities and action conditions that are true (a variable
  on, an active step, a comparison that holds) are green, bold and underlined.
- **Remove unused variables**: a broom button in the Variables panel (list and table, with a count
  badge) and a command removes every variable no expression uses and no scenario drives, in one
  undo step.
- Two larger examples on the start screen. **Bottling line**: a macro-step for filling, three
  stations in parallel, a camera inspection that counts or rejects bottles (with a transient
  step), a batch end and an action without a step, plus a scenario. **Operating modes**: an
  enclosing step runs the production cycle, a stop request ends it at the end of the cycle, a
  pause freezes it (`Cycle{*}`) and an emergency stop forces the modes back (`Modes{0}`), with two
  scenarios.
- Open grafcet.io files (`.grafcetio`) with **File › Open** or by dropping them on the window.
  They become a new project: one partial grafcet per frame or separate chart (a frame of actions
  without steps too), branch bars and loop markers followed (separate loops that keep the default
  label `*` stay separate), every action type converted, variables created from what the charts
  use, and a clean layout. A dialog lists anything the conversion changed, including transitions
  not linked to a step.
- Structured Text for your PLC: **Export › Structured Text › PLC** writes plain IEC 61131-3,
  a **Siemens TIA Portal** SCL source (`.scl`, S7-1200/1500: `#` locals, TON_TIME timers, ready for
  Generate blocks from source), a **Beckhoff TwinCAT 3** POU (`.TcPOU`) or an **Allen-Bradley
  Studio 5000** routine (TONR/TOFR timers, OSRI/OSFI edges, the tags to create in the header,
  initial values on the first scan).
- Option **Hold stored actions with a constant value while their step is active**: `Q := 1` is
  assigned in every scan of its step instead of once (stored actions already keep their value; this
  re-asserts it, PLC style).
- Ghost completion while typing a receptivity or an action: the rest of the suggested name shows
  in grey after the cursor (`Tab` or `→` accepts it), and an empty field suggests the first
  variable nothing uses yet.
- `Shift+Enter` in the editor of an action or a receptivity applies it and opens the next one (a
  new action, or a new transition and step at the end of the sequence).
- Ghosts on the diagram: a selected step shows where `A` and `Enter` would add the next action and
  the next transition and step (click a ghost to add it); placing tools show a ghost of what a
  click will place.
- Structured Text in the style PLC programmers write by hand, now the default: one INT step
  variable per sequence and a `CASE` with the transitions of each step, stored actions inside the
  transitions, then each output as one expression of the steps
  (`M5U1_Grab := step_G1 >= 2 AND step_G1 <= 4;`). The previous style stays available as
  **Code style › One BOOL per step**.

- GRAFCET guide on the website in English, French, German and Spanish (`en/guide/`,
  `fr/guide/`, `de/guide/`, `es/guide/`): the elements, the five evolution rules, receptivities, actions, branches, hierarchy and
  GRAFCET versus SFC, with diagrams and examples that open in the editor. **Help › GRAFCET guide**
  and the start screen link to it; it works offline like the app.
- Search engines and link previews: a descriptive page title on a first visit, description,
  canonical link, Open Graph image, structured data, `sitemap.xml` and `robots.txt`. Public
  mirrors set their address with `SITE_URL` at build time.
- Actions without a step: place one with the Action tool (or `A` with nothing selected); drag it
  onto a step to attach it, or choose its step in the properties panel. An action without a step
  is always active: a continuous action follows its assignment condition, a stored action runs on
  its event (on activation: once at start), a forcing order is always in force. Simulated and
  generated (Structured Text; PLCopen XML through a GRAFCET_Always program).
- Share links: **File › Copy share link** copies a URL that contains the whole project
  (compressed, after the `#`, never sent to the server). Opening it gives the recipient their own
  copy; damaged links are rejected with an explanation.

### Changed

- **Add** in a step's properties adds the action without selecting it: the step stays selected and
  the new action unfolds in its list.
- Typing on the diagram looks like typing on the canvas: the text is edited in place, in the
  diagram's own font and size, with only the caret showing (no box around it), and the box around
  it (an action, a comment, the selection) grows as you type. Phones keep a field across the
  canvas.
- The tour has ten steps and covers today's screen: the diagram, tools, Simulate, hints, menu and
  project, problems / export / sharing, zoom and undo, grafcet tabs, panels, and help with the
  language and the command palette.
- The canvas comes first: the toolbars rest slightly faded until you point at them, and
  **Simulate** is a compact play button.
- Each language has its own address: `/en/`, `/fr/`, `/de/` and `/es/` open the editor in that
  language, and changing the language changes the address. The GRAFCET guide moved to
  `/<language>/guide/` and the help pages to `/<language>/help/`.
- The language button and the website's language links show flags, named on hover.
- The main menu shows the theme as one row of icons (screen, sun, moon), named on hover.
- The help center covers the latest editor: typing on the diagram, ghosts, selections, the
  language, and the newer problems in Troubleshooting.
- A transition whose receptivity is not written yet shows a grey "?" instead of a red problem
  badge (it is still listed in Problems).
- Clicking the ghost transition and step selects the new step, as if it had been clicked, instead
  of opening the receptivity editor: click its ghost again to keep the sequence growing. `Enter`
  still types the receptivity at once.
- **Simulate** moved to the right end of the tool bar; its place at the top right is now a small
  **Export** button that opens the Export dialog.
- Names typed in a receptivity, an action or a condition that are not variables yet are created
  when the text is applied (one undo step, with a message listing them), typed and directed from
  their use. While typing, a note shows what will be created instead of an "Unknown variable"
  error. A number read in a condition is now guessed to be an input (it was internal).
- Drag any action on the diagram: onto another step (a mark shows its place among that step's
  actions, so dragging along the row reorders them) or onto empty canvas to leave it without a
  step. The **Step** field of the action properties is gone, and the output (or assignment,
  forcing order) is now the first field.
- Starting the simulation (`F5`, **Simulate**) runs the clock at once; `F5` pauses. The evolution
  log of the simulation panel is folded until you open it. A selected step lists its actions as
  compact rows (symbol, text, condition), each unfolding into its fields.
- Loop (upward) links: their bottom line drops below the steps and wires of their own sequence
  instead of crossing them (a loop from a right-hand branch passes below the chart), lanes ignore
  separate sequences drawn beside the chart, and loops to the same step share one arrow. Drag a
  loop's bottom line up or down (saved as `routing.dropY`); double-click a loop to return to the
  automatic route.
- The panels (Variables, Problems, Chronogram, Outline) open in a card on the right, widened by
  its left edge (wide enough, the variables show as the full table). The simulation panel is no
  longer among them: it floats on the left while simulating and folds to its title. The
  simulation inspector is gone; the diagram shows the live state.
- The canvas fills the window. Everything else floats over it and appears when needed: the main
  menu ☰ with the project name at the top left, the tools at the top centre (new icons, each
  showing its key) with the hints below, problems / Simulate / share at the top right, zoom and
  undo at the bottom left, the grafcet tabs at the bottom centre, and the panels (Variables,
  Problems, Simulation, Chronogram, Outline) at the bottom right, each opening in a floating card.
  The properties show in a floating card while something is selected; the variable list left
  that card (the Variables panel and a variable's details remain). The simulation controls take
  the tools' place while simulating.
- The kind of a step is chosen with picture buttons (step, initial, macro-step, enclosing), like
  the kind of an action.
- Mobile friendly. On phones the diagram gets the whole screen: a bottom toolbar (tools, undo,
  redo, panels), the menus in a ☰ drawer, the panels in a resizable sheet, a compact simulation
  bar, and dialogs that fit the screen. On every touch screen: one-finger pan, pinch-zoom,
  double-tap to edit or add a step, hold-and-drag selection, a selection toolbar (Step, Action,
  Parallel, Choice, Loop, Edit, Details, Delete), bigger link handles and hit areas, touch hints,
  and no auto-capitalisation or autocorrect in code fields.
- Send feedback is anonymous on the hosted site: messages go to the developers without an account
  or email app, with an optional contact for a reply. The author's email address is no longer in
  the app; other installations use `VITE_FEEDBACK_EMAIL` or Copy.
- A Simulate button (F5) in the top bar starts the simulation.
- Welcome screen: on a first visit it no longer offers to continue the empty starting project;
  its button reads "Start drawing".
- Delete a grafcet with `Del` on its tab; pick several tabs with Ctrl/Cmd+click or Shift+click to
  delete them together (one confirmation, one undo step).
- Grafcet tabs can be dragged to change their order (one undo step; Ctrl+Shift+← / → on a focused
  tab). Ctrl/Cmd shortcuts such as undo also work while a tab has focus.
- Settings › Appearance: turn the welcome screen at startup on or off.
- Reloading or reopening the app restores the last work without asking (then shows the start
  screen), and there is no "leave page?" confirmation any more: autosave keeps everything.
- Stored actions accept a BOOL variable alone: `M1` means `M1 := TRUE`.
- The kind of an action is chosen with picture buttons showing its symbol (continuous,
  conditional, activation ↑, deactivation ↓, event, forcing). "Conditional" is a kind of its own:
  the condition input appears with it, like the event of an action on event; the separate
  "Assignment condition" field is gone. A conditional action without its condition is reported.
- File format version 2 (actions without a step). Version 1 files open unchanged; GrafcetMaker 1.0.0
  reports version 2 files as made by a newer version.

### Fixed

- Selecting with a box or **Select all** also selects all the actions of the selected steps, even
  those reaching beyond the box (Select all left out every action), and the links between selected elements are highlighted. Dragging one of
  the selected actions moves the whole selection.
- Dragging one of several selected actions without a step moves the whole selection, not that
  action alone.
- Export: notes that read the same are listed once with their count (e.g. "4× An expression does
  not parse…") instead of once per element.
- The action tool shows its key (⇧A) in its corner like the other tools, and Simulate shows F5.
- The hint for an unknown name in an expression showed `{{type}} {{direction}}` instead of the
  variable it would become.
- Many grafcet tabs no longer show a scrollbar that pushed the tabs up: the strip scrolls with the
  wheel and ‹ › buttons, and keeps the active tab in view.
- A grafcet name error while renaming a tab is no longer cut off by the tab strip.
- Placing a comment with the Comment tool now opens its text editor at once.
- Simulation: a receptivity that reads an output or internal variable set by a continuous action
  (e.g. `Running * Auto * !E_Stop` while another step sets `Running`), or by a stored action of a
  forced grafcet, now clears as soon as the value changes, in a follow-up cycle marked
  _internal_. Before, it waited for the next input change even though every value shown was true;
  timers and edges on such variables also started late. The chronogram now shows the situation each cycle ended in, not the last one of a batch.
- A forcing order `G1{}` that nothing undoes is now reported: `G1{}` is the empty situation (IEC
  60848: no step of G1 active), so without another order such as `G1{INIT}` or a source
  transition G1 never runs again. Problems shows a warning with the fix **Use G1{INIT}** (the
  initial steps), and the Structured Text export lists it.
- Deleting the last step of a sequence keeps the transition leading to it (as a sink transition,
  ready for a new step with `Enter`) instead of deleting it too.

## [1.0.0] - 2026-10-22

First release.

### Added

- Start screen with four example projects (traffic light, drilling station, tank filling, parallel
  conveyor), a five-step guided tour, glossary explanations of standard terms, and an outline tree
  view of every grafcet as an accessible alternative to the diagram.
- Installable progressive web app: works offline after the first visit, offers to reload when an
  update is ready, and shows what's new after an update.

- Project scaffold: Vite + React + TypeScript, strict CSP, light/dark/system theme, CI, Docker image.
- Project data model, `.grafcet.json` file format with schema validation and migration chain.
- Diagram editor: steps, transitions, actions, comments, links with orthogonal routing and loop
  arrows; keyboard-first editing (Enter continues a sequence, A adds an action, F2 edits, Del
  deletes and heals the sequence), drag, marquee, link handles, copy/paste across projects,
  undo/redo.
- Multiple partial grafcets as tabs; properties panel; command palette (Ctrl+K).
- Save / Save as / Open with the File System Access API or download/upload fallback, drag-and-drop
  open, recent files, autosave to browser storage, local snapshot history and crash recovery.
- Expression language for receptivities and actions (AND/OR/NOT, edges, timers, step activity,
  comparisons, arithmetic), textbook notation with overbars, live error reporting with position,
  hints and quick fixes, autocomplete.
- Variable table (inputs, outputs, internals; BOOL/INT/REAL/TIME) with rename refactoring and
  usage counts.
- Structures: parallel (AND) and alternative (OR) branches, loops with movable lanes, source and
  sink transitions; on-demand auto-layout (whole grafcet or selection); step renumbering that
  updates all references.
- Continuous validation in a Web Worker: Problems panel with jump-to-element and quick fixes,
  on-diagram badges, counters in the top bar. Includes reachability, dead ends, exclusivity of
  alternative branches, possible transient loops and outputs driven from parallel branches.
- Simulation (IEC 60848): deterministic virtual time (real time ×N, fast, step), search for
  stability with transient-loop detection, edges, timers, stored/event actions, forcing; tokens,
  enabled/cleared markers and live values on the diagram; inputs panel (toggle, momentary,
  numeric); evolution log; chronogram with time travel; scenario record and replay.
- Export dialog (Ctrl+E) with live preview: vector PDF (A4/A3, fit or tiled, title block), SVG,
  PNG 1×/2×/4×, variables CSV; black on white or current theme; copy as SVG/PNG to the clipboard.
- Import variables from CSV (menu or drag-and-drop) with a preview of changes and row errors.
- Hierarchy: macro-steps with expansion grafcets (E/S), enclosing steps with enclosed grafcets (*),
  navigation between levels, simulation of both, validation of the hierarchy and forcing cycles.
- Code generation: Structured Text (IEC 61131-3 function block, optional search for stability per
  scan) and PLCopen TC6 XML (SFC programs with N/P1/P0/S/R/D/L qualifiers), from the Export dialog,
  with a list of what the target cannot express.
- Split view (Ctrl+\\): two grafcets side by side or stacked, each pane with its own grafcet
  picker; both show the simulation live.
- Send feedback: a form in the bottom-left corner that opens a prefilled email to the author
  (configurable with `VITE_FEEDBACK_EMAIL`); nothing is sent by the app.
- Help center (F1): getting-started tutorial, GRAFCET basics with diagrams, guides for
  expressions, actions, editing, variables, simulation, hierarchy and files, glossary and
  troubleshooting; search; shareable `#help/<page>` links.
- Contextual hint bar showing the keys and gestures available for the selection, tool or drag.
- Settings dialog (Ctrl+,): theme, notation, grid, hints, simulation defaults, storage usage,
  backup, clearing local history and recent files, resetting preferences.
- Variables: Excel (.xlsx) export and import, a searchable, grouped variable list in the side
  panel with where-used and jump-to, a sortable, filterable table that stays fast with thousands
  of variables.
- Export as WebP; File › Export as shortcuts to each format.
- Rising / falling edges are easy to enter: type `^`, press Alt+↑ / Alt+↓, or use the symbol bar.
- Rename the project in place by double-clicking its title.
- Warning for a stored action on event without an event.

### Changed

- Accessibility audit (WCAG 2.2 AA, axe): dialogs expose the dialog role, the side panel is one
  landmark, every page state has a level-one heading, switches and help buttons have 24 px
  targets, the chronogram can be scrolled with the keyboard.

- Stored actions on activation are drawn with an ↑ above the box, on deactivation with an ↓ below
  it, and actions on an event with a flag at the top right (previously arrows inside the box and no
  mark for events).
- Restyled text inputs and the inline editor on the canvas.
