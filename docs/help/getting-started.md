# Getting started

In this tutorial you draw the control of a small tank: when the operator presses **start**, a pump
fills the tank until it is **full**, then a valve drains it until it is **empty**, and the system
waits for the next start. It takes about ten minutes.

<!-- figure: sequence | The grafcet you will draw -->

## 1. Find your way around

- **Center**: the canvas, where you draw. Each grafcet of the project has a tab above it.
- **Left**: the tools (select, pan, place step, transition or comment), undo and redo.
- **Right**: the **Properties** of what you select, and the **Variables** list.
- **Bottom**: the variable table, the **Problems** list, the **Simulation** panel and the
  **Chronogram**.
- **Bottom of the canvas**: the hint bar shows what you can do right now. Watch it while you
  follow this tutorial.

A new project already contains the grafcet **G1** with step **0**. Its double square means it is an
**initial step**: it is active when the system starts.

## 2. Add the first transition and step

1. Click step **0** to select it.
2. Press <kbd>Enter</kbd>. A transition and step **1** appear below, and an editor opens next to the
   transition so you can type its **receptivity**, the condition for moving on.
3. Type `start` and press <kbd>Enter</kbd>.

`start` is not declared yet, so the editor shows **Unknown variable “start”** with a button
**Create BOOL input “start”**. Click it: the variable is added to the variable list. (You can also do
it later from the Problems list.)

## 3. Add an action

Step 1 is still selected. Press <kbd>A</kbd>, type `Pump` and press <kbd>Enter</kbd>. Again, click
**Create BOOL output “Pump”**. The pump now runs as long as step 1 is active.

## 4. Continue the sequence

1. Press <kbd>Enter</kbd> again: transition and step **2** are added after step 1. Type `full` as
   the receptivity and create the input.
2. Press <kbd>A</kbd> and add the action `Valve` (create the output).

## 5. Close the loop

The cycle has to go back to step 0 when the tank is empty.

1. With step **2** selected, press <kbd>L</kbd>. The hint bar says **Click a step to loop back to
   it**.
2. Click step **0**. A transition is added below step 2 with a link going up to step 0, drawn with
   an arrow because it goes upward.
3. Type `empty` as its receptivity, press <kbd>Enter</kbd> and create the input.

Your chart now matches the figure at the top of this page.

## 6. Check it

Look at the counters at the top right: a red circle counts **errors**, an orange triangle counts
**warnings**. Click them to open the **Problems** list. Each problem says what is wrong and where;
click it to jump to the element, and use the fix button when there is one. A correct chart has no
errors. See [Troubleshooting](troubleshooting.md) for the meaning of each message.

## 7. Simulate

1. Press <kbd>F5</kbd>. The diagram is locked and the **Simulation** panel opens. Step 0 carries a
   token: it is active.
2. In the panel, switch **start** on. The transition clears: step 1 becomes active and its action
   **Pump** shows a check mark ✓.
3. Switch **start** off, then **full** on: step 2 becomes active and **Valve** turns on.
4. Switch **full** off and **empty** on: the grafcet goes back to step 0.
5. Open the **Chronogram** tab to see every signal over time. Press <kbd>Shift+F5</kbd> to stop.

What happens if **start** stays on when the tank becomes empty? Try it: as soon as step 0 is
active again, its transition is cleared again. That is GRAFCET behaving exactly as drawn. Use a
rising edge `↑start` to react only to a new press (type `^start`, see
[Writing receptivities](expressions.md)).

## 8. Save

Your work is saved in the browser automatically after every change. To get a file you can keep,
send or put under version control, press <kbd>Ctrl+S</kbd>: the project is saved as
`<name>.grafcet.json`. Double-click the project name at the top to rename it.

## Where next?

- [GRAFCET basics](grafcet-basics.md) explains the rules behind what you just saw.
- [Editing diagrams](editing.md) shows parallel and alternative branches and other fast moves.
- [Simulation](simulation.md) covers timers, the evolution log and scenarios.
