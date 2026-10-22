# Editing diagrams

GrafcetMaker is built so you rarely place anything by hand: select an element and use a key, and
the new elements are numbered, linked and positioned for you. The hint bar at the bottom of the
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

## Mouse

- **Click** selects; <kbd>Shift</kbd>+click or <kbd>Ctrl</kbd>+click adds to or removes from the
  selection; drag on empty canvas selects with a frame; <kbd>Ctrl+A</kbd> selects everything.
- **Drag** moves (it snaps to the grid), the arrow keys nudge (<kbd>Shift</kbd> for larger steps).
- **Double-click** an element to edit its text; double-click empty canvas to add a step there.
- **Link handles**: a selected or hovered step or transition shows round handles. Drag one: only
  valid targets (a step to a transition, a transition to a step) are highlighted. Drop on empty
  canvas to create the missing element there.
- Click a **link** to select it; <kbd>Del</kbd> removes just that link. Drag an upward link
  sideways to move its side line.

## Tools

The left rail holds the tools: **Select** (<kbd>V</kbd>), **Pan** (<kbd>H</kbd>), **Step**
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

## The side panel

The right panel has two tabs: **Properties** of the selection (or of the grafcet and project when
nothing is selected) and **Variables**. Hide it with the button at its top right or in the View
menu.
