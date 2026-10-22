# Writing receptivities

Receptivities, action conditions and events are logical expressions. You type them in plain
ASCII; the diagram shows them in textbook notation (NOT as an overbar, AND as `·`). Turn
**View › Textbook notation** off to see exactly what you typed.

## Operators

| Meaning             | Type          | Also accepted                   | Shown as          |
| ------------------- | ------------- | ------------------------------- | ----------------- |
| AND                 | `a * b`       | `a AND b`, `a && b`, `a · b`    | a · b             |
| OR                  | `a + b`       | `a OR b`, `a \|\| b`            | a + b             |
| NOT                 | `/a`          | `NOT a`, `!a`, `¬a`             | a with an overbar |
| Rising edge         | `↑a`          | `RE a` (typing `^a` gives `↑a`) | ↑a                |
| Falling edge        | `↓a`          | `FE a`                          | ↓a                |
| Always true / false | `1` / `0`     | `TRUE` / `FALSE`                | 1 / 0             |
| Parentheses         | `(a + b) * c` |                                 | (a + b) · c       |

NOT binds tightest, then AND, then OR: `a + b * /c` means `a + (b * (/c))`. Use parentheses when in
doubt.

## Rising and falling edges

An edge is true only at the instant its operand changes: **↑a** (rising edge, _P trigger_) when `a`
goes from false to true, **↓a** (falling edge, _N trigger_) when it goes from true to false. Use it
to react once to a button press, however long the button is held.

<!-- figure: edges | Lamp on from a press of the button to its release -->

Three ways to type an edge:

- Type `^` before the name: `^start` becomes `↑start` as you type.
- Put the text cursor on a name and press <kbd>Alt+↑</kbd> for a rising edge or <kbd>Alt+↓</kbd> for
  a falling edge. Press it again to remove the edge, or the other one to swap it.
- Click **↑** or **↓** in the symbol bar that appears above the field while you edit a receptivity.

`RE a` and `FE a` are accepted too. Edges also work on step variables: `↑X3` is true when step 3
becomes active.

## Step variables

`X3` is true while step 3 is active. In a project with several grafcets, `X3` refers to step 3 of
the same grafcet, or to the only step 3 of the project. Use it to synchronise grafcets, e.g. wait
for another grafcet to reach a step.

## Timers

`5s/X2` is true 5 seconds after `X2` became true, and false again as soon as `X2` is false:
typically "5 s after step 2 was activated".

<!-- figure: timer | The heater runs for 5 s -->

- Units: `ms`, `s`, `min`, `h`, e.g. `500ms/X4`, `2min/start`.
- The operand can be any condition: `3s/(a * b)`.
- `2s/a/5s` is true 2 s after `a` became true and stays true until 5 s after `a` became false.

## Comparisons

Numeric variables (INT, REAL, TIME) are compared with `=`, `<>`, `<`, `<=`, `>`, `>=`, and can use
`+`, `-`, `*`, `/` and `MOD` inside the comparison: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. A comparison is a condition: when you combine it with others, put it in
parentheses, as in `start * (C < 10)`. Without them, `start * C < 10` would compare `start * C`
with 10.

## Assignments in stored actions

Stored actions contain an assignment: `C := C + 1`, `Motor := 1`, `Speed := 2.5`, `Done := FALSE`.
See [Actions](actions.md).

## Help while you type

- **Suggestions**: start typing a name and pick a variable or step (`X…`) with the arrow keys, then
  <kbd>Enter</kbd> or <kbd>Tab</kbd>.
- **Problems**: a box under the field explains what is wrong, underlines where, and offers fixes:
  **Use “Start”** for a misspelt name, **Create BOOL input “start”** for a new one.
- **Symbol bar**: buttons for ↑ ↓ NOT AND OR, parentheses (they wrap the selected text) and a timer
  template.

You can always confirm an expression with a problem: it is shown underlined in red on the diagram
and listed in **Problems** until you fix it.
