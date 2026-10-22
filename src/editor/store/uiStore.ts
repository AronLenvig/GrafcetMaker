import { create } from 'zustand';
import type { Id } from '@/core/model/types';

export type Tool = 'select' | 'step' | 'transition' | 'comment' | 'hand';

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
}));

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
