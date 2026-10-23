# Editing diagrams

GrafcetMaker is built so you rarely place anything by hand: select an element and use a key, and
the new elements are numbered, linked and positioned for you. The hints under the toolbar at the top of the
canvas lists the keys that apply to the current selection.

## The essential keys

| Key                            | With a step selected                                         | With a transition selected                  |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------- |
| <kbd>Enter</kbd>               | add a transition and a step below, then edit the receptivity | add a step below                            |
| <kbd>A</kbd>                   | add an action                                                | —                                           |
| <kbd>P</kbd>                   | add a parallel branch (AND)                                  | add one more step it activates              |
| <kbd>O</kbd>                   | add an alternative branch (OR)                               | add an alternative transition (bypass)      |
| <kbd>L</kbd> then click a step | loop back to that step                                       | link to that step (if it leads nowhere yet) |
| <kbd>F2</kbd> or double-click  | edit the number                                              | edit the receptivity                        |
| <kbd>Del</kbd>                 | delete and reconnect the sequence                            | delete                                      |

With nothing selected, <kbd>Enter</kbd> continues the sequence from its last step. <kbd>Enter</kbd> on
a step that already continues inserts the new transition and step and moves everything below
down.

While you edit a receptivity or an action, <kbd>Shift+Enter</kbd> applies it and opens the next one:
the next receptivity down the sequence (a new transition and step at its end), or the next action
of the step (a new one after the last). Type a whole sequence, or a row of actions, in one go.

## Ghosts

A selected step shows dashed **ghosts** of what <kbd>A</kbd> and <kbd>Enter</kbd> would add: an action
after its last action and, at the end of a sequence, a transition and a step with the number it
will get. A transition that leads nowhere shows a ghost step. Click a ghost to add it. With a
placing tool, a ghost under the pointer shows what a click will place.

## Mouse

- **Click** selects; <kbd>Shift</kbd>+click or <kbd>Ctrl</kbd>+click adds to or removes from the
  selection; drag on empty canvas selects with a frame; <kbd>Ctrl+A</kbd> selects everything.
- **Drag** moves (it snaps to the grid), the arrow keys nudge (<kbd>Shift</kbd> for larger steps).
- **Double-click** an element to edit its text; double-click empty canvas to add a step there.
- **Link handles**: a selected or hovered step or transition shows round handles. Drag one: only
  valid targets (a step to a transition, a transition to a step) are highlighted. Drop on empty
  canvas to create the missing element there.
- Click a **link** to select it; <kbd>Del</kbd> removes just that link. Drag an upward link
  (a loop) sideways to move its side line, or drag its bottom line up or down; double-click it
  to return to the automatic route. Automatically, a loop passes below the steps and wires of its
  own sequence rather than crossing them.

## Touch: phones and tablets

- **Tap** selects. **Drag** an element to move it; drag the empty canvas to pan; **pinch** with
  two fingers to zoom.
- **Double-tap** an element to edit its text, or the empty canvas to add a step there.
- **Hold, then drag** on the empty canvas to select everything in a frame.
- With a selection, a **toolbar** at the bottom of the canvas does what the keys do on a computer:
  **Step** (a transition and a step below), **Action**, **Parallel** and **Choice** branches,
  **Loop**, **Edit**, **Details** (the properties) and **Delete**.
- A selected step or transition shows its **link handles** just above and below it: drag one to a
  highlighted target, or to empty canvas to create the missing element.
- With a tool chosen (step, transition, comment, action), **tap** where the element goes.

On a phone the screen is arranged for one hand: the tools, undo and redo are at the bottom, the
menu (☰) holds File, Edit, View, Simulate and Help, and the panels (properties, variables,
problems, simulation, chronogram, outline) open as a sheet over the diagram with the panels
button at the bottom right. Drag the sheet's handle to make it taller or shorter.

## Tools

The toolbar at the top of the window holds the tools (the letter in each button is its key): **Select** (<kbd>V</kbd>), **Pan** (<kbd>H</kbd>), **Step**
(<kbd>S</kbd>), **Transition** (<kbd>T</kbd>), **Comment** (<kbd>C</kbd>) and **Action**
(<kbd>Shift+A</kbd>). With a placing tool, click empty canvas to place an element; hold
<kbd>Shift</kbd> to place several. <kbd>Esc</kbd> returns to Select. The Action tool also adds an
action to a step when you click the step.

## Branches and structures

Divergences and convergences are never drawn by hand; they follow from the links.

- <kbd>O</kbd> on a step adds another outgoing transition with its own step: an **OR divergence**.
- <kbd>P</kbd> on a step adds a step in parallel with it, started by the same transition and joined
  by the next one: an **AND divergence** and **AND convergence**.
- Linking a second step into a transition makes an AND convergence; linking a second transition
  into a step makes an OR convergence.
- **Edit › Source transition above step / Sink transition below step** adds a transition without a
  step above or below.

## Tidy up

- **Edit › Auto-layout grafcet** places all steps in rows, centres branches under their divergence
  and routes loops at the side. **Auto-layout selection** does it for the selection only. Layout
  never happens on its own and can be undone.
- **Edit › Renumber steps** numbers the steps in order along the flow and updates every `Xn`
  reference and forcing order.

## Undo, copy and paste

- <kbd>Ctrl+Z</kbd> undoes, <kbd>Ctrl+Shift+Z</kbd> or <kbd>Ctrl+Y</kbd> redoes. A whole drag is one
  undo step; the Edit menu names what will be undone.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> work between grafcets, projects and browser
  tabs. Pasted steps are renumbered if their numbers are taken, and the variables they use come
  along.

## Navigate

- Scroll to pan; <kbd>Ctrl</kbd>+scroll or pinch to zoom; <kbd>Space</kbd>+drag or the middle
  mouse button pans too.
- <kbd>Shift+1</kbd> fits the whole grafcet, <kbd>Shift+2</kbd> the selection, <kbd>Shift+0</kbd>
  is 100 %.
- <kbd>Ctrl+K</kbd> opens the command palette: type any command or a grafcet name.

## Comments and names

- Comments (<kbd>C</kbd> tool) are free notes on the diagram; they are ignored by the simulator.
- Step labels (Properties panel) are short descriptions shown left of the step.
- Double-click the project name at the top to rename the project, and a grafcet tab to rename the
  grafcet.

## Two grafcets at once

Press <kbd>Ctrl+\</kbd> (or **View › Split view**) to show a second grafcet next to the first, or
right-click a tab and choose **Open to the side** or **Open below**. Each pane has its own grafcet
picker at the top. Click in a pane to work in it: its header is highlighted, and the tabs,
keyboard and Properties panel follow it. Drag the bar between the panes to resize them; × closes a
pane.

## Properties and panels

The diagram has the whole window; the rest floats over it and shows when needed. Select something
and its **properties** appear in a card on the left: the kind of a step or action is chosen with
picture buttons showing its symbol. The card's × hides it for this selection; with nothing
selected, the properties button next to the project name shows the grafcet and the project. The
**Variables**, **Problems**, **Chronogram** and **Outline** panels open from the buttons at the
bottom right, in a card on the right you can widen by its left edge. While simulating, the
simulation panel (inputs, values, log, scenarios) floats on the left.
