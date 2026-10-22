import { create } from 'zustand';
import type { Id } from '@/core/model/types';

export type Tool = 'select' | 'step' | 'transition' | 'comment' | 'action' | 'hand';

/** Top-left corner of the visible area in diagram units, and the zoom factor (screen px per unit). */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type EditField = 'number' | 'label' | 'receptivity' | 'text' | 'condition';

export interface EditTarget {
  id: Id;
  field: EditField;
}

/** Two grafcets side by side (columns) or one above the other (rows). */
export interface SplitView {
  /** Grafcet of each pane: left / top, then right / bottom. */
  panes: [Id, Id];
  /** The pane showing the active grafcet (where selection and commands apply). */
  focus: 0 | 1;
  orientation: 'columns' | 'rows';
}

export interface UiState {
  activeGrafcetId: Id | null;
  /** Selected element ids within the active grafcet. */
  selection: Record<Id, true>;
  /** Selected link key (see linkKey) — exclusive with element selection. */
  selectedLink: string | null;
  tool: Tool;
  editing: EditTarget | null;
  viewports: Record<Id, Viewport>;
  /** Element ids to flash briefly (navigation from Problems, paste...). */
  flash: { ids: Id[]; at: number } | null;
  paletteOpen: boolean;
  /** Paste counter: successive pastes cascade. */
  pasteCount: number;
  /** Two-step command waiting for a click on the canvas (`L` then click the loop target). */
  pending: { kind: 'loop'; from: Id } | null;
  /** Simulation mode locks editing. */
  mode: 'edit' | 'simulate';
  /** Variable opened in the side panel's variable list. */
  focusedVariable: Id | null;
  /** Split view, or null for a single canvas. */
  split: SplitView | null;
}

export const useUi = create<UiState>(() => ({
  activeGrafcetId: null,
  selection: {},
  selectedLink: null,
  tool: 'select',
  editing: null,
  viewports: {},
  flash: null,
  paletteOpen: false,
  pasteCount: 0,
  pending: null,
  mode: 'edit',
  focusedVariable: null,
  split: null,
}));

// The focused pane always shows the active grafcet: switching grafcets (tabs, navigation from
// Problems, opening a macro-step…) changes that pane, or focuses the other one if it shows it.
useUi.subscribe((s, prev) => {
  if (!s.split || s.activeGrafcetId === prev.activeGrafcetId) return;
  const { panes, focus } = s.split;
  const gid = s.activeGrafcetId;
  if (!gid) useUi.setState({ split: null });
  else if (gid === panes[1 - focus])
    useUi.setState({ split: { ...s.split, focus: focus === 0 ? 1 : 0 } });
  else if (gid !== panes[focus]) {
    const next: [Id, Id] = [...panes];
    next[focus] = gid;
    useUi.setState({ split: { ...s.split, panes: next } });
  }
});

export const ui = {
  get: useUi.getState,
  set: useUi.setState,
  selectedIds(): Id[] {
    return Object.keys(useUi.getState().selection);
  },
  select(ids: Iterable<Id>, mode: 'replace' | 'add' | 'toggle' = 'replace'): void {
    useUi.setState((s) => {
      const next: Record<Id, true> = mode === 'replace' ? {} : { ...s.selection };
      for (const id of ids) {
        if (mode === 'toggle' && next[id]) delete next[id];
        else next[id] = true;
      }
      return { selection: next, selectedLink: null };
    });
  },
  clearSelection(): void {
    useUi.setState({ selection: {}, selectedLink: null });
  },
  setTool(tool: Tool): void {
    useUi.setState({ tool, editing: null });
  },
  edit(target: EditTarget | null): void {
    useUi.setState({ editing: target });
  },
  flash(ids: Id[]): void {
    useUi.setState({ flash: { ids, at: Date.now() } });
  },
};
