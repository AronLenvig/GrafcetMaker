# GrafcetMaker: free online GRAFCET editor and simulator

GrafcetMaker draws, checks and simulates GRAFCET charts (IEC 60848) in the browser and turns them
into PLC code. It is made for automation engineers, teachers and students: free and open source
(MIT licence), with no account, and it works offline.

GrafcetMaker is a web app: it runs in any modern browser with JavaScript turned on. New to
GRAFCET? Read the [GRAFCET guide](en/guide/), also in [French](fr/guide/), [German](de/guide/), [Spanish](es/guide/), [Danish](da/guide/), [Swedish](sv/guide/), [Portuguese](pt/guide/), [Polish](pl/guide/), [Russian](ru/guide/), [Chinese](zh/guide/) and [Hindi](hi/guide/).

## For AI assistants

AI assistants such as ChatGPT and Claude can make a chart for you and give it to you as a link that opens it here. Assistant, read [ai.txt](ai.txt) to learn how. In GrafcetMaker, **File › Open from text…** opens a chart an assistant wrote, and **File › Copy as text** gives your chart back to it.

## What you can do with it

- **Draw** steps, transitions, receptivities and actions with the mouse or the keyboard
  (<kbd>Enter</kbd> continues a sequence), with OR and AND branches, loops, source and sink
  transitions and comments. Automatic layout tidies a chart on demand.
- **Check** the chart while you draw: the syntax and types of every receptivity, unknown
  variables, duplicate step numbers, unreachable steps, dead ends, alternatives that are not
  exclusive, possible transient loops and outputs driven from parallel branches. Most problems have
  a quick fix.
- **Simulate** with the IEC 60848 evolution rules: tokens in the active steps, enabled transitions,
  inputs you click or type, timers, edges, unstable steps, forcing between grafcets, a chronogram of
  every variable, and scenarios you record and replay.
- **Structure** large applications with partial grafcets, macro-steps and their expansions,
  enclosing steps and forcing orders.
- **Export** to PDF (A4 or A3, with a title block, tiled over several sheets if needed), SVG, PNG
  and WebP, the variable table to Excel and CSV, and generate Structured Text or PLCopen XML.
- **Work together** live from a link: everyone sees the others' pointers and changes in real time,
  end-to-end encrypted.

## Supported GRAFCET elements

| Element     | What GrafcetMaker supports                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Steps       | normal and initial steps, macro-steps with their expansion, enclosing steps; step variables `X1`               |
| Transitions | receptivities with AND, OR, NOT, rising ↑ and falling ↓ edges, timers such as `5s/X1`, comparisons of numbers  |
| Structures  | sequences, OR divergence and convergence, AND divergence and convergence, loops, jumps, source and sink        |
| Actions     | continuous, conditional, stored on activation, on deactivation or on an event; forcing orders `G2{8}`, `G2{*}` |
| Variables   | BOOL, INT, REAL and TIME inputs, outputs and internal variables, with addresses and comments                   |
| Notation    | typed in plain ASCII (`a*/b`, `RE a`), shown in textbook notation (overbar for NOT, ↑ and ↓) or as typed       |

## Simulation

The simulator follows the evolution rules of IEC 60848. Initial steps are active at the start. A
transition is enabled when all the steps above it are active, and it clears when its receptivity is
also true: the steps below become active and the steps above inactive. All clearable transitions
clear at the same time, and a step that is activated and deactivated at once stays active.

After every change of the inputs the simulator searches for stability: it keeps clearing
transitions until none can clear. Steps crossed on the way (unstable steps) do not run their
continuous actions, but their stored actions run. Time is virtual, so a chart runs in real time,
faster, or one evolution at a time, and a chronogram records every variable.

## Export and PLC code

| Format            | Use it for                                                  | Opens in                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PDF               | printing and documentation: vector, A4 or A3, title block   | any PDF reader                                                                                                                                                           |
| SVG, PNG, WebP    | reports, slides and web pages, also copied to the clipboard | Word, PowerPoint, browsers and image editors                                                                                                                             |
| Variables         | the variable table as Excel or CSV, and back                | Excel, LibreOffice and other spreadsheet tools                                                                                                                           |
| Structured Text   | PLC code for every grafcet (IEC 61131-3)                    | CODESYS and most IEC 61131-3 tools, Siemens TIA Portal (SCL source for S7-1200/1500), Beckhoff TwinCAT 3 (POU file), Allen-Bradley Studio 5000 (Structured Text routine) |
| PLCopen XML (TC6) | the grafcets as SFC programs                                | PLC engineering tools with PLCopen XML import                                                                                                                            |
| Project file      | the whole project as human-readable `.grafcet.json`         | GrafcetMaker                                                                                                                                                             |

Structured Text comes in two styles: a `CASE` per sequence, as written by hand, or one BOOL per
step. Generated code is a starting point: review it before it runs on a machine.

## Examples

Six example projects open from the start screen of the editor:

- **Traffic light** with a pedestrian button: timers and a stored request.
- **Drilling station**: a machining cycle with a part counter and maintenance every 100 parts.
- **Tank filling**: numeric inputs and comparisons.
- **Parallel conveyor**: parallel branches, with a safety grafcet that forces the line.
- **Bottling line**: a macro-step, three stations in parallel, inspection and counters.
- **Operating modes**: an enclosing step, a pause that freezes the cycle and an emergency stop.

The [GRAFCET guide](en/guide/#examples) draws the first two and opens them in the editor.

## Frequently asked questions

### Is GrafcetMaker free? Are there limits?

Yes, it is free and open source under the MIT licence. There is no paid version, no trial period
and no cap on the number of projects, grafcets or steps.

### Do I need to register or install anything?

No. Open the page and start drawing; there is no account. You can also install it from the
browser as an app, to start it like a desktop program.

### Does it work offline?

Yes. After the first visit everything it needs is stored in the browser, so it starts and works
without a network. Only live collaboration needs a connection.

### Where are my charts stored?

On your computer. Projects are saved automatically in the browser, and in the `.grafcet.json`
files you save. Nothing is uploaded and the app has no tracking. Live sessions are end-to-end
encrypted with a key that is only in the link.

### Which browsers and devices does it run on?

The latest versions of Chrome, Edge, Firefox and Safari, on Windows, macOS, Linux, tablets and
phones. Phones get a layout for small screens, and touch screens get gestures and larger handles.

### Which standard does it follow?

GRAFCET as defined by IEC 60848 (EN 60848 in Europe). Generated code follows IEC 61131-3.

### Can it open files from other GRAFCET programs?

GrafcetMaker opens grafcet.io files (`.grafcetio`) and converts them into a project. Variable
tables can be imported from Excel and CSV.

### Can my company host it on its own network?

Yes. GrafcetMaker is a set of static files that any web server can serve, under any path and
without internet access. A Docker image with nginx is provided.
