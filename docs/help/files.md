# Files, saving and export

Everything happens on your computer: there is no account and nothing is uploaded.

## Autosave and recovery

Every change is kept in your browser half a second after you make it. You can reload or close the
tab at any time without being asked: the next time you open GrafcetMaker, your project is back as
you left it, unsaved changes included. A dot `●` next to the project name means there are changes not yet saved to a file.

**File › Local history** lists snapshots kept in the browser: taken when you save, every few minutes
while you edit and before a project is closed. Restoring one opens it as unsaved changes.

> **Important:** browser storage belongs to this browser on this computer, and clearing site data
> erases it. Save to a file for anything you want to keep.

## Offline and installation

After the first visit GrafcetMaker works without a network. Use the install button of your
browser's address bar to get it as an app with its own window. When a new version is ready, a card
in the corner offers to reload: your work is kept.

## Save and open

- **Save** (<kbd>Ctrl+S</kbd>) writes the project to a `.grafcet.json` file. In Chrome and Edge it
  writes back to the same file each time; in other browsers it downloads the file.
- **Save as** (<kbd>Ctrl+Shift+S</kbd>) picks a new file. **File › Download a copy** downloads one
  without changing where Save writes.
- **Open** (<kbd>Ctrl+O</kbd>), **File › Open recent**, or drop a `.grafcet.json` file anywhere on
  the window. If the open project has unsaved changes you are asked first, and an invalid file is
  rejected with an explanation without touching your project.

`.grafcet.json` files are readable text, well suited to version control (Git) and code review.

**grafcet.io files** (`.grafcetio`) open the same way: they are converted into a new project, with
one partial grafcet per chart (or per frame), the variables created from what the charts use and a
tidy layout. A message lists anything the conversion changed. Save to keep it as a GrafcetMaker
project; the original file is not modified.

## Share a link

**File › Copy share link** copies a web address that contains the whole project, compressed. Paste
it into a chat, an email or a ticket: whoever opens it gets their own copy of the project, with all
its grafcets and variables, and can change it without affecting yours.

- The project travels inside the link (after the `#`), which browsers never send to the web
  server: nothing is uploaded, and links also work offline and on in-house installations.
- Anyone who has the link can read the project, so share it like the file itself.
- A link is a snapshot: later changes need a new link.
- Small charts give links of one or two thousand characters. If GrafcetMaker warns that a link is
  long, some chat and email apps may cut it; send the `.grafcet.json` file instead.
- Opening a link works like opening a file: if your project has unsaved changes you are asked
  first, and a damaged link is rejected with an explanation without touching your project.

## Charts from AI assistants

An AI assistant such as ChatGPT or Claude can draw a chart for you. Ask it to read
[grafcet.org/ai.txt](https://grafcet.org/ai.txt) first: it explains GRAFCET text, a plain-text
form of a chart, and how to make a link that opens the chart here.

- **A link from the assistant** opens the chart, laid out automatically, in place of the open
  project (you are asked first when it has unsaved changes).
- **File › Open from text…** opens a chart the assistant wrote as text: paste it and click
  **Open**. A line that cannot be read is named, with what is wrong; you can fix it or send the
  message back to the assistant.
- **File › Copy as text (for AI assistants)** copies your chart as GRAFCET text, to paste into
  the chat and ask for changes, an explanation or a review.

Positions are not part of the text: a chart opened from text is laid out automatically.

## Edit together live

**File › Live collaboration…** (or the people button at the top right) lets several people edit
the same project at the same time, each on their own computer.

1. Type your name and choose **Start live session**. Send the link that appears to the others.
2. They open the link, type their name and choose **Join**.
3. Everyone sees the others' pointers and selections with their names, and every change appears
   for everyone within a moment.

- Changes merge field by field: moving a step while someone renames it keeps both.
- **Undo** takes back only your own changes.
- While you simulate, the others' changes wait so the diagram keeps matching your simulation:
  **Restart with changes** in the simulation controls takes them in.
- Without a connection you can keep working; changes are exchanged when it is back.
- **Leave session** keeps the project on your device as your own copy.
- The project is end-to-end encrypted with a key that is only in the link: anyone who has the link
  can see and change the project, so share it like the file itself.

## Export

**File › Export…** (<kbd>Ctrl+E</kbd>, or the **Export** button at the top right) opens one dialog for every format, with a live preview. Its
settings are remembered per project. **File › Export as** opens it on a given format directly.

| Format                | Use it for                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **PDF**               | printing and documentation: vector, A4 or A3, fitted to the page or tiled over several sheets, with a title block |
| **SVG**               | documents and the web: vector, sharp at any size                                                                  |
| **PNG**               | slides, chats and tickets: 1×, 2× or 4× resolution, optionally transparent                                        |
| **WebP**              | the same as PNG with smaller files                                                                                |
| **Variables (Excel)** | the variable table as an `.xlsx` workbook                                                                         |
| **Variables (CSV)**   | the variable table for other tools                                                                                |
| **Structured Text**   | PLC code running every grafcet: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 or Allen-Bradley Logix  |
| **PLCopen XML**       | importing the grafcets into a PLC tool as SFC programs                                                            |

Exports are black on white by default; choose **Current theme** to keep the screen colors.
Export the current grafcet, the selection, or all grafcets.

**File › Copy diagram as PNG / SVG** puts the selection (or the whole grafcet) on the clipboard,
ready to paste into a report.

## PLC code

**Structured Text** and **PLCopen XML** turn your grafcets into PLC code. Pick the PLC under
**PLC**:

- **IEC 61131-3**: a function block (`.st`) for CODESYS and most other tools.
- **Siemens TIA Portal (SCL)**: an SCL source (`.scl`) for S7-1200/1500. In TIA Portal, add it under
  **External source files** and choose **Generate blocks from source**.
- **Beckhoff TwinCAT 3**: a POU file (`.TcPOU`). Right-click a folder of the PLC project ›
  **Add › Existing Item**.
- **Allen-Bradley Studio 5000**: a Structured Text routine. Create the tags listed in its header
  (program scope), then paste the code into an ST routine. Timers use TONR/TOFR, edges OSRI/OSFI,
  and the first scan (`S:FS`) sets the initial values.

Structured Text comes in two styles:

- **CASE per sequence** (default): one INT variable per sequence holds the number of its active
  step, and a `CASE` lists the transitions of each step (`IF receptivity THEN step_G1 := 2;`).
  Outputs follow as one line each, e.g. `Motor := step_G1 >= 2 AND step_G1 <= 4;`. Sequences with
  parallel branches keep one BOOL per step.
- **One BOOL per step**: every transition, then every step, then the timers, edges and actions
  once per PLC scan; tick **Search for stability in each scan** to cross chains of true transitions
  within one scan, as GRAFCET does.

A stored action such as `Q1 := 1` on activation runs once, and Q1 keeps its value after the step
is left. Tick **Hold stored actions with a constant value** to assign it in every scan while its
step is active instead.

The PLCopen file contains one SFC program per
grafcet for import into engineering tools. The preview lists anything the format cannot express.
Always review generated code before it runs on a machine.

## Settings

**File › Settings…** (<kbd>Ctrl+,</kbd>) holds the theme, notation, welcome screen, grid, hints and
simulation preferences, and shows how much browser storage is used. You can clear the local history
and the recent files list there.

## Language

Choose the language with the flag at the bottom right (on a phone, at the bottom of the menu ☰);
the choice is remembered on this device. Each language also has its own address,
such as `…/de/` for German, so a link opens in the language it was sent in.
