# Variables

Every name used in a receptivity or an action is a **variable** of the project. Declaring it gives
it a type and a direction, lets GrafcetMaker check your expressions and lets the simulator offer
the right controls.

## Kinds of variables

- **Direction**: an **input** comes from the process (sensors, buttons) and can only be read; an
  **output** drives the process (motors, lamps); an **internal** variable is a memory or counter.
- **Type**: `BOOL` (true / false), `INT` (whole number), `REAL` (decimal number) or `TIME`
  (duration, e.g. `500ms`, `3s`).
- **Initial value**: the value at the start of a simulation (FALSE or 0 when empty).
- **Address** and **comment**: free text, e.g. a PLC address `%I0.0` and what the signal is.

Names are not case-sensitive, use letters, digits and `_`, and cannot be reserved words (`AND`,
`OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`, `INIT`) or look like a step variable (`X12`).

## Creating variables

- While typing an expression, an unknown name offers **Create BOOL input “name”** (or output,
  depending on where you use it). This is the fastest way.
- **Add variable** in the Variables list or table.
- **Import** a list from Excel or CSV (below).

## The variables list (side panel)

The **Variables** tab of the right panel is made for long lists:

- **Search** by name, address or comment, and filter by direction with the chips (**Inputs**,
  **Outputs**, **Internal**), each with its count.
- Variables are grouped by direction; click a group header to fold it.
- Click a variable to open it: edit all its fields, and see **where it is used**. Click a use to
  jump to that receptivity or action on the diagram.
- Keyboard: <kbd>↑</kbd> <kbd>↓</kbd> move between variables, <kbd>Enter</kbd> opens one,
  <kbd>Esc</kbd> closes it.

The number on the right of each variable is how many expressions use it; an unused variable shows
`0` in orange.

## The variable table (bottom panel)

The **Variables** tab of the bottom panel shows every field in columns. Edit any cell in place
(<kbd>Enter</kbd> or leaving the cell applies, <kbd>Esc</kbd> reverts), sort by clicking a column
header, filter by text, direction and type. Click the number in the **Uses** column to see where a
variable is used. The table stays fast with thousands of variables.

## Renaming

Renaming a variable updates every receptivity, action and condition that uses it, in all grafcets,
as one undoable change.

## Excel and CSV

Use the **⋯** menu of the Variables list or table, or **File › Variables**:

- **Export variables as Excel** writes an `.xlsx` workbook with a frozen header, filters and
  drop-down lists for type and direction.
- **Export variables as CSV** writes a text file for other tools.
- **Import variables** reads an `.xlsx` or `.csv` file (you can also drop it on the window).

The columns are `name`, `type`, `direction`, `initial`, `address` and `comment` (in any order; only
`name` and `type` are required). Before anything changes you see how many variables will be added,
updated or rejected, with the reason for each rejected row. Variables are matched by name; those
not in the file are kept. The import is one undoable change.

> **Tip:** to prepare a list in Excel, export first: you get the right columns and drop-down lists,
> then fill in rows and import the file back.
