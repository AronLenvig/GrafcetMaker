# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
