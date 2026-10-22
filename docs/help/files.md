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

## Export

**File › Export…** (<kbd>Ctrl+E</kbd>) opens one dialog for every format, with a live preview. Its
settings are remembered per project. **File › Export as** opens it on a given format directly.

| Format                | Use it for                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **PDF**               | printing and documentation: vector, A4 or A3, fitted to the page or tiled over several sheets, with a title block |
| **SVG**               | documents and the web: vector, sharp at any size                                                                  |
| **PNG**               | slides, chats and tickets: 1×, 2× or 4× resolution, optionally transparent                                        |
| **WebP**              | the same as PNG with smaller files                                                                                |
| **Variables (Excel)** | the variable table as an `.xlsx` workbook                                                                         |
| **Variables (CSV)**   | the variable table for other tools                                                                                |
| **Structured Text**   | PLC code: an IEC 61131-3 function block running every grafcet                                                     |
| **PLCopen XML**       | importing the grafcets into a PLC tool as SFC programs                                                            |

Exports are black on white by default; choose **Current theme** to keep the screen colors.
Export the current grafcet, the selection, or all grafcets.

**File › Copy diagram as PNG / SVG** puts the selection (or the whole grafcet) on the clipboard,
ready to paste into a report.

## PLC code

**Structured Text** and **PLCopen XML** turn your grafcets into PLC code, vendor-neutral. The
Structured Text function block evaluates every transition, then every step, then the timers,
edges and actions once per PLC scan; tick **Search for stability in each scan** to cross chains of
true transitions within one scan, as GRAFCET does. The PLCopen file contains one SFC program per
grafcet for import into engineering tools. The preview lists anything the format cannot express.
Always review generated code before it runs on a machine.

## Settings

**Settings** (<kbd>Ctrl+,</kbd>, or the gear at the top right) holds the theme, notation, welcome
screen, grid,
hints and simulation preferences, and shows how much browser storage is used. You can clear the
local history and the recent files list there.
